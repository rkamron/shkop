// Review screen — displays all 14 AI-generated attributes in editable fields.
// Array fields (tags, secondary colors) are held as comma-separated strings
// while editing and split back to arrays on save.
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

import { saveClothingItemFromDraft } from "@/services/clothing";
import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

function tagsToString(tags: string[]): string {
  return tags.join(", ");
}

function stringToTags(value: string): string[] {
  return value.split(",").map((t) => t.trim()).filter(Boolean);
}

export default function AddReviewScreen() {
  const router = useRouter();
  const { draft, resetDraft } = useAddClothingDraft();

  // Required fields
  const [category, setCategory] = useState(draft.category ?? "");
  const [color, setColor] = useState(draft.color ?? "");

  // Optional scalar fields
  const [subcategory, setSubcategory] = useState(draft.subcategory ?? "");
  const [pattern, setPattern] = useState(draft.pattern ?? "");
  const [material, setMaterial] = useState(draft.material ?? "");
  const [fit, setFit] = useState(draft.fit ?? "");
  const [formality, setFormality] = useState(draft.formality ?? "");
  const [brand, setBrand] = useState(draft.brand ?? "");
  const [notes, setNotes] = useState(draft.notes ?? "");

  // Array fields stored as comma-separated strings for editing
  const [secondaryColors, setSecondaryColors] = useState(tagsToString(draft.secondary_colors));
  const [styleTags, setStyleTags] = useState(tagsToString(draft.style_tags));
  const [seasonTags, setSeasonTags] = useState(tagsToString(draft.season_tags));
  const [occasionTags, setOccasionTags] = useState(tagsToString(draft.occasion_tags));
  const [weatherTags, setWeatherTags] = useState(tagsToString(draft.weather_tags));

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Re-sync if the draft updates after initial render (e.g. navigating back)
  useEffect(() => {
    setCategory(draft.category ?? "");
    setColor(draft.color ?? "");
    setSubcategory(draft.subcategory ?? "");
    setPattern(draft.pattern ?? "");
    setMaterial(draft.material ?? "");
    setFit(draft.fit ?? "");
    setFormality(draft.formality ?? "");
    setBrand(draft.brand ?? "");
    setNotes(draft.notes ?? "");
    setSecondaryColors(tagsToString(draft.secondary_colors));
    setStyleTags(tagsToString(draft.style_tags));
    setSeasonTags(tagsToString(draft.season_tags));
    setOccasionTags(tagsToString(draft.occasion_tags));
    setWeatherTags(tagsToString(draft.weather_tags));
  }, [draft]);

  if (!draft.localImageUri) {
    return <Redirect href="/add" />;
  }

  const handleSave = async () => {
    const nextCategory = category.trim() || null;
    const nextColor = color.trim() || null;

    if (!nextCategory || !nextColor) {
      setFormError("Category and color are required before saving.");
      return;
    }

    if (!draft.localImageUri) {
      setFormError("A clothing image is required before saving.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSaveMessage("Saving clothing item...");

    try {
      await saveClothingItemFromDraft({
        localImageUri: draft.localImageUri,
        category: nextCategory,
        subcategory: subcategory.trim() || null,
        color: nextColor,
        secondary_colors: stringToTags(secondaryColors),
        pattern: pattern.trim() || null,
        material: material.trim() || null,
        formality: formality.trim() || null,
        fit: fit.trim() || null,
        style_tags: stringToTags(styleTags),
        season_tags: stringToTags(seasonTags),
        occasion_tags: stringToTags(occasionTags),
        weather_tags: stringToTags(weatherTags),
        brand: brand.trim() || null,
        notes: notes.trim() || null,
        is_favorite: false,
      });

      setSaveMessage("Saved. Opening closet...");
      resetDraft();
      router.replace("/closet");
    } catch (error) {
      console.error("[review] saveClothingItemFromDraft failed:", error);
      setFormError("Unable to save this clothing item right now. Please try again.");
      setSaveMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen
      title="AI Review"
      subtitle="Review and adjust the generated clothing details before saving."
      footer={
        <Button
          title={isSaving ? "Saving..." : "Save to closet"}
          disabled={isSaving}
          onPress={() => { void handleSave(); }}
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.imageFrame}>
          <Image
            source={{ uri: draft.localImageUri }}
            contentFit="cover"
            style={styles.image}
          />
        </View>

        <ThemedText style={styles.sectionHeader}>Required</ThemedText>
        <View style={styles.block}>
          <ThemedText type="subtitle">Category <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. shirt, pants, shoes"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Color <ThemedText style={styles.required}>*</ThemedText></ThemedText>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="e.g. black, navy, white"
            editable={!isSaving}
          />
        </View>

        <ThemedText style={styles.sectionHeader}>Details</ThemedText>
        <View style={styles.block}>
          <ThemedText type="subtitle">Subcategory</ThemedText>
          <TextInput
            style={styles.input}
            value={subcategory}
            onChangeText={setSubcategory}
            placeholder="e.g. t-shirt, chinos, sneakers"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Pattern</ThemedText>
          <TextInput
            style={styles.input}
            value={pattern}
            onChangeText={setPattern}
            placeholder="e.g. solid, striped, plaid, floral"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Material</ThemedText>
          <TextInput
            style={styles.input}
            value={material}
            onChangeText={setMaterial}
            placeholder="e.g. cotton, denim, leather, wool"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Fit</ThemedText>
          <TextInput
            style={styles.input}
            value={fit}
            onChangeText={setFit}
            placeholder="slim, regular, relaxed, oversized, tailored"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Formality</ThemedText>
          <TextInput
            style={styles.input}
            value={formality}
            onChangeText={setFormality}
            placeholder="casual, smart casual, business casual, formal"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Brand</ThemedText>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Nike, Zara, Uniqlo"
            editable={!isSaving}
          />
        </View>

        <ThemedText style={styles.sectionHeader}>Tags</ThemedText>
        <View style={styles.block}>
          <ThemedText type="subtitle">Secondary colors</ThemedText>
          <TextInput
            style={styles.input}
            value={secondaryColors}
            onChangeText={setSecondaryColors}
            placeholder="e.g. white, red (comma-separated)"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Style tags</ThemedText>
          <TextInput
            style={styles.input}
            value={styleTags}
            onChangeText={setStyleTags}
            placeholder="e.g. casual, minimalist, streetwear"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Season tags</ThemedText>
          <TextInput
            style={styles.input}
            value={seasonTags}
            onChangeText={setSeasonTags}
            placeholder="spring, summer, fall, winter"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Occasion tags</ThemedText>
          <TextInput
            style={styles.input}
            value={occasionTags}
            onChangeText={setOccasionTags}
            placeholder="e.g. everyday, office, gym, date night"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Weather tags</ThemedText>
          <TextInput
            style={styles.input}
            value={weatherTags}
            onChangeText={setWeatherTags}
            placeholder="e.g. hot, mild, cold, rainy, layering"
            editable={!isSaving}
          />
        </View>

        <ThemedText style={styles.sectionHeader}>Notes</ThemedText>
        <View style={styles.block}>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional details about this item..."
            multiline
            editable={!isSaving}
          />
        </View>

        {formError ? (
          <ThemedText style={styles.errorText}>{formError}</ThemedText>
        ) : null}
        {saveMessage ? <ThemedText>{saveMessage}</ThemedText> : null}

        <View style={styles.actions}>
          <Button
            title="Back"
            disabled={isSaving}
            onPress={() => {
              setFormError(null);
              setSaveMessage(null);
              router.push("/add/preview");
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
  imageFrame: {
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#e4e7ec",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  sectionHeader: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#667085",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  block: {
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  required: {
    color: "#b42318",
  },
  actions: {
    gap: 12,
  },
  errorText: {
    color: "#b42318",
  },
});
