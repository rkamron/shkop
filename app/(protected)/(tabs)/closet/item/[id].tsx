import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import {
  deleteClothingItem,
  getClothingImageUrl,
  getClothingItemById,
  updateClothingItem,
} from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function formatTags(tags: string[] | null | undefined) {
  return tags && tags.length > 0 ? tags.join(", ") : "Not set";
}

export default function ClosetItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clothingItem = await getClothingItemById(id);
      const signedImageUrl = await getClothingImageUrl(clothingItem.image_path);

      setItem(clothingItem);
      setImageUrl(signedImageUrl);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load clothing item."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadItem();
    }, [loadItem])
  );

  if (!id) {
    return <Redirect href="../" />;
  }

  const handleToggleFavorite = async () => {
    if (!item) {
      return;
    }

    setIsTogglingFavorite(true);
    setError(null);

    try {
      const updated = await updateClothingItem(item.id, {
        is_favorite: !item.is_favorite,
      });

      setItem(updated);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Failed to update favorite status."
      );
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleDelete = async () => {
    if (!item) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteClothingItem(item.id);
      router.replace("../");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete clothing item."
      );
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (!item || isDeleting) {
      return;
    }

    Alert.alert(
      "Delete clothing item?",
      "This will permanently remove the item and its stored image.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <Screen title="Clothing Item" subtitle="Loading item details..." scrollable={false}>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText>Loading item details...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (error && !item) {
    return (
      <Screen title="Clothing Item" subtitle="There was a problem loading this item." scrollable={false}>
        <View style={styles.centerState}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button
            title="Try again"
            onPress={() => {
              void loadItem();
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen title="Clothing Item" subtitle="This item could not be found." scrollable={false}>
        <View style={styles.centerState}>
          <Button
            title="Back to closet"
            onPress={() => {
              router.replace("../");
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={item.category ?? "Clothing Item"}
      subtitle="Review the full clothing item details and manage this entry."
    >
      <View style={styles.content}>
        {imageUrl ? (
          <View style={styles.imageFrame}>
            <Image
              source={{ uri: imageUrl }}
              contentFit="cover"
              style={styles.image}
            />
          </View>
        ) : null}
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Category</ThemedText>
          <ThemedText>{item.category ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Color</ThemedText>
          <ThemedText>{item.color ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Subcategory</ThemedText>
          <ThemedText>{item.subcategory ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Pattern</ThemedText>
          <ThemedText>{item.pattern ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Material</ThemedText>
          <ThemedText>{item.material ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Formality</ThemedText>
          <ThemedText>{item.formality ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Fit</ThemedText>
          <ThemedText>{item.fit ?? "Not set"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Style tags</ThemedText>
          <ThemedText>{formatTags(item.style_tags)}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Occasion tags</ThemedText>
          <ThemedText>{formatTags(item.occasion_tags)}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Season tags</ThemedText>
          <ThemedText>{formatTags(item.season_tags)}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Favorite</ThemedText>
          <ThemedText>{item.is_favorite ? "Yes" : "No"}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Last worn</ThemedText>
          <ThemedText>{formatDate(item.last_worn)}</ThemedText>
        </View>
        <View style={styles.detailGroup}>
          <ThemedText type="subtitle">Created</ThemedText>
          <ThemedText>{formatDate(item.created_at)}</ThemedText>
        </View>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        <View style={styles.actions}>
          <Button
            title="Edit item"
            onPress={() => {
              router.push({
                pathname: "../edit/[id]",
                params: { id: item.id },
              });
            }}
          />
          <Button
            title={
              isTogglingFavorite
                ? "Updating favorite..."
                : item.is_favorite
                  ? "Remove favorite"
                  : "Mark as favorite"
            }
            disabled={isTogglingFavorite || isDeleting}
            onPress={() => {
              void handleToggleFavorite();
            }}
          />
          <Button
            title={isDeleting ? "Deleting..." : "Delete item"}
            color="#b42318"
            disabled={isDeleting || isTogglingFavorite}
            onPress={() => {
              confirmDelete();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  imageFrame: {
    height: 360,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#e4e7ec",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  detailGroup: {
    gap: 6,
  },
  actions: {
    gap: 12,
  },
  errorText: {
    color: "#b42318",
  },
});
