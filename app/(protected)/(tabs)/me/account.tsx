import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  autoCapitalize = "none",
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={INK_50}
        editable={editable}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function AccountScreen() {
  const { profile, claims } = useAuthContext();
  const router = useRouter();

  const userId = claims?.sub as string | undefined;
  const currentEmail = (profile?.email ?? claims?.email ?? "") as string;
  const currentUsername = (profile?.username ?? "") as string;

  const [username, setUsername] = useState(currentUsername);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!userId) return;
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      Alert.alert("Username too short", "Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      Alert.alert("Invalid username", "Only letters, numbers, and underscores are allowed.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message.includes("unique") ? "That username is already taken." : error.message);
    } else {
      Alert.alert("Saved", "Your username has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  const hasChanges = username.trim() !== currentUsername;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile fields */}
        <View style={styles.section}>
          <SectionLabel title="Profile" />
          <View style={styles.card}>
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="your_username"
            />
            <View style={styles.fieldDivider} />
            <Field
              label="Email"
              value={currentEmail}
              editable={false}
              keyboardType="email-address"
            />
          </View>
          <Text style={styles.hint}>
            Username must be 3–30 characters: letters, numbers, and underscores.
          </Text>
        </View>

        {/* Save button */}
        {hasChanges ? (
          <View style={styles.section}>
            <Pressable
              onPress={() => void save()}
              disabled={saving}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnLabel}>Save changes</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* Info section */}
        <View style={styles.section}>
          <SectionLabel title="Account info" />
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {userId?.slice(0, 8)}…
              </Text>
            </View>
          </View>
        </View>
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

  field: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 15,
    color: INK,
    padding: 0,
    margin: 0,
  },
  fieldInputDisabled: {
    color: INK_50,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: "rgba(43,36,24,0.06)",
    marginHorizontal: 16,
  },

  hint: {
    fontSize: 12,
    color: INK_50,
    marginTop: 8,
    lineHeight: 17,
  },

  saveBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnLabel: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: INK,
  },
  infoValue: {
    fontFamily: MONO,
    fontSize: 12,
    color: INK_50,
    maxWidth: "55%",
  },
});
