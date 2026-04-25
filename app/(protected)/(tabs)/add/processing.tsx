import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";
import { processClothingImage } from "@/services/ai/processClothingImage";

export default function AddProcessingScreen() {
  const router = useRouter();
  const { draft, setAiAttributes } = useAddClothingDraft();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.localImageUri) {
      return;
    }

    let cancelled = false;

    async function run() {
      if (!draft.localImageUri) {
        return;
      }

      try {
        const attributes = await processClothingImage(draft.localImageUri);

        if (!cancelled) {
          setAiAttributes(attributes);
          router.replace("/add/review");
        }
      } catch (err) {
        console.error("[processing] processClothingImage failed:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong processing your image."
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [draft.localImageUri, router, setAiAttributes]);

  if (!draft.localImageUri) {
    return <Redirect href="/add" />;
  }

  if (error) {
    return (
      <Screen
        title="Processing"
        subtitle="There was a problem processing your image."
        scrollable={false}
      >
        <View style={styles.centerState}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button
            title="Go back"
            onPress={() => {
              router.replace("/add/preview");
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Processing"
      subtitle="Analyzing your clothing item and generating tags."
      scrollable={false}
    >
      <View style={styles.centerState}>
        <ActivityIndicator size="small" color="#0a7ea4" />
        <ThemedText>Analyzing your clothing item...</ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#b42318",
    textAlign: "center",
  },
});
