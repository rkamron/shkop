import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#E27D5E";
const INK = "#2B2418";
const INK_50 = "rgba(43,36,24,0.5)";
const BG = "#FBF6EC";
const CARD = "#FFFCF4";
const WARM = "#F4E9D0";
const MONO = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
  destructive = false,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        !isLast && styles.settingsRowBorder,
        pressed && styles.settingsRowPressed,
      ]}
    >
      <View style={styles.settingsLeft}>
        <View style={[styles.settingsIconBox, destructive && styles.settingsIconBoxDestructive]}>
          <Ionicons name={icon} size={15} color={destructive ? "#fff" : INK} />
        </View>
        <Text style={[styles.settingsLabel, destructive && styles.settingsLabelDestructive]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingsRight}>
        {value ? (
          <Text style={styles.settingsValue} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={15} color={INK_50} />
      </View>
    </Pressable>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.settingsCard}>{children}</View>;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MeIndexScreen() {
  const { profile, claims, signOut } = useAuthContext();
  const router = useRouter();

  const userId = claims?.sub as string | undefined;
  const email = (profile?.email ?? claims?.email ?? "") as string;
  const username = (profile?.username ?? email.split("@")[0] ?? "you") as string;
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  const initials = username.slice(0, 2).toUpperCase();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at as string).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  const [itemCount, setItemCount] = useState<number | null>(null);
  const [outfitCount, setOutfitCount] = useState<number | null>(null);
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void (async () => {
        const [itemsRes, outfitsRes, prefsRes] = await Promise.all([
          supabase
            .from("clothing_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("outfits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("preferences")
            .select("preferred_styles")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);
        setItemCount(itemsRes.count ?? 0);
        setOutfitCount(outfitsRes.count ?? 0);
        setPreferredStyles((prefsRes.data?.preferred_styles as string[]) ?? []);
      })();
    }, [userId])
  );

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{email}</Text>
          {memberSince ? (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard value={itemCount !== null ? String(itemCount) : "—"} label="Items" />
          <StatCard value={outfitCount !== null ? String(outfitCount) : "—"} label="Outfits" />
        </View>

        {/* Style signature */}
        <View style={styles.px}>
          <View style={styles.signatureCard}>
            <Text style={styles.signatureChip}>Your style</Text>
            {preferredStyles.length > 0 ? (
              <View style={styles.styleTags}>
                {preferredStyles.map((s) => (
                  <View key={s} style={styles.styleTag}>
                    <Text style={styles.styleTagText}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.signatureEmpty}>
                Complete your style preferences to see your signature.
              </Text>
            )}
          </View>
        </View>

        {/* Style settings */}
        <View style={styles.px}>
          <SectionLabel title="Style" />
          <SettingsCard>
            <SettingsRow
              icon="color-palette-outline"
              label="Style preferences"
              onPress={() => router.push("/(protected)/(tabs)/me/style-preferences")}
              isLast
            />
          </SettingsCard>
        </View>

        {/* Account settings */}
        <View style={styles.px}>
          <SectionLabel title="Account" />
          <SettingsCard>
            <SettingsRow
              icon="at-outline"
              label="Username"
              value={username ? `@${username}` : undefined}
              onPress={() => router.push("/(protected)/(tabs)/me/account")}
            />
            <SettingsRow
              icon="mail-outline"
              label="Email"
              value={email}
              onPress={() => router.push("/(protected)/(tabs)/me/account")}
              isLast
            />
          </SettingsCard>
        </View>

        {/* App settings */}
        <View style={styles.px}>
          <SectionLabel title="App" />
          <SettingsCard>
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => router.push("/(protected)/(tabs)/me/notifications")}
              isLast
            />
          </SettingsCard>
        </View>

        {/* Sign out */}
        <View style={styles.px}>
          <SettingsCard>
            <SettingsRow
              icon="log-out-outline"
              label="Sign out"
              onPress={handleSignOut}
              isLast
              destructive
            />
          </SettingsCard>
        </View>

        <Text style={styles.version}>shkop · v0.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingTop: 0, paddingBottom: 48 },
  px:      { paddingHorizontal: 22, marginBottom: 20 },

  // Header
  header: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 22,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 1,
  },
  displayName: {
    fontSize: 28,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  email: {
    fontFamily: MONO,
    fontSize: 11,
    color: INK_50,
    textTransform: "lowercase",
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  memberSince: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.05)",
  },
  statValue: {
    fontSize: 28,
    color: INK,
    fontWeight: "400",
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Style signature
  signatureCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: WARM,
  },
  signatureChip: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK,
    opacity: 0.55,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  styleTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  styleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(43,36,24,0.08)",
  },
  styleTagText: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
  },
  signatureEmpty: {
    fontSize: 14,
    color: INK_50,
    lineHeight: 20,
    fontStyle: "italic",
  },

  // Settings section label
  sectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  // Settings card
  settingsCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.05)",
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43,36,24,0.06)",
  },
  settingsRowPressed: {
    backgroundColor: "rgba(43,36,24,0.03)",
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingsIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(43,36,24,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIconBoxDestructive: {
    backgroundColor: "#E27D5E",
  },
  settingsLabel: {
    fontSize: 15,
    color: INK,
    fontWeight: "400",
  },
  settingsLabelDestructive: {
    color: "#E27D5E",
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "40%",
  },
  settingsValue: {
    fontSize: 13,
    color: INK_50,
    textAlign: "right",
  },

  // Footer
  version: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 12,
  },
});
