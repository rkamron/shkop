// Add flow stack — hides the tab bar for every screen in this stack via
// useFocusEffect on the Stack layout itself (one getParent() reaches Tabs).
// Flow: camera → preview → processing → review
import { Stack } from "expo-router";
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";

import { AddClothingDraftProvider } from "@/providers/add-clothing-draft-provider";

export const unstable_settings = {
  initialRouteName: "camera",
};

export default function AddStackLayout() {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const tabNavigator = navigation.getParent();
      tabNavigator?.setOptions({ tabBarStyle: { display: "none" } });
      return () => {
        tabNavigator?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

  return (
    <AddClothingDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="camera" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="processing" />
        <Stack.Screen name="review" />
      </Stack>
    </AddClothingDraftProvider>
  );
}
