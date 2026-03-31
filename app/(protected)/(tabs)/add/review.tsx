import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

import { saveClothingItemFromDraft } from "@/services/clothing";
import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

export default function AddReviewScreen() {
  const router = useRouter();
  const { draft, resetDraft, updateDraftField } = useAddClothingDraft();
  const [category, setCategory] = useState(draft.category ?? "");
  const [color, setColor] = useState(draft.color ?? "");
  const [style, setStyle] = useState(draft.style ?? "");
  const [aiTags, setAiTags] = useState(draft.ai_tags.join(", "));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setCategory(draft.category ?? "");
    setColor(draft.color ?? "");
    setStyle(draft.style ?? "");
    setAiTags(draft.ai_tags.join(", "));
  }, [draft.category, draft.color, draft.style, draft.ai_tags]);

  if (!draft.localImageUri) {
    return <Redirect href="/add" />;
  }

  const handleSave = async () => {
    const nextCategory = category.trim();
    const nextColor = color.trim();
    const nextStyle = style.trim();
    const nextAiTags = aiTags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!nextCategory || !nextColor || !nextStyle) {
      setFormError("Category, color, and style are required before saving.");
      return;
    }

    if (!draft.localImageUri) {
      setFormError("A clothing image is required before saving.");
      return;
    }

    console.log("Saving clothing item from AI review.");
    setIsSaving(true);
    setFormError(null);
    setSaveMessage("Saving clothing item...");
    updateDraftField("category", nextCategory);
    updateDraftField("color", nextColor);
    updateDraftField("style", nextStyle);
    updateDraftField("ai_tags", nextAiTags);

    try {
      await saveClothingItemFromDraft({
        localImageUri: draft.localImageUri,
        category: nextCategory,
        color: nextColor,
        style: nextStyle,
        ai_tags: nextAiTags,
        is_favorite: false,
      });

      setSaveMessage("Saved. Opening closet...");
      resetDraft();
      router.replace("/closet");
    } catch (error) {
      console.error("Failed to save clothing item from review.", error);
      setFormError(
        "Unable to save this clothing item right now. Please try again."
      );
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
          onPress={() => {
            void handleSave();
          }}
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
        <View style={styles.block}>
          <ThemedText type="subtitle">Category</ThemedText>
          <TextInput
            style={styles.input}
            value={category}
            onChangeText={setCategory}
            placeholder="Category"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Color</ThemedText>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="Color"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">Style</ThemedText>
          <TextInput
            style={styles.input}
            value={style}
            onChangeText={setStyle}
            placeholder="Style"
            editable={!isSaving}
          />
        </View>
        <View style={styles.block}>
          <ThemedText type="subtitle">AI tags</ThemedText>
          <TextInput
            style={styles.input}
            value={aiTags}
            onChangeText={setAiTags}
            placeholder="tag1, tag2, tag3"
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
    height: 320,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#e4e7ec",
  },
  image: {
    width: "100%",
    height: "100%",
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
  actions: {
    gap: 12,
  },
  errorText: {
    color: "#b42318",
  },
});
