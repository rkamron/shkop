import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCENT = "#E27D5E";
const INK = "#2B2418";
const INK_50 = "rgba(43,36,24,0.5)";
const BG = "#FBF6EC";
const CARD = "#FFFCF4";
const MONO = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

// Palette colors from the FashionAI design system
const ALL_COLORS = [
  { key: "white",    hex: "#FBF6EC", label: "White"    },
  { key: "ivory",    hex: "#F4E9D0", label: "Ivory"    },
  { key: "cream",    hex: "#FAEFD8", label: "Cream"    },
  { key: "butter",   hex: "#FAE5A0", label: "Butter"   },
  { key: "peach",    hex: "#FFD4B8", label: "Peach"    },
  { key: "coral",    hex: "#F4A48B", label: "Coral"    },
  { key: "rust",     hex: "#E27D5E", label: "Rust"     },
  { key: "mint",     hex: "#B8DCC0", label: "Mint"     },
  { key: "sage",     hex: "#A8C09A", label: "Sage"     },
  { key: "olive",    hex: "#9CA670", label: "Olive"    },
  { key: "sky",      hex: "#B5D4E8", label: "Sky"      },
  { key: "denim",    hex: "#7A9DBF", label: "Denim"    },
  { key: "navy",     hex: "#3D5A7A", label: "Navy"     },
  { key: "lilac",    hex: "#D4B8DC", label: "Lilac"    },
  { key: "tan",      hex: "#E8C99A", label: "Tan"      },
  { key: "camel",    hex: "#D9A876", label: "Camel"    },
  { key: "gray",     hex: "#B8B5AC", label: "Gray"     },
  { key: "charcoal", hex: "#3B3733", label: "Charcoal" },
  { key: "black",    hex: "#2B2418", label: "Black"    },
];

const ALL_STYLES = [
  "Minimal", "Classic", "Soft", "Cozy", "Preppy", "Casual",
  "Smart", "Edgy", "Bold", "Vintage", "Sporty", "Romantic",
];

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function ColorChip({
  color,
  selected,
  onPress,
}: {
  color: (typeof ALL_COLORS)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const isDark = ["black", "charcoal", "navy"].includes(color.key);
  return (
    <Pressable onPress={onPress} style={[styles.colorChip, selected && styles.colorChipSelected]}>
      <View style={[styles.colorDot, { backgroundColor: color.hex }, isDark && styles.colorDotDark]} />
      <Text style={[styles.colorChipLabel, selected && styles.colorChipLabelSelected]}>
        {color.label}
      </Text>
    </Pressable>
  );
}

function StyleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.styleChip, selected && styles.styleChipSelected]}
    >
      <Text style={[styles.styleChipLabel, selected && styles.styleChipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function StylePreferencesScreen() {
  const { claims } = useAuthContext();
  const userId = claims?.sub as string | undefined;

  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [dislikedColors, setDislikedColors] = useState<string[]>([]);
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void supabase
      .from("preferences")
      .select("favorite_colors, disliked_colors, preferred_styles")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFavoriteColors((data.favorite_colors as string[]) ?? []);
          setDislikedColors((data.disliked_colors as string[]) ?? []);
          setPreferredStyles((data.preferred_styles as string[]) ?? []);
        }
        setLoading(false);
      });
  }, [userId]);

  const toggle = <T,>(arr: T[], item: T, set: (v: T[]) => void) => {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase.from("preferences").upsert({
      user_id: userId,
      favorite_colors: favoriteColors,
      disliked_colors: dislikedColors,
      preferred_styles: preferredStyles,
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.loading}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Favorite colors */}
        <View style={styles.section}>
          <SectionLabel title="Favorite colors" />
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {ALL_COLORS.map((c) => (
                <ColorChip
                  key={c.key}
                  color={c}
                  selected={favoriteColors.includes(c.key)}
                  onPress={() => toggle(favoriteColors, c.key, setFavoriteColors)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Disliked colors */}
        <View style={styles.section}>
          <SectionLabel title="Disliked colors" />
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {ALL_COLORS.map((c) => (
                <ColorChip
                  key={c.key}
                  color={c}
                  selected={dislikedColors.includes(c.key)}
                  onPress={() => toggle(dislikedColors, c.key, setDislikedColors)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Style preferences */}
        <View style={styles.section}>
          <SectionLabel title="Style" />
          <View style={styles.card}>
            <View style={styles.chipsWrap}>
              {ALL_STYLES.map((s) => (
                <StyleChip
                  key={s}
                  label={s}
                  selected={preferredStyles.includes(s)}
                  onPress={() => toggle(preferredStyles, s, setPreferredStyles)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Save */}
        <View style={styles.section}>
          <Pressable
            onPress={() => void save()}
            disabled={saving}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnLabel}>Save preferences</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingVertical: 24, paddingBottom: 40 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    padding: 14,
  },

  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.12)",
    backgroundColor: "transparent",
  },
  colorChipSelected: {
    backgroundColor: INK,
    borderColor: INK,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(43,36,24,0.15)",
  },
  colorDotDark: {
    borderColor: "rgba(255,255,255,0.15)",
  },
  colorChipLabel: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
  },
  colorChipLabelSelected: {
    color: "#fff",
  },

  styleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.12)",
    backgroundColor: "transparent",
  },
  styleChipSelected: {
    backgroundColor: INK,
    borderColor: INK,
  },
  styleChipLabel: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
  },
  styleChipLabelSelected: {
    color: "#fff",
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
});
