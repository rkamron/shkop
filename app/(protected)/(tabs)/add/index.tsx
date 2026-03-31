import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

export default function AddIndexScreen() {
  const router = useRouter();
  const { draft, resetDraft, setImage } = useAddClothingDraft();
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const handleUploadFromGallery = async () => {
    setIsPickingImage(true);
    setPickerError(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        console.warn("Photo library permission denied in add flow.");
        setPickerError("Allow photo library access to choose an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        console.error("Image picker returned no asset uri.", { result });
        setPickerError("We couldn't read the selected image. Please try again.");
        return;
      }

      resetDraft();
      setImage(asset.uri, "library");
      router.push("/add/preview");
    } catch (error) {
      console.error("Failed to open photo library.", error);
      setPickerError("Unable to open the photo library right now.");
    } finally {
      setIsPickingImage(false);
    }
  };

  return (
    <Screen
      title="Add Clothing"
      subtitle="Start the add flow and keep a shared clothing draft across camera, preview, processing, and review."
    >
      <View style={styles.content}>
        <View style={styles.block}>
          <ThemedText type="subtitle">Current draft</ThemedText>
          <ThemedText>
            Image: {draft.localImageUri ?? "No image selected yet"}
          </ThemedText>
          <ThemedText>
            Source: {draft.sourceType ?? "No source selected yet"}
          </ThemedText>
        </View>
        {isPickingImage ? (
          <ThemedText>Opening photo library...</ThemedText>
        ) : null}
        {pickerError ? (
          <ThemedText style={styles.errorText}>{pickerError}</ThemedText>
        ) : null}
        <View style={styles.actions}>
          <Button
            title="Take photo"
            disabled={isPickingImage}
            onPress={() => {
              setPickerError(null);
              resetDraft();
              router.push("/add/camera");
            }}
          />
          <Button
            title="Upload from gallery"
            disabled={isPickingImage}
            onPress={() => {
              void handleUploadFromGallery();
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
  block: {
    gap: 8,
  },
  actions: {
    gap: 12,
  },
  errorText: {
    color: "#b42318",
  },
});
