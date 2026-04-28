import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#E27D5E";
const INK = "#2B2418";
const INK_50 = "rgba(43,36,24,0.5)";
const BG = "#FBF6EC";
const CARD = "#FFFCF4";
const MONO = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  isLast = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "rgba(43,36,24,0.12)", true: ACCENT }}
        thumbColor="#fff"
        ios_backgroundColor="rgba(43,36,24,0.12)"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [styleChallenge, setStyleChallenge] = useState(true);
  const [outfitReminders, setOutfitReminders] = useState(false);
  const [newFeatures, setNewFeatures] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Wardrobe */}
        <View style={styles.section}>
          <SectionLabel title="Wardrobe" />
          <View style={styles.card}>
            <ToggleRow
              label="Style challenges"
              description="Weekly prompts to style overlooked pieces."
              value={styleChallenge}
              onChange={setStyleChallenge}
            />
            <ToggleRow
              label="Outfit reminders"
              description="Morning nudge to plan your look."
              value={outfitReminders}
              onChange={setOutfitReminders}
              isLast
            />
          </View>
        </View>

        {/* App */}
        <View style={styles.section}>
          <SectionLabel title="App" />
          <View style={styles.card}>
            <ToggleRow
              label="New features"
              description="Be the first to hear about updates."
              value={newFeatures}
              onChange={setNewFeatures}
            />
            <ToggleRow
              label="Weekly digest"
              description="A summary of your wardrobe activity."
              value={weeklyDigest}
              onChange={setWeeklyDigest}
              isLast
            />
          </View>
        </View>

        <Text style={styles.footnote}>
          Notification settings are stored on this device. Push notifications require a future app update.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingVertical: 24, paddingBottom: 48 },
  section: { paddingHorizontal: 22, marginBottom: 24 },

  sectionLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.05)",
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43,36,24,0.06)",
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    color: INK,
    fontWeight: "400",
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12,
    color: INK_50,
    lineHeight: 17,
  },

  footnote: {
    paddingHorizontal: 22,
    fontSize: 12,
    color: INK_50,
    lineHeight: 18,
  },
});
