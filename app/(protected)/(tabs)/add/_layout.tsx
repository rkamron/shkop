import { Stack } from "expo-router";

import { AddClothingDraftProvider } from "@/providers/add-clothing-draft-provider";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function AddStackLayout() {
  return (
    <AddClothingDraftProvider>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Add" }} />
        <Stack.Screen name="camera" options={{ title: "Camera" }} />
        <Stack.Screen name="preview" options={{ title: "Preview" }} />
        <Stack.Screen name="processing" options={{ title: "Processing" }} />
        <Stack.Screen name="review" options={{ title: "Review" }} />
      </Stack>
    </AddClothingDraftProvider>
  );
}
