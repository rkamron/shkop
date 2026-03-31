import { Redirect, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

const PROCESSING_DELAY_MS = 1000;

export default function AddProcessingScreen() {
  const router = useRouter();
  const { draft, setMockedAttributes } = useAddClothingDraft();

  useEffect(() => {
    if (!draft.localImageUri) {
      return;
    }

    console.log("Entering mocked add processing step.");

    const timeoutId = setTimeout(() => {
      console.log("Seeding mocked clothing metadata.");
      setMockedAttributes({
        category: "shirt",
        color: "black",
        style: "casual",
        ai_tags: ["shirt", "black", "casual"],
      });
      router.replace("/add/review");
    }, PROCESSING_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [draft.localImageUri, router, setMockedAttributes]);

  if (!draft.localImageUri) {
    return <Redirect href="/add" />;
  }

  return (
    <Screen
      title="Processing"
      subtitle="Processing your image and preparing generated clothing details."
      scrollable={false}
    >
      <View style={styles.centerState}>
        <ActivityIndicator size="small" color="#0a7ea4" />
        <ThemedText>Processing your image...</ThemedText>
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
});
