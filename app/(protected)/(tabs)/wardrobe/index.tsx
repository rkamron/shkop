import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { FilterSelect } from "@/components/ui/FilterSelect";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Screen } from "@/components/ui/Screen";
import { getClothingImageUrl, getClothingItems } from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

type WardrobeTab = "clothing" | "outfits";

type ClothingGridItem = {
  item: ClothingItem;
  imageUrl: string;
};

function getFilterOptions(
  items: ClothingGridItem[],
  field: "category" | "color"
): string[] {
  return [...new Set(items.map((entry) => entry.item[field]).filter(Boolean))] as string[];
}

function getTagFilterOptions(
  items: ClothingGridItem[],
  field: "style_tags"
): string[] {
  return [...new Set(items.flatMap((entry) => entry.item[field] ?? []))];
}

function TopTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: WardrobeTab;
  onTabChange: (tab: WardrobeTab) => void;
}) {
  return (
    <View style={topTabStyles.container}>
      <Pressable
        style={[topTabStyles.tab, activeTab === "clothing" && topTabStyles.tabActive]}
        onPress={() => onTabChange("clothing")}
      >
        <ThemedText
          style={[topTabStyles.label, activeTab === "clothing" && topTabStyles.labelActive]}
        >
          Clothing
        </ThemedText>
        {activeTab === "clothing" && <View style={topTabStyles.indicator} />}
      </Pressable>
      <Pressable
        style={[topTabStyles.tab, activeTab === "outfits" && topTabStyles.tabActive]}
        onPress={() => onTabChange("outfits")}
      >
        <ThemedText
          style={[topTabStyles.label, activeTab === "outfits" && topTabStyles.labelActive]}
        >
          Outfits
        </ThemedText>
        {activeTab === "outfits" && <View style={topTabStyles.indicator} />}
      </Pressable>
    </View>
  );
}

function OutfitsTab() {
  return (
    <View style={styles.comingSoon}>
      <ThemedText type="subtitle">Outfits</ThemedText>
      <ThemedText>Outfit management is coming soon.</ThemedText>
    </View>
  );
}

export default function WardrobeIndexScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<WardrobeTab>("clothing");

  const [items, setItems] = useState<ClothingGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadItems = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const shouldShowInitialLoading = mode === "initial" && !hasLoadedOnceRef.current;

    if (shouldShowInitialLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const clothingItems = await getClothingItems();
      const gridItems = await Promise.all(
        clothingItems.map(async (item) => ({
          item,
          imageUrl: await getClothingImageUrl(item.image_path),
        }))
      );

      setItems(gridItems);
      setError(null);
      hasLoadedOnceRef.current = true;
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load clothing items."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const categoryOptions = getFilterOptions(items, "category");
  const colorOptions = getFilterOptions(items, "color");
  const styleOptions = getTagFilterOptions(items, "style_tags");

  const filteredItems = items.filter((entry) => {
    const matchesCategory = !selectedCategory || entry.item.category === selectedCategory;
    const matchesColor = !selectedColor || entry.item.color === selectedColor;
    const matchesStyle =
      !selectedStyle || (entry.item.style_tags ?? []).includes(selectedStyle);
    return matchesCategory && matchesColor && matchesStyle;
  });

  const hasActiveFilters =
    selectedCategory !== null || selectedColor !== null || selectedStyle !== null;

  const activeItemCount = filteredItems.length;
  const totalItemCount = items.length;

  const renderItem = ({ item }: { item: ClothingGridItem }) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        router.push({
          pathname: "./item/[id]",
          params: { id: item.item.id },
        });
      }}
    >
      <Image
        source={{ uri: item.imageUrl }}
        contentFit="cover"
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>
          {item.item.category ?? "Uncategorized"}
        </ThemedText>
        <View style={styles.cardTagRow}>
          <View style={styles.cardTag}>
            <ThemedText style={styles.cardTagLabel} numberOfLines={1}>
              {item.item.color ?? "Unknown color"}
            </ThemedText>
          </View>
          <View style={styles.cardTag}>
            <ThemedText style={styles.cardTagLabel} numberOfLines={1}>
              {item.item.fit ?? item.item.style_tags?.[0] ?? "—"}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (isLoading && activeTab === "clothing") {
    return (
      <Screen title="Wardrobe" scrollable={false}>
        <TopTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText>Loading clothing items...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (error && items.length === 0 && activeTab === "clothing") {
    return (
      <Screen title="Wardrobe" scrollable={false}>
        <TopTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <View style={styles.centerState}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void loadItems();
            }}
          >
            <ThemedText style={styles.retryLabel}>Try again</ThemedText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Wardrobe" scrollable={false} contentStyle={styles.screenContent}>
      <TopTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "outfits" ? (
        <OutfitsTab />
      ) : (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <ThemedText style={styles.heroEyebrow}>Wardrobe overview</ThemedText>
              <ThemedText style={styles.heroTitle}>
                {activeItemCount} {activeItemCount === 1 ? "item" : "items"}
              </ThemedText>
              <ThemedText style={styles.heroCopy}>
                {hasActiveFilters
                  ? `Filtered from ${totalItemCount} total pieces`
                  : "Everything you have added so far"}
              </ThemedText>
            </View>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                router.push("/add");
              }}
            >
              <ThemedText style={styles.addButtonLabel}>Add item</ThemedText>
            </Pressable>
          </View>

          {error ? (
            <ThemedView style={styles.inlineErrorBanner}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </ThemedView>
          ) : null}

          <View style={styles.filtersSection}>
            <View style={styles.filtersHeaderRow}>
              <ThemedText style={styles.filtersTitle}>Filters</ThemedText>
              {hasActiveFilters ? (
                <Pressable
                  onPress={() => {
                    setSelectedCategory(null);
                    setSelectedColor(null);
                    setSelectedStyle(null);
                  }}
                >
                  <ThemedText style={styles.clearFiltersLabel}>Clear all</ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.filterRow}>
              <FilterSelect
                label="Category"
                value={selectedCategory}
                options={categoryOptions}
                onChange={setSelectedCategory}
              />
              <FilterSelect
                label="Color"
                value={selectedColor}
                options={colorOptions}
                onChange={setSelectedColor}
              />
            </View>
            <View style={styles.filterRow}>
              <FilterSelect
                label="Style"
                value={selectedStyle}
                options={styleOptions}
                onChange={setSelectedStyle}
              />
            </View>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(entry) => entry.item.id}
            numColumns={2}
            columnWrapperStyle={filteredItems.length > 1 ? styles.row : undefined}
            contentContainerStyle={[
              styles.listContent,
              filteredItems.length === 0 && styles.emptyListContent,
            ]}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  void loadItems("refresh");
                }}
              />
            }
            ListEmptyComponent={
              <ThemedView style={styles.emptyState}>
                <ThemedText type="subtitle">
                  {hasActiveFilters ? "No matches for current filters" : "No clothing yet"}
                </ThemedText>
                <ThemedText>
                  {hasActiveFilters
                    ? "Try clearing one or more filters to see more items."
                    : "Add your first clothing item to start building your wardrobe."}
                </ThemedText>
              </ThemedView>
            }
          />
        </>
      )}
    </Screen>
  );
}

const topTabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabActive: {},
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#667085",
  },
  labelActive: {
    color: "#0a7ea4",
    fontWeight: "600",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "#0a7ea4",
  },
});

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 0,
  },
  comingSoon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 16,
  },
  heroTextBlock: {
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 13,
    lineHeight: 18,
    color: "#667085",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    color: "#101828",
  },
  heroCopy: {
    color: "#667085",
  },
  addButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
  },
  addButtonLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  row: {
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#eaecf0",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e4e7ec",
  },
  cardBody: {
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#101828",
  },
  cardTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f2f4f7",
  },
  cardTagLabel: {
    fontSize: 13,
    lineHeight: 16,
    color: "#344054",
  },
  inlineErrorBanner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecdca",
    backgroundColor: "#fef3f2",
  },
  filtersSection: {
    gap: 14,
    paddingVertical: 4,
  },
  filtersHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filtersTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#101828",
  },
  clearFiltersLabel: {
    color: "#0a7ea4",
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyState: {
    gap: 8,
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  errorText: {
    color: "#b42318",
    textAlign: "center",
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  retryLabel: {
    color: "#0a7ea4",
  },
});
