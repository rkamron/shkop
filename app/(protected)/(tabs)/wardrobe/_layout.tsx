import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function WardrobeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="item/[id]" options={{ title: "Item Details" }} />
      <Stack.Screen name="edit/[id]" options={{ title: "Edit Item" }} />
    </Stack>
  );
}
