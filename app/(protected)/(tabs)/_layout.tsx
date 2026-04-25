import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

export const unstable_settings = {
  initialRouteName: "home",
};

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function ProtectedTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0a7ea4",
        tabBarInactiveTintColor: "#687076",
        tabBarStyle: {
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          href: "./home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: "Wardrobe",
          href: "./wardrobe",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "albums" : "albums-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          href: "./add",
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.addIconContainer}>
              <View
                style={[
                  styles.addIconBadge,
                  focused && styles.addIconBadgeFocused,
                ]}
              >
                <Ionicons name="add" size={20} color={focused ? "#ffffff" : color} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stylist"
        options={{
          title: "Stylist",
          href: "./stylist",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "color-wand" : "color-wand-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          href: "./me",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      {/* Hidden legacy tabs — kept for their stack screens, not shown in tab bar */}
      <Tabs.Screen name="closet" options={{ href: null }} />
      <Tabs.Screen name="outfits" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  iconWrapper: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapperFocused: {
    transform: [{ translateY: -1 }],
  },
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  addIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#d0d5dd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  addIconBadgeFocused: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },
});
