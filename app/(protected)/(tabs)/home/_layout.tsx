import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function HomeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen
        name="recommendations"
        options={{ title: "Home Recommendations" }}
      />
      <Stack.Screen name="chat" options={{ title: "Chat" }} />
    </Stack>
  );
}
