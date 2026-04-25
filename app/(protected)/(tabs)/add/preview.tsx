// Preview screen — shows the captured/picked image so the user can confirm or
// go back before committing to the AI processing step.
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

export default function AddPreviewScreen() {
  const router = useRouter();
  const { draft } = useAddClothingDraft();

  if (!draft.localImageUri) {
    return <Redirect href="/add" />;
  }

  const resetActionLabel =
    draft.sourceType === "camera" ? "Retake photo" : "Choose another image";

  return (
    <Screen
      title="Photo Preview"
      subtitle="Confirm the image before the app generates clothing details."
      scrollable={false}
      contentStyle={styles.screenContent}
      footer={
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={() => {
              router.push("/add/processing");
            }}
          />
          <Button
            title={resetActionLabel}
            onPress={() => {
              router.push(
                draft.sourceType === "camera" ? "/add/camera" : "/add"
              );
            }}
          />
        </View>
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
        <View style={styles.metaBlock}>
          <ThemedText type="subtitle">Source</ThemedText>
          <ThemedText>{draft.sourceType ?? "Unknown source"}</ThemedText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 8,
  },
  content: {
    gap: 16,
  },
  imageFrame: {
    height: 360,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#e4e7ec",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  metaBlock: {
    gap: 8,
  },
  actions: {
    gap: 12,
  },
});
