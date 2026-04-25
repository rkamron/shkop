// Wardrobe index — custom top tab bar (Clothing | Outfits) rendered without any
// extra package. Clothing tab loads the user's grid; Outfits tab is a placeholder.
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

type WardrobeTab = "clothing" | "outfits";

type ClothingGridItem = {
  item: ClothingItem;
  imageUrl: string;
};

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
        style={topTabStyles.tab}
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
        style={topTabStyles.tab}
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

  const renderItem = ({ item }: { item: ClothingGridItem }) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        router.push(`/wardrobe/item/${item.item.id}`);
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
              {item.item.color ?? "—"}
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
          <ThemedText>Loading...</ThemedText>
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
            onPress={() => { void loadItems(); }}
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
        <FlatList
          data={items}
          keyExtractor={(entry) => entry.item.id}
          numColumns={2}
          columnWrapperStyle={items.length > 1 ? styles.row : undefined}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyListContent,
          ]}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { void loadItems("refresh"); }}
            />
          }
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle">No clothing yet</ThemedText>
              <ThemedText>Add your first item to start building your wardrobe.</ThemedText>
            </ThemedView>
          }
        />
      )}
    </Screen>
  );
}

const topTabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: "#101828",
  },
  cardTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f2f4f7",
  },
  cardTagLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: "#344054",
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
