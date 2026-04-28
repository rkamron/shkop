import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Pressable } from "react-native";

const ACCENT = "#E27D5E";
const INK = "#2B2418";
const BG = "#FBF6EC";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function MeStackLayout() {
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: BG },
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerTitleStyle: { color: INK, fontSize: 16, fontWeight: "600" },
        headerLeft: () => (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={INK} />
          </Pressable>
        ),
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="style-preferences" options={{ title: "Style Preferences" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}
