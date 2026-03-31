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

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Screen } from "@/components/ui/Screen";
import { getClothingImageUrl, getClothingItems } from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

type ClothingGridItem = {
  item: ClothingItem;
  imageUrl: string;
};

function getFilterOptions(
  items: ClothingGridItem[],
  field: "category" | "color" | "style"
) {
  return [...new Set(items.map((entry) => entry.item[field]).filter(Boolean))] as string[];
}

export default function ClosetIndexScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ClothingGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadItems = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    const shouldShowInitialLoading =
      mode === "initial" && !hasLoadedOnceRef.current;

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
        loadError instanceof Error
          ? loadError.message
          : "Failed to load closet items."
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
  const styleOptions = getFilterOptions(items, "style");

  const filteredItems = items.filter((entry) => {
    const matchesCategory =
      !selectedCategory || entry.item.category === selectedCategory;
    const matchesColor = !selectedColor || entry.item.color === selectedColor;
    const matchesStyle = !selectedStyle || entry.item.style === selectedStyle;

    return matchesCategory && matchesColor && matchesStyle;
  });

  const hasActiveFilters =
    selectedCategory !== null ||
    selectedColor !== null ||
    selectedStyle !== null;

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
        <ThemedText type="subtitle" numberOfLines={1}>
          {item.item.category ?? "Uncategorized"}
        </ThemedText>
        <ThemedText numberOfLines={1}>
          {item.item.color ?? "Unknown color"}
        </ThemedText>
        <ThemedText numberOfLines={1}>
          {item.item.style ?? "Unknown style"}
        </ThemedText>
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <Screen
        title="Closet"
        subtitle="Your uploaded clothing items will appear here."
        scrollable={false}
      >
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText>Loading closet items...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (error && items.length === 0) {
    return (
      <Screen
        title="Closet"
        subtitle="Your uploaded clothing items will appear here."
        scrollable={false}
      >
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
    <Screen
      title="Closet"
      subtitle="Your uploaded clothing items will appear here."
      scrollable={false}
      contentStyle={styles.screenContent}
    >
      {error ? (
        <ThemedView style={styles.inlineErrorBanner}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : null}
      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <ThemedText type="subtitle">Category</ThemedText>
          <View style={styles.filterChips}>
            <Pressable
              style={[
                styles.filterChip,
                selectedCategory === null && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedCategory(null);
              }}
            >
              <ThemedText
                style={
                  selectedCategory === null
                    ? styles.filterChipLabelActive
                    : styles.filterChipLabel
                }
              >
                All
              </ThemedText>
            </Pressable>
            {categoryOptions.map((option) => (
              <Pressable
                key={`category-${option}`}
                style={[
                  styles.filterChip,
                  selectedCategory === option && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedCategory(option);
                }}
              >
                <ThemedText
                  style={
                    selectedCategory === option
                      ? styles.filterChipLabelActive
                      : styles.filterChipLabel
                  }
                >
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.filterGroup}>
          <ThemedText type="subtitle">Color</ThemedText>
          <View style={styles.filterChips}>
            <Pressable
              style={[
                styles.filterChip,
                selectedColor === null && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedColor(null);
              }}
            >
              <ThemedText
                style={
                  selectedColor === null
                    ? styles.filterChipLabelActive
                    : styles.filterChipLabel
                }
              >
                All
              </ThemedText>
            </Pressable>
            {colorOptions.map((option) => (
              <Pressable
                key={`color-${option}`}
                style={[
                  styles.filterChip,
                  selectedColor === option && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedColor(option);
                }}
              >
                <ThemedText
                  style={
                    selectedColor === option
                      ? styles.filterChipLabelActive
                      : styles.filterChipLabel
                  }
                >
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.filterGroup}>
          <ThemedText type="subtitle">Style</ThemedText>
          <View style={styles.filterChips}>
            <Pressable
              style={[
                styles.filterChip,
                selectedStyle === null && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedStyle(null);
              }}
            >
              <ThemedText
                style={
                  selectedStyle === null
                    ? styles.filterChipLabelActive
                    : styles.filterChipLabel
                }
              >
                All
              </ThemedText>
            </Pressable>
            {styleOptions.map((option) => (
              <Pressable
                key={`style-${option}`}
                style={[
                  styles.filterChip,
                  selectedStyle === option && styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedStyle(option);
                }}
              >
                <ThemedText
                  style={
                    selectedStyle === option
                      ? styles.filterChipLabelActive
                      : styles.filterChipLabel
                  }
                >
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </View>
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
                : "Add your first clothing item to start building your closet."}
            </ThemedText>
          </ThemedView>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 0,
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
    borderRadius: 16,
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
    gap: 4,
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
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    borderColor: "#0a7ea4",
    backgroundColor: "#e6f4fe",
  },
  filterChipLabel: {
    color: "#344054",
  },
  filterChipLabelActive: {
    color: "#0a7ea4",
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
