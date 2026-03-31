import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Button, Pressable, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

export default function AddCameraScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView | null>(null);
  const { setImage } = useAddClothingDraft();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) {
      console.warn("Camera capture requested before camera was ready.");
      setCameraError("Camera is still getting ready. Try again in a moment.");
      return;
    }

    setIsCapturing(true);
    setCameraError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (!photo?.uri) {
        console.error("Camera capture returned no photo uri.", { photo });
        setCameraError("We couldn't capture the photo. Please try again.");
        return;
      }

      setImage(photo.uri, "camera");
      router.push("/add/preview");
    } catch (error) {
      console.error("Failed to capture photo in add flow.", error);
      setCameraError("Unable to capture a photo right now.");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <Screen
        title="Camera"
        subtitle="Loading camera permissions before opening the preview."
      >
        <ThemedText>Checking camera access...</ThemedText>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen
        title="Camera Access"
        subtitle="Camera permission is required to take a clothing photo for this draft."
      >
        <View style={styles.content}>
          <ThemedText>
            Grant access to your camera to capture a clothing image.
          </ThemedText>
          {cameraError ? (
            <ThemedText style={styles.errorText}>{cameraError}</ThemedText>
          ) : null}
          <View style={styles.actions}>
            <Button
              title="Grant camera permission"
              onPress={() => {
                setCameraError(null);
                void requestPermission().then((result) => {
                  if (!result.granted) {
                    console.warn("Camera permission denied in add flow.");
                    setCameraError("Allow camera access to take a photo.");
                  }
                });
              }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Capture Clothing"
      subtitle="Frame the clothing item clearly, then capture a single photo."
      scrollable={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.content}>
        <View style={styles.cameraFrame}>
          {isFocused ? (
            <CameraView
              ref={cameraRef}
              style={styles.cameraPreview}
              facing="back"
              active={isFocused}
              onCameraReady={() => {
                setIsCameraReady(true);
              }}
            />
          ) : null}
          <View style={styles.cameraOverlayTop}>
            <ThemedText style={styles.overlayText}>
              Center the item in the frame
            </ThemedText>
          </View>
          <View style={styles.cameraGuide} pointerEvents="none" />
        </View>
        {isCapturing ? <ThemedText>Capturing photo...</ThemedText> : null}
        {!isCapturing && !isCameraReady ? (
          <ThemedText>Preparing camera preview...</ThemedText>
        ) : null}
        {cameraError ? (
          <ThemedText style={styles.errorText}>{cameraError}</ThemedText>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            style={[
              styles.captureButton,
              (!isCameraReady || isCapturing) && styles.captureButtonDisabled,
            ]}
            disabled={!isCameraReady || isCapturing}
            onPress={() => {
              void handleCapture();
            }}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
          <Button
            title="Back to add"
            disabled={isCapturing}
            onPress={() => {
              router.replace("/add");
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 16,
  },
  content: {
    gap: 16,
    flex: 1,
  },
  cameraFrame: {
    flex: 1,
    minHeight: 320,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#101828",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraOverlayTop: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  overlayText: {
    color: "#ffffff",
    backgroundColor: "rgba(16, 24, 40, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  cameraGuide: {
    width: "72%",
    aspectRatio: 0.78,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  actions: {
    gap: 12,
    alignItems: "center",
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonDisabled: {
    opacity: 0.45,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ffffff",
  },
  errorText: {
    color: "#b42318",
  },
});
