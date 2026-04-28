// Bottom tab navigator — fully custom tabBar for pixel-accurate FashionAI design.
// Custom tabBar gives complete control over layout so labels never wrap and the
// raised center button doesn't get clipped by React Navigation's internal containers.
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const unstable_settings = {
  initialRouteName: "home",
};

const ACCENT = "#E27D5E";
const INK = "#2B2418";
const INK_SOFT = "rgba(43,36,24,0.4)";
const BG = "#FBF6EC";

// Row height matches the design's 56px icon/label area.
const ROW_H = 56;
// Center button is raised this many px above the bottom baseline.
const CENTER_LIFT = 8;

const TAB_CONFIG = [
  { name: "home",     label: "Home",     icon: "home-outline"     as const, iconActive: "home"      as const },
  { name: "wardrobe", label: "Wardrobe", icon: "shirt-outline"    as const, iconActive: "shirt"     as const },
  { name: "add",      label: "",         icon: "camera"           as const, iconActive: "camera"    as const },
  { name: "stylist",  label: "Stylist",  icon: "sparkles-outline" as const, iconActive: "sparkles"  as const },
  { name: "me",       label: "Me",       icon: "person-outline"   as const, iconActive: "person"    as const },
] as const;

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.row}>
        {TAB_CONFIG.map((tab) => {
          const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const route = state.routes[routeIndex];
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          if (tab.name === "add") {
            return (
              <Pressable
                key={tab.name}
                onPress={onPress}
                style={styles.centerTab}
                hitSlop={8}
              >
                <View style={[styles.centerCircle, isFocused && styles.centerCircleFocused]}>
                  <Ionicons name="camera" size={26} color={BG} />
                </View>
              </Pressable>
            );
          }

          const color = isFocused ? INK : INK_SOFT;

          return (
            <Pressable key={tab.name} onPress={onPress} style={styles.tab}>
              <Ionicons
                name={isFocused ? tab.iconActive : tab.icon}
                size={22}
                color={color}
              />
              <Text numberOfLines={1} style={[styles.label, { color }]}>
                {tab.label}
              </Text>
              <View style={[styles.dot, isFocused && styles.dotActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProtectedTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home"     options={{ title: "Home",     href: "./home" }} />
      <Tabs.Screen name="wardrobe" options={{ title: "Wardrobe", href: "./wardrobe" }} />
      <Tabs.Screen name="add"      options={{ title: "Add",      href: "./add/camera" }} />
      <Tabs.Screen name="stylist"  options={{ title: "Stylist",  href: "./stylist" }} />
      <Tabs.Screen name="me"       options={{ title: "Me",       href: "./me" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    paddingTop: 10,
  },
  // alignItems: 'flex-end' so everything baselines at the bottom;
  // center button uses paddingBottom to lift itself above that baseline.
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: ROW_H,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    gap: 3,
    // No horizontal padding — maximises text width so "WARDROBE" stays on one line
    // on all screen sizes including iPhone SE (375px).
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  dotActive: {
    backgroundColor: ACCENT,
  },
  // Center slot: paddingBottom lifts the circle CENTER_LIFT px above the baseline
  // so it floats above the other icons. Row overflow is visible by default in RN.
  centerTab: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: CENTER_LIFT,
    paddingHorizontal: 6,
  },
  centerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: INK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  centerCircleFocused: {
    backgroundColor: ACCENT,
  },
});
