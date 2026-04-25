import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, Switch, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { getClothingItemById, updateClothingItem } from "@/services/clothing";
import { ClothingItem } from "@/types/clothing";

export default function ClosetEditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [fit, setFit] = useState("");
  const [styleTags, setStyleTags] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clothingItem = await getClothingItemById(id);
      setItem(clothingItem);
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

  useEffect(() => {
    if (!item) {
      return;
    }

    setCategory(item.category ?? "");
    setColor(item.color ?? "");
    setFit(item.fit ?? "");
    setStyleTags((item.style_tags ?? []).join(", "));
    setIsFavorite(item.is_favorite);
  }, [item]);

  if (!id) {
    return <Redirect href="../" />;
  }

  const handleSave = async () => {
    const nextCategory = category.trim() || null;
    const nextColor = color.trim() || null;
    const nextFit = fit.trim() || null;
    const nextStyleTags = styleTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!nextCategory || !nextColor) {
      setError("Category and color are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateClothingItem(id, {
        category: nextCategory,
        color: nextColor,
        fit: nextFit,
        style_tags: nextStyleTags,
        is_favorite: isFavorite,
      });

      router.replace({
        pathname: "../item/[id]",
        params: { id },
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save clothing item."
      );
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen title="Edit Item" subtitle="Loading clothing item..." scrollable={false}>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText>Loading clothing item...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (error && !item) {
    return (
      <Screen title="Edit Item" subtitle="There was a problem loading this item." scrollable={false}>
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
      <Screen title="Edit Item" subtitle="This item could not be found." scrollable={false}>
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
      title="Edit Clothing Item"
      subtitle="Update the core clothing metadata for this item."
    >
      <View style={styles.content}>
        <View style={styles.fieldGroup}>
          <ThemedText type="subtitle">Category</ThemedText>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. shirt, pants, shoes"
          />
        </View>
        <View style={styles.fieldGroup}>
          <ThemedText type="subtitle">Color</ThemedText>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="e.g. black, navy, white"
          />
        </View>
        <View style={styles.fieldGroup}>
          <ThemedText type="subtitle">Fit</ThemedText>
          <TextInput
            style={styles.input}
            value={fit}
            onChangeText={setFit}
            placeholder="e.g. slim, regular, relaxed, oversized"
          />
        </View>
        <View style={styles.fieldGroup}>
          <ThemedText type="subtitle">Style tags</ThemedText>
          <TextInput
            style={styles.input}
            value={styleTags}
            onChangeText={setStyleTags}
            placeholder="e.g. casual, minimalist, streetwear"
          />
        </View>
        <View style={styles.favoriteRow}>
          <View style={styles.favoriteCopy}>
            <ThemedText type="subtitle">Favorite</ThemedText>
            <ThemedText>
              Mark this item as a favorite for quick access.
            </ThemedText>
          </View>
          <Switch value={isFavorite} onValueChange={setIsFavorite} />
        </View>
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        <View style={styles.actions}>
          <Button
            title={isSaving ? "Saving..." : "Save changes"}
            disabled={isSaving}
            onPress={() => {
              void handleSave();
            }}
          />
          <Button
            title="Cancel"
            disabled={isSaving}
            onPress={() => {
              router.back();
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
  fieldGroup: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  favoriteCopy: {
    flex: 1,
    gap: 4,
  },
  actions: {
    gap: 12,
  },
  errorText: {
    color: "#b42318",
  },
});
