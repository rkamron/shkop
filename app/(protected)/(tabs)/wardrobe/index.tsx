// Wardrobe index — "The closet"
// Items grid with category chips + Outfits list, matching the FashionAI design.
//
// DATA FLOW
// ─────────
// On tab focus both tables are fetched in parallel:
//   clothing_items  → full item pool, signed image URLs resolved per item
//   outfits         → with nested outfit_items to get their clothing_item_id lists
//
// A Map<itemId, imageUrl> is derived from the items list and passed to outfit
// thumbnail grids so they can reuse already-loaded URLs without extra fetches.
//
// Category counts are computed from the unfiltered items array so the chip
// labels always show "All 17 · Tops 5 · …" against the full wardrobe.
// Text search filters across name / category / color / style tags client-side.

import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { getClothingImageUrl, getClothingItems } from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = "#E27D5E";
const INK    = "#2B2418";
const INK_50 = "rgba(43,36,24,0.5)";
const INK_06 = "rgba(43,36,24,0.06)";
const BG     = "#FBF6EC";
const CARD   = "#FFFCF4";
const WARM   = "#F4E9D0";
const MONO   = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

// ─── Category definitions ──────────────────────────────────────────────────────
// `match` contains lowercase substrings tested against "category subcategory".
// Order matters: first match wins when an item is counted across chips.
const CATEGORIES = [
  { id: "all",     label: "All",     match: [] as string[] },
  { id: "tops",    label: "Tops",    match: ["shirt","tee","blouse","top","cami","tank","sweater","knit"] },
  { id: "bottoms", label: "Bottoms", match: ["pant","jean","skirt","short","trouser","legging"] },
  { id: "outer",   label: "Outer",   match: ["jacket","coat","blazer","cardigan","hoodie"] },
  { id: "dresses", label: "Dresses", match: ["dress","romper","jumpsuit"] },
  { id: "shoes",   label: "Shoes",   match: ["shoe","sneaker","boot","heel","sandal","loafer","flat"] },
  { id: "access",  label: "Access.", match: ["bag","hat","scarf","belt","accessory","jewelry","watch","purse"] },
] as const;
type CategoryId = typeof CATEGORIES[number]["id"];

// ─── Data types ────────────────────────────────────────────────────────────────
type ItemWithUrl = { item: ClothingItem; imageUrl: string };

type OutfitRow = {
  id: string;
  name: string | null;
  occasion: string | null;
  is_favorite: boolean;
  itemIds: string[]; // clothing_item_ids from outfit_items join
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function itemMatchesCategory(item: ClothingItem, catId: CategoryId): boolean {
  if (catId === "all") return true;
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat || cat.match.length === 0) return false;
  const val = `${item.category ?? ""} ${item.subcategory ?? ""}`.toLowerCase();
  return cat.match.some(m => val.includes(m));
}

function formatLastWorn(raw: string | null): string {
  if (!raw) return "Never worn";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── OutfitThumbnailGrid ───────────────────────────────────────────────────────
// Renders a horizontal row of item photo squares for the outfit card.
// Uses the urlMap from the parent so no extra Supabase Storage calls are needed.
function OutfitThumbnailGrid({
  itemIds,
  urlMap,
}: {
  itemIds: string[];
  urlMap: Map<string, string>;
}) {
  const shown = itemIds.slice(0, 4);
  return (
    <View style={og.wrap}>
      {shown.map(id => {
        const url = urlMap.get(id);
        return (
          <View key={id} style={og.cell}>
            {url ? (
              <Image source={{ uri: url }} style={og.img} contentFit="cover" />
            ) : (
              <Ionicons name="shirt-outline" size={20} color={INK_50} />
            )}
          </View>
        );
      })}
    </View>
  );
}
const og = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: WARM,
    borderRadius: 10,
    padding: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: CARD,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: "100%" },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function WardrobeIndexScreen() {
  const router   = useRouter();
  const { claims } = useAuthContext();
  const userId   = claims?.sub as string | undefined;
  const { width } = useWindowDimensions();

  const [mode, setMode]                     = useState<"items" | "outfits">("items");
  const [selectedCategory, setCategory]     = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [items, setItems]                   = useState<ItemWithUrl[]>([]);
  const [outfits, setOutfits]               = useState<OutfitRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const hasLoadedRef                        = useRef(false);

  // ── Grid geometry ────────────────────────────────────────────────────────────
  const GRID_H = 22; // horizontal margin each side
  const GRID_G = 10; // gap between columns
  const cellWidth = Math.floor((width - GRID_H * 2 - GRID_G) / 2);

  // ── Derived: Map<itemId → imageUrl> used by outfit thumbnail grids ───────────
  const urlMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const { item, imageUrl } of items) m.set(item.id, imageUrl);
    return m;
  }, [items]);

  // ── Derived: per-category item counts for chip labels ───────────────────────
  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const { item } of items) {
      for (const cat of CATEGORIES.slice(1)) {
        if (itemMatchesCategory(item, cat.id)) {
          counts[cat.id] = (counts[cat.id] ?? 0) + 1;
          break; // each item counted in the first matching category only
        }
      }
    }
    return counts;
  }, [items]);

  // ── Derived: filtered item list ──────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory !== "all") {
      result = result.filter(({ item }) => itemMatchesCategory(item, selectedCategory));
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(({ item }) => {
        const hay = [
          item.name, item.category, item.subcategory, item.color,
          ...(item.style_tags ?? []), ...(item.occasion_tags ?? []),
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }, [items, selectedCategory, searchQuery]);

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial" && !hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);

    try {
      // Parallel: clothing items + outfits with their item ID lists
      const [clothingItems, outfitsRes] = await Promise.all([
        getClothingItems(),
        userId
          ? supabase
              .from("outfits")
              .select("id, name, occasion, is_favorite, outfit_items(clothing_item_id)")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Resolve signed URLs for every item (parallel, 1 hour TTL)
      const withUrls = await Promise.all(
        clothingItems.map(async item => ({
          item,
          imageUrl: await getClothingImageUrl(item.image_path).catch(() => ""),
        }))
      );
      setItems(withUrls);

      // Normalise outfit rows from the nested Supabase response
      const rawOutfits = (outfitsRes.data ?? []) as any[];
      setOutfits(rawOutfits.map(o => ({
        id: o.id,
        name: o.name,
        occasion: o.occasion,
        is_favorite: o.is_favorite,
        itemIds: (o.outfit_items ?? []).map((oi: any) => oi.clothing_item_id),
      })));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load wardrobe.", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── Computed pairs for the 2-col grid ────────────────────────────────────────
  // Group filtered items into [left, right | undefined] pairs for manual grid.
  const gridRows = useMemo(() => {
    const rows: [ItemWithUrl, ItemWithUrl | undefined][] = [];
    for (let i = 0; i < filteredItems.length; i += 2) {
      rows.push([filteredItems[i], filteredItems[i + 1]]);
    }
    return rows;
  }, [filteredItems]);

  // ── Sub-components defined inline ────────────────────────────────────────────

  // Segmented mode toggle: Items | Outfits
  const ModeToggle = (
    <View style={styles.toggleWrap}>
      {(["items", "outfits"] as const).map(m => (
        <Pressable
          key={m}
          onPress={() => setMode(m)}
          style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleLabel, mode === m && styles.toggleLabelActive]}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // Single item card for the grid
  const renderItemCard = (entry: ItemWithUrl) => (
    <Pressable
      key={entry.item.id}
      style={[styles.itemCard, { width: cellWidth }]}
      onPress={() => router.push(`/wardrobe/item/${entry.item.id}`)}
    >
      {entry.imageUrl ? (
        <Image
          source={{ uri: entry.imageUrl }}
          style={[styles.itemCardImage, { width: cellWidth - 20, height: cellWidth - 20 }]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.itemCardImagePlaceholder, { width: cellWidth - 20, height: cellWidth - 20 }]}>
          <Ionicons name="shirt-outline" size={36} color={INK_50} />
        </View>
      )}
      <View style={styles.itemCardMeta}>
        <Text style={styles.itemCardName} numberOfLines={1}>
          {entry.item.name ?? entry.item.category ?? "Item"}
        </Text>
        <Text style={styles.itemCardSub} numberOfLines={1}>
          {formatLastWorn(entry.item.last_worn)}
        </Text>
      </View>
    </Pressable>
  );

  // Dashed "Add item" placeholder card — last cell in the grid
  const AddCard = (
    <Pressable
      style={[styles.addCard, { width: cellWidth, height: cellWidth + 52 }]}
      onPress={() => router.push("/add")}
    >
      <Ionicons name="add" size={28} color={INK_50} />
      <Text style={styles.addCardLabel}>Add item</Text>
    </Pressable>
  );

  // Outfit row card
  const renderOutfitCard = (outfit: OutfitRow) => (
    <Pressable key={outfit.id} style={styles.outfitCard}>
      <View style={styles.outfitCardTop}>
        <View style={{ flex: 1 }}>
          {outfit.occasion ? (
            <Text style={styles.outfitMeta}>{outfit.occasion.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.outfitName} numberOfLines={1}>
            {outfit.name ?? "Unnamed outfit"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={INK_50} />
      </View>
      {outfit.itemIds.length > 0 && (
        <OutfitThumbnailGrid itemIds={outfit.itemIds} urlMap={urlMap} />
      )}
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerMeta}> </Text>
          <Text style={styles.headerTitle}>The closet</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={ACCENT}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerMeta}>
            {items.length} item{items.length !== 1 ? "s" : ""}
            {outfits.length > 0 ? ` · ${outfits.length} outfit${outfits.length !== 1 ? "s" : ""}` : ""}
          </Text>
          <Text style={styles.headerTitle}>The closet</Text>
        </View>

        {/* ── Mode toggle ── */}
        <View style={styles.toggleRow}>{ModeToggle}</View>

        {/* ═══ ITEMS MODE ═══════════════════════════════════════════════════════ */}
        {mode === "items" && (
          <>
            {/* Search row */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color={INK_50} />
                <TextInput
                  style={styles.searchInput}
                  placeholder='Search "knit"…'
                  placeholderTextColor={INK_50}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={INK_50} />
                  </Pressable>
                )}
              </View>
              <View style={styles.filterBtn}>
                <Ionicons name="options-outline" size={18} color={INK} />
              </View>
            </View>

            {/* Category chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              style={styles.chipsScroll}
            >
              {CATEGORIES.map(cat => {
                const count = categoryCount[cat.id] ?? 0;
                const active = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {cat.label}
                      {count > 0 || cat.id === "all" ? ` · ${count}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Grid */}
            {filteredItems.length === 0 && !searchQuery ? (
              // Empty wardrobe state
              <View style={styles.emptyWrap}>
                <Ionicons name="shirt-outline" size={40} color={INK_50} />
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyDesc}>
                  Tap the camera button to add your first piece.
                </Text>
                <Pressable
                  style={styles.emptyAddBtn}
                  onPress={() => router.push("/add")}
                >
                  <Text style={styles.emptyAddBtnLabel}>Add first item</Text>
                </Pressable>
              </View>
            ) : filteredItems.length === 0 ? (
              // No search results
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptyDesc}>Try a different search term or category.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {gridRows.map(([left, right], rowIdx) => (
                  <View key={rowIdx} style={styles.gridRow}>
                    {renderItemCard(left)}
                    {right
                      ? renderItemCard(right)
                      : <View style={{ width: cellWidth }} />}
                  </View>
                ))}
                {/* Dashed "Add item" placeholder appended after the last row */}
                <View style={styles.gridRow}>
                  {/* If last row has 2 items, start a new row; if 1 item,
                      the add card fills the empty right slot */}
                  {filteredItems.length % 2 === 0 ? (
                    <>
                      {AddCard}
                      <View style={{ width: cellWidth }} />
                    </>
                  ) : (
                    <>
                      <View style={{ width: cellWidth }} />
                      {AddCard}
                    </>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══ OUTFITS MODE ════════════════════════════════════════════════════ */}
        {mode === "outfits" && (
          <View style={styles.outfitsList}>
            {outfits.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="albums-outline" size={40} color={INK_50} />
                <Text style={styles.emptyTitle}>No outfits yet</Text>
                <Text style={styles.emptyDesc}>
                  Use the Stylist tab to generate outfit suggestions, then save them here.
                </Text>
              </View>
            ) : (
              outfits.map(renderOutfitCard)
            )}

            {/* Dashed "Build new outfit" button */}
            <Pressable style={styles.buildOutfitBtn}>
              <Ionicons name="add" size={16} color={INK_50} />
              <Text style={styles.buildOutfitLabel}>Build new outfit</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingBottom: 32 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerMeta: {
    fontFamily: MONO,
    fontSize: 11,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 36,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.8,
    lineHeight: 38,
    marginTop: 4,
  },

  // Segmented mode toggle
  toggleRow: {
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(43,36,24,0.05)",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  toggleBtnActive: {
    backgroundColor: CARD,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: INK_50,
    letterSpacing: 0.3,
    textTransform: "capitalize",
  },
  toggleLabelActive: {
    color: INK,
    fontWeight: "600",
  },

  // Search row
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingBottom: 12,
    gap: 8,
    alignItems: "center",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: INK_06,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: INK,
    padding: 0,
    margin: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: INK_06,
    alignItems: "center",
    justifyContent: "center",
  },

  // Category chips
  chipsScroll: { marginBottom: 18 },
  chipsRow: {
    paddingHorizontal: 22,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.15)",
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: INK,
    letterSpacing: -0.1,
  },
  chipTextActive: {
    color: "#fff",
  },

  // Items grid
  grid: {
    paddingHorizontal: 22,
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 10,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardImage: {
    borderRadius: 8,
    backgroundColor: WARM,
  },
  itemCardImagePlaceholder: {
    borderRadius: 8,
    backgroundColor: WARM,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCardMeta: {
    marginTop: 8,
    gap: 2,
  },
  itemCardName: {
    fontSize: 13,
    fontWeight: "500",
    color: INK,
    letterSpacing: -0.1,
    lineHeight: 17,
  },
  itemCardSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Dashed "Add item" card
  addCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(43,36,24,0.2)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addCardLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: INK_50,
  },

  // Empty states
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 36,
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "500",
    color: INK,
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: INK_50,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAddBtn: {
    marginTop: 8,
    backgroundColor: INK,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyAddBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: CARD,
    letterSpacing: -0.2,
  },

  // Outfits list
  outfitsList: {
    paddingHorizontal: 22,
    gap: 14,
  },
  outfitCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  outfitCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  outfitMeta: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  outfitName: {
    fontSize: 20,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.2,
    lineHeight: 24,
  },

  // Dashed "Build new outfit" button
  buildOutfitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(43,36,24,0.2)",
    borderRadius: 16,
    paddingVertical: 18,
  },
  buildOutfitLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: INK_50,
  },
});
