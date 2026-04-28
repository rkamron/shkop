// Camera screen — full-screen viewfinder matching FashionAI design.
// Tab bar is hidden at the Tabs layout level (tabBarStyle: display none on the add screen).
// CameraView bleeds edge-to-edge; SafeAreaView holds all controls.
import { CameraView, FlashMode, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Button, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAddClothingDraft } from "@/providers/add-clothing-draft-provider";

const ACCENT = "#E27D5E";
const MONO = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

export default function AddCameraScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();

  const cameraRef = useRef<CameraView | null>(null);
  const { setImage } = useAddClothingDraft();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMode>("off");
  const [facing, setFacing] = useState<"front" | "back">("back");

  const toggleFlash = () => setFlash((c) => (c === "off" ? "on" : "off"));
  const toggleFacing = () => setFacing((c) => (c === "back" ? "front" : "back"));

  const handlePickFromGallery = async () => {
    setCameraError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setCameraError("Allow photo library access to choose an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) {
      console.error("Gallery picker returned no asset uri.", { result });
      setCameraError("Couldn't read the selected image. Please try again.");
      return;
    }
    setImage(asset.uri, "library");
    router.push("/add/preview");
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) {
      setCameraError("Camera is still getting ready. Try again in a moment.");
      return;
    }
    setIsCapturing(true);
    setCameraError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
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
      <Screen>
        <ThemedText>Checking camera access...</ThemedText>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen title="Camera Access">
        <View style={styles.permissionContent}>
          <ThemedText>Grant access to your camera to capture a clothing image.</ThemedText>
          {cameraError ? <ThemedText style={styles.errorText}>{cameraError}</ThemedText> : null}
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
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          active={isFocused}
          flash={flash}
          onCameraReady={() => setIsCameraReady(true)}
        />
      ) : null}

      {/* Corner bracket frame marks */}
      <FrameCorners />

      <SafeAreaView style={styles.ui}>
        {/* Top bar: close (left) | AI detecting pill (center) | flash (right) */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.circleButton}
            disabled={isCapturing}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={18} color="#ffffff" />
          </Pressable>

          <View style={styles.detectingPill}>
            <View style={styles.detectingDot} />
            <Text style={styles.detectingText}>
              {isCameraReady ? "AI detecting" : "Preparing…"}
            </Text>
          </View>

          <Pressable
            style={[styles.circleButton, flash === "on" && styles.circleButtonFlashOn]}
            onPress={toggleFlash}
          >
            <Ionicons
              name={flash === "on" ? "flash" : "flash-off"}
              size={18}
              color={flash === "on" ? "#2B2418" : "#ffffff"}
            />
          </Pressable>
        </View>

        {/* Pushes bottom controls to the bottom */}
        <View style={styles.spacer} />

        {cameraError ? (
          <Text style={styles.errorText}>{cameraError}</Text>
        ) : null}

        {/* AI hint pill */}
        <View style={styles.hintPill}>
          <Ionicons name="sparkles" size={14} color={ACCENT} />
          <Text style={styles.hintText}>Center the item in the frame</Text>
        </View>

        {/* Mode selector */}
        <View style={styles.modePills}>
          <Text style={styles.modeInactive}>Batch</Text>
          <Text style={styles.modeActive}>Single item</Text>
          <Text style={styles.modeInactive}>Outfit</Text>
        </View>

        {/* Shutter row: gallery (left) | shutter (center) | flip (right) */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.sideButton}
            disabled={isCapturing}
            onPress={() => void handlePickFromGallery()}
          >
            <Ionicons name="images-outline" size={20} color="#ffffff" />
          </Pressable>

          <Pressable
            style={[styles.shutterOuter, (!isCameraReady || isCapturing) && styles.shutterDisabled]}
            disabled={!isCameraReady || isCapturing}
            onPress={() => void handleCapture()}
          >
            <View style={[styles.shutterInner, isCapturing && styles.shutterInnerCapturing]} />
          </Pressable>

          <Pressable style={styles.sideButton} disabled={isCapturing} onPress={toggleFacing}>
            <Ionicons name="camera-reverse-outline" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FrameCorners() {
  const { height } = useWindowDimensions();
  // Anchor corners as fractions of screen height so the viewfinder
  // frame scales consistently across iPhone SE → Pro Max → Android.
  const topAnchor = height * 0.18;
  const bottomAnchor = height * 0.26;
  const inset = 40;
  const size = 26;
  const bw = 2;
  const r = 4;
  const color = "rgba(255,255,255,0.7)";
  return (
    <>
      <View style={[styles.corner, { top: topAnchor, left: inset, borderTopWidth: bw, borderLeftWidth: bw, borderTopLeftRadius: r, borderColor: color, width: size, height: size }]} />
      <View style={[styles.corner, { top: topAnchor, right: inset, borderTopWidth: bw, borderRightWidth: bw, borderTopRightRadius: r, borderColor: color, width: size, height: size }]} />
      <View style={[styles.corner, { bottom: bottomAnchor, left: inset, borderBottomWidth: bw, borderLeftWidth: bw, borderBottomLeftRadius: r, borderColor: color, width: size, height: size }]} />
      <View style={[styles.corner, { bottom: bottomAnchor, right: inset, borderBottomWidth: bw, borderRightWidth: bw, borderBottomRightRadius: r, borderColor: color, width: size, height: size }]} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  ui: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonFlashOn: {
    backgroundColor: "#FBF6EC",
  },
  detectingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  detectingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT,
  },
  detectingText: {
    color: "#ffffff",
    fontFamily: MONO,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  spacer: {
    flex: 1,
  },
  hintPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(43,36,24,0.5)",
    marginBottom: 16,
  },
  hintText: {
    color: "#FBF6EC",
    fontSize: 13,
    letterSpacing: -0.1,
  },
  modePills: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    marginBottom: 24,
  },
  modeActive: {
    color: "#ffffff",
    fontFamily: MONO,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    paddingBottom: 3,
  },
  modeInactive: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: MONO,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 42,
    paddingBottom: 16,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(251,246,236,0.15)",
    borderWidth: 1,
    borderColor: "rgba(251,246,236,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: "#FBF6EC",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FBF6EC",
  },
  shutterInnerCapturing: {
    backgroundColor: ACCENT,
    transform: [{ scale: 0.85 }],
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  corner: {
    position: "absolute",
  },
  permissionContent: {
    gap: 16,
  },
  errorText: {
    color: "#fca5a5",
    textAlign: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
});
