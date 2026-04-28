// Item detail — FashionAI design: custom header, warm image hero, tag chips,
// stats row, outfits-with-this section, and sticky "Style this" CTA.
import { Image } from "expo-image";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import {
  deleteClothingItem,
  getClothingImageUrl,
  getClothingItemById,
  updateClothingItem,
} from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK    = "#2B2418";
const INK_50 = "rgba(43,36,24,0.5)";
const INK_06 = "rgba(43,36,24,0.06)";
const INK_05 = "rgba(43,36,24,0.05)";
const BG     = "#FBF6EC";
const CARD   = "#FFFCF4";
const WARM   = "#F4E9D0";
const MONO   = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

// ─── Types ────────────────────────────────────────────────────────────────────
type OutfitRow = {
  id: string;
  name: string | null;
  occasion: string | null;
  itemCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatLastWorn(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function cap(s: string | null | undefined): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getAllTags(item: ClothingItem): string[] {
  const raw = [
    ...(item.style_tags ?? []),
    ...(item.occasion_tags ?? []),
    ...(item.season_tags ?? []),
    ...(item.weather_tags ?? []),
  ];
  return [...new Set(raw)];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

// 2×2 placeholder grid representing an outfit's items
function OutfitThumbGrid({ count }: { count: number }) {
  const cells = Array.from({ length: Math.min(count, 4) });
  return (
    <View style={styles.thumbGrid}>
      {cells.map((_, i) => (
        <View key={i} style={styles.thumbCell} />
      ))}
      {cells.length < 4 &&
        Array.from({ length: 4 - cells.length }).map((_, i) => (
          <View key={`empty-${i}`} style={[styles.thumbCell, { opacity: 0 }]} />
        ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WardrobeItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { claims } = useAuthContext();

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<OutfitRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const clothingItem = await getClothingItemById(id);
      const signedUrl = await getClothingImageUrl(clothingItem.image_path).catch(() => null);
      setItem(clothingItem);
      setImageUrl(signedUrl);

      // Load outfits that contain this item
      const userId = claims?.sub;
      if (userId) {
        const { data: links } = await supabase
          .from("outfit_items")
          .select("outfit_id")
          .eq("clothing_item_id", id);

        const outfitIds = (links ?? []).map(l => l.outfit_id as string);
        if (outfitIds.length > 0) {
          const { data: outfitsData } = await supabase
            .from("outfits")
            .select("id, name, occasion, outfit_items(clothing_item_id)")
            .eq("user_id", userId)
            .in("id", outfitIds)
            .limit(3);

          setOutfits(
            (outfitsData ?? []).map(o => ({
              id: o.id,
              name: o.name,
              occasion: o.occasion,
              itemCount: Array.isArray((o as { outfit_items?: unknown[] }).outfit_items)
                ? ((o as { outfit_items: unknown[] }).outfit_items).length
                : 0,
            }))
          );
        } else {
          setOutfits([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load item.");
    } finally {
      setIsLoading(false);
    }
  }, [id, claims?.sub]);

  useFocusEffect(useCallback(() => { void loadItem(); }, [loadItem]));

  if (!id) return <Redirect href="/wardrobe" />;

  const handleToggleFavorite = async () => {
    if (!item) return;
    setIsTogglingFavorite(true);
    try {
      const updated = await updateClothingItem(item.id, { is_favorite: !item.is_favorite });
      setItem(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update favorite.");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    setIsDeleting(true);
    try {
      await deleteClothingItem(item.id);
      router.replace("/wardrobe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (!item || isDeleting) return;
    Alert.alert(
      "Delete clothing item?",
      "This will permanently remove the item and its stored image.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { void handleDelete(); } },
      ]
    );
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={INK_50} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error ?? "Item not found."}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { void loadItem(); }}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const tags = getAllTags(item);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Custom header ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={16} color={INK} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => { void handleToggleFavorite(); }}
            disabled={isTogglingFavorite}
          >
            <Ionicons
              name={item.is_favorite ? "heart" : "heart-outline"}
              size={16}
              color={item.is_favorite ? "#E27D5E" : INK}
            />
          </Pressable>
          <Pressable
            style={styles.headerIconBtn}
            onPress={() => router.push(`/wardrobe/edit/${item.id}`)}
          >
            <Ionicons name="pencil-outline" size={16} color={INK} />
          </Pressable>
          <Pressable
            style={styles.headerIconBtn}
            onPress={confirmDelete}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={16} color={INK} />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image hero on warm background */}
        <View style={styles.heroWrapper}>
          <View style={styles.hero}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                contentFit="contain"
                style={styles.heroImage}
              />
            ) : (
              <View style={styles.heroPlaceholder} />
            )}
          </View>
        </View>

        {/* Name + category label */}
        <View style={styles.nameSection}>
          <Text style={styles.categoryLabel}>
            {[item.category, item.subcategory].filter(Boolean).join(" · ").toUpperCase()}
          </Text>
          <Text style={styles.itemName}>{item.name ?? "Clothing item"}</Text>

          {/* Tag chips */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map(t => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <MiniStat value={cap(item.material)} label="Material" />
          <MiniStat value={cap(item.formality)} label="Formality" />
          <MiniStat value={formatLastWorn(item.last_worn)} label="Last worn" />
        </View>

        {/* Outfits with this item */}
        {outfits.length > 0 && (
          <View style={styles.outfitsSection}>
            <Text style={styles.sectionTitle}>Outfits with this</Text>
            {outfits.map(o => (
              <View key={o.id} style={styles.outfitRow}>
                <OutfitThumbGrid count={o.itemCount} />
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{o.name ?? "Outfit"}</Text>
                  {o.occasion ? (
                    <Text style={styles.outfitOccasion}>{o.occasion.toUpperCase()}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={INK_50} />
              </View>
            ))}
          </View>
        )}

        {/* Error notice (non-fatal) */}
        {error ? (
          <Text style={[styles.errorText, { paddingHorizontal: 22, paddingBottom: 8 }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
        <Pressable
          style={styles.styleCta}
          onPress={() => router.push("/(protected)/(tabs)/stylist")}
        >
          <Ionicons name="sparkles-outline" size={14} color={BG} />
          <Text style={styles.styleCtaText}>Style this</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontFamily: MONO,
    fontSize: 12,
    color: INK_50,
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: INK_06,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD,
  },
  retryBtnText: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: INK_06,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  heroWrapper: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  hero: {
    backgroundColor: WARM,
    borderRadius: 20,
    aspectRatio: 1,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    flex: 1,
  },

  // Name section
  nameSection: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 0,
  },
  categoryLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    letterSpacing: 1.5,
  },
  itemName: {
    fontSize: 32,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.6,
    lineHeight: 36,
    marginTop: 4,
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: INK_05,
  },
  tagChipText: {
    fontSize: 11.5,
    color: INK_50,
    fontWeight: "500",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  miniStat: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: INK_05,
  },
  miniStatValue: {
    fontSize: 17,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  miniStatLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: INK_50,
    marginTop: 6,
    letterSpacing: 1,
  },

  // Outfits section
  outfitsSection: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  outfitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
  },
  thumbGrid: {
    width: 64,
    height: 64,
    backgroundColor: BG,
    borderRadius: 8,
    padding: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
  },
  thumbCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: CARD,
  },
  outfitInfo: {
    flex: 1,
    gap: 3,
  },
  outfitName: {
    fontSize: 15,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.1,
  },
  outfitOccasion: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    letterSpacing: 1.2,
  },

  // Scroll content
  scrollContent: {
    paddingBottom: 16,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: INK_06,
    backgroundColor: BG,
  },
  styleCta: {
    flex: 1,
    backgroundColor: INK,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  styleCtaText: {
    color: BG,
    fontSize: 14,
    fontWeight: "600",
  },
});
