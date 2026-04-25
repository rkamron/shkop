// Item detail — full-width image with all 15 clothing attributes listed below.
// Uses absolute navigation paths (/wardrobe/...) to avoid Expo Router v6
// relative-path resolution issues inside nested Stack tabs.
import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  deleteClothingItem,
  getClothingImageUrl,
  getClothingItemById,
  updateClothingItem,
} from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function formatTags(tags: string[] | null | undefined) {
  return tags && tags.length > 0 ? tags.join(", ") : "Not set";
}

function AttributeRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.attributeRow}>
      <ThemedText style={styles.attributeLabel}>{label}</ThemedText>
      <ThemedText style={styles.attributeValue}>{value}</ThemedText>
    </View>
  );
}

export default function WardrobeItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
      const signedUrl = await getClothingImageUrl(clothingItem.image_path);
      setItem(clothingItem);
      setImageUrl(signedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load item.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void loadItem(); }, [loadItem]));

  if (!id) return <Redirect href="../" />;

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

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerState}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText>Loading...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centerState}>
          <ThemedText style={styles.errorText}>{error ?? "Item not found."}</ThemedText>
          <Pressable style={styles.outlineButton} onPress={() => { void loadItem(); }}>
            <ThemedText style={styles.outlineButtonLabel}>Try again</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="cover"
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.itemTitle}>
              {item.category ?? "Clothing Item"}
            </ThemedText>
            <Pressable
              style={[styles.favoriteButton, item.is_favorite && styles.favoriteButtonActive]}
              disabled={isTogglingFavorite || isDeleting}
              onPress={() => { void handleToggleFavorite(); }}
            >
              <ThemedText style={[styles.favoriteButtonLabel, item.is_favorite && styles.favoriteButtonLabelActive]}>
                {item.is_favorite ? "♥ Saved" : "♡ Save"}
              </ThemedText>
            </Pressable>
          </View>

          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <View style={styles.attributesCard}>
            <AttributeRow label="Category" value={item.category ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Subcategory" value={item.subcategory ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Color" value={item.color ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Secondary colors" value={formatTags(item.secondary_colors)} />
            <View style={styles.divider} />
            <AttributeRow label="Pattern" value={item.pattern ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Material" value={item.material ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Fit" value={item.fit ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Formality" value={item.formality ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Brand" value={item.brand ?? "Not set"} />
            <View style={styles.divider} />
            <AttributeRow label="Style tags" value={formatTags(item.style_tags)} />
            <View style={styles.divider} />
            <AttributeRow label="Season tags" value={formatTags(item.season_tags)} />
            <View style={styles.divider} />
            <AttributeRow label="Occasion tags" value={formatTags(item.occasion_tags)} />
            <View style={styles.divider} />
            <AttributeRow label="Weather tags" value={formatTags(item.weather_tags)} />
            <View style={styles.divider} />
            <AttributeRow label="Last worn" value={formatDate(item.last_worn)} />
            <View style={styles.divider} />
            <AttributeRow label="Added" value={formatDate(item.created_at)} />
            {item.notes ? (
              <>
                <View style={styles.divider} />
                <AttributeRow label="Notes" value={item.notes} />
              </>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.editButton}
              onPress={() => {
                router.push(`/wardrobe/edit/${item.id}`);
              }}
            >
              <ThemedText style={styles.editButtonLabel}>Edit item</ThemedText>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              disabled={isDeleting || isTogglingFavorite}
              onPress={confirmDelete}
            >
              <ThemedText style={styles.deleteButtonLabel}>
                {isDeleting ? "Deleting..." : "Delete item"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e4e7ec",
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e4e7ec",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#101828",
    flex: 1,
  },
  favoriteButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    backgroundColor: "#ffffff",
  },
  favoriteButtonActive: {
    borderColor: "#f97066",
    backgroundColor: "#fff1f0",
  },
  favoriteButtonLabel: {
    fontSize: 13,
    color: "#667085",
    fontWeight: "500",
  },
  favoriteButtonLabelActive: {
    color: "#b42318",
  },
  attributesCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  attributeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  attributeLabel: {
    fontSize: 14,
    color: "#667085",
    flex: 1,
  },
  attributeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#101828",
    flex: 2,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#f2f4f7",
    marginHorizontal: 16,
  },
  actions: {
    gap: 10,
  },
  editButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  editButtonLabel: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecdca",
    backgroundColor: "#fff1f0",
  },
  deleteButtonLabel: {
    color: "#b42318",
    fontWeight: "600",
    fontSize: 15,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineButtonLabel: {
    color: "#0a7ea4",
  },
  errorText: {
    color: "#b42318",
    textAlign: "center",
  },
});
