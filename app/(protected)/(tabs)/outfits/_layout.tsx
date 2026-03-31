import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function OutfitsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Outfits" }} />
      <Stack.Screen name="[id]" options={{ title: "Outfit Details" }} />
      <Stack.Screen
        name="recommendations"
        options={{ title: "Outfit Recommendations" }}
      />
    </Stack>
  );
}
