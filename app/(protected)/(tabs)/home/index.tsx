import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { getClothingImageUrl } from "@/services/clothing/getClothingImageUrl";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
const WARM = "#F4E9D0";
const MONO = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
}

function getDateLine() {
  const d = new Date();
  return `${DAYS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

// ─── Weather helpers ────────────────────────────────────────────────────────

type WeatherData = { temp: number; code: number; wind: number; uv: number };
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function wmoInfo(code: number): { label: string; icon: IoniconName } {
  if (code === 0)               return { label: "Sunny",        icon: "sunny"        };
  if (code <= 2)                return { label: "Mostly Clear", icon: "partly-sunny" };
  if (code === 3)               return { label: "Overcast",     icon: "cloudy"       };
  if (code <= 48)               return { label: "Foggy",        icon: "cloudy"       };
  if (code <= 55)               return { label: "Drizzle",      icon: "rainy"        };
  if (code <= 65)               return { label: "Rainy",        icon: "rainy"        };
  if (code <= 77)               return { label: "Snowy",        icon: "snow"         };
  if (code <= 82)               return { label: "Showers",      icon: "rainy"        };
  if (code <= 86)               return { label: "Snow Showers", icon: "snow"         };
  return                               { label: "Thunderstorm", icon: "thunderstorm" };
}

function getRecommendation(temp: number, code: number): string {
  if (code >= 95)               return "Stay inside";
  if (code >= 71 && code <= 86) return "Bundle up";
  if (code >= 51 && code <= 82) return "Bring a jacket";
  if (temp > 85) return "Stay cool";
  if (temp > 75) return "Go light";
  if (temp > 65) return "Light layer";
  if (temp > 50) return "Layer up";
  return "Bundle up";
}

function windDesc(mph: number): string {
  if (mph < 5)  return "Calm";
  if (mph < 12) return "Light breeze";
  if (mph < 20) return "Moderate wind";
  if (mph < 30) return "Strong winds";
  return "Very windy";
}

function uvNote(uv: number): string {
  if (uv < 3) return "UV low";
  if (uv < 6) return "UV moderate";
  if (uv < 8) return "UV high";
  return "UV very high";
}

// ─── Weather strip ──────────────────────────────────────────────────────────

function WeatherStrip() {
  const [query, setQuery] = useState("");
  const [locationName, setLocationName] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchWeather = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
      );
      const geoJson = await geoRes.json();
      if (!geoJson.results?.length) {
        setError("Location not found — try a city name or zip.");
        setLoading(false);
        return;
      }
      const { latitude, longitude, name, admin1 } = geoJson.results[0];
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,weathercode,windspeed_10m,uv_index` +
        `&temperature_unit=fahrenheit&windspeed_unit=mph`
      );
      const wxJson = await wxRes.json();
      const c = wxJson.current;
      setLocationName(admin1 ? `${name}, ${admin1}` : name);
      setWeather({
        temp: Math.round(c.temperature_2m),
        code: c.weathercode,
        wind: Math.round(c.windspeed_10m),
        uv: Math.round(c.uv_index ?? 0),
      });
    } catch {
      setError("Couldn't fetch weather — check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setWeather(null);
    setLocationName(null);
    setQuery("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (weather) {
    const info = wmoInfo(weather.code);
    return (
      <View style={styles.weatherCard}>
        <Ionicons name={info.icon} size={22} color={ACCENT} />
        <View style={styles.weatherMiddle}>
          <Text style={styles.weatherMain}>{weather.temp}° · {info.label}</Text>
          <Text style={styles.weatherSub}>{windDesc(weather.wind)} · {uvNote(weather.uv)}</Text>
        </View>
        <View style={styles.weatherRight}>
          <Text style={styles.weatherTag}>{getRecommendation(weather.temp, weather.code)}</Text>
          <Pressable onPress={reset} hitSlop={12}>
            <Text style={styles.weatherLocation}>{locationName}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.weatherCard}>
      <Ionicons name="location-outline" size={22} color={INK_50} />
      <View style={styles.weatherMiddle}>
        <TextInput
          ref={inputRef}
          style={styles.weatherInput}
          placeholder="City or zip code"
          placeholderTextColor={INK_50}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void fetchWeather(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {error ? <Text style={styles.weatherError}>{error}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Pressable onPress={() => void fetchWeather(query)} disabled={!query.trim()} hitSlop={8}>
          <Ionicons name="arrow-forward" size={20} color={query.trim() ? ACCENT : INK_50} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function categoryIcon(category: string | null): IoniconName {
  switch (category) {
    case "shirt": case "tee":                        return "shirt-outline";
    case "sweater": case "knit":                     return "layers-outline";
    case "pants": case "jeans":                      return "person-outline";
    case "jacket": case "coat":                      return "layers-outline";
    case "dress": case "skirt":                      return "female-outline";
    case "shoes": case "sneakers": case "boots":     return "footsteps-outline";
    case "bag":                                      return "bag-outline";
    case "hat":                                      return "sunny-outline";
    default:                                         return "shirt-outline";
  }
}

function categoryBg(category: string | null): string {
  switch (category) {
    case "shirt": case "tee":                        return "#FAE5A0";
    case "sweater": case "knit":                     return "#B8DCC0";
    case "pants": case "jeans":                      return "#B5D4E8";
    case "jacket": case "coat":                      return "#B8B5AC";
    case "dress": case "skirt":                      return "#F4A48B";
    case "shoes": case "sneakers": case "boots":     return "#D4B8DC";
    case "bag":                                      return "#E8C99A";
    case "hat":                                      return "#B5D4E8";
    default:                                         return WARM;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const PICK_ICONS: IoniconName[] = [
  "shirt-outline",
  "briefcase-outline",
  "footsteps-outline",
  "bag-outline",
];

type RecentItem = {
  id: string;
  name: string | null;
  category: string | null;
  created_at: string;
  signedUrl: string | null;
};

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HomeIndexScreen() {
  const { profile, claims } = useAuthContext();
  const router = useRouter();

  const userId = claims?.sub as string | undefined;
  const rawName = profile?.username ?? (claims?.email as string | undefined)?.split("@")[0] ?? "you";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const [itemCount, setItemCount] = useState<number | null>(null);
  const [outfitCount, setOutfitCount] = useState<number | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void (async () => {
        const [itemsRes, outfitsRes, recentRes] = await Promise.all([
          supabase
            .from("clothing_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("outfits")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("clothing_items")
            .select("id, name, category, image_path, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);

        setItemCount(itemsRes.count ?? 0);
        setOutfitCount(outfitsRes.count ?? 0);

        if (recentRes.data?.length) {
          const withUrls = await Promise.all(
            recentRes.data.map(async (item) => ({
              id: item.id as string,
              name: item.name as string | null,
              category: item.category as string | null,
              created_at: item.created_at as string,
              signedUrl: await getClothingImageUrl(item.image_path as string).catch(() => null),
            }))
          );
          setRecentItems(withUrls);
        } else {
          setRecentItems([]);
        }
      })();
    }, [userId])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLine}>{getDateLine()}</Text>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{displayName}.</Text>
        </View>

        {/* Weather strip */}
        <View style={styles.px}>
          <WeatherStrip />
        </View>

        {/* Today's pick — label row */}
        <View style={[styles.px, styles.labelRow]}>
          <Text style={styles.sectionTitle}>{"Today's pick"}</Text>
          <Pressable
            onPress={() => router.push("/(protected)/(tabs)/stylist")}
            accessibilityRole="button"
            accessibilityLabel="More outfit ideas"
          >
            <Text style={styles.linkText}>More ideas →</Text>
          </Pressable>
        </View>

        {/* Today's pick — card */}
        <View style={[styles.px, { marginBottom: 28 }]}>
          <View style={styles.pickCard}>
            <View style={styles.pickCardHeader}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.pickMatch}>94% MATCH · MONDAY MEETINGS</Text>
                <Text style={styles.pickTitle}>Crisp fall commute</Text>
              </View>
              <View style={styles.sparkleBtn}>
                <Ionicons name="sparkles" size={18} color={BG} />
              </View>
            </View>
            <View style={styles.pickGrid}>
              {PICK_ICONS.map((icon, i) => (
                <View key={i} style={styles.pickCell}>
                  <Ionicons name={icon} size={28} color={INK} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={[styles.px, { marginBottom: 28 }]}>
          <View style={styles.statsRow}>
            <StatCard value={itemCount !== null ? String(itemCount) : "—"} label="Items" />
            <StatCard value={outfitCount !== null ? String(outfitCount) : "—"} label="Outfits" />
            <StatCard value="—" label="Wears this mo" />
          </View>
        </View>

        {/* Recently added — label */}
        <View style={[styles.px, { marginBottom: 12 }]}>
          <Text style={styles.sectionTitle}>Recently added</Text>
        </View>

        {/* Recently added — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentScroll}
        >
          {recentItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.recentCard}
              onPress={() => router.push(`/(protected)/(tabs)/wardrobe/item/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={item.name ?? item.category ?? "Clothing item"}
            >
              {item.signedUrl ? (
                <Image
                  source={{ uri: item.signedUrl }}
                  style={styles.recentArt}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.recentArt, { backgroundColor: categoryBg(item.category) }]}>
                  <Ionicons name={categoryIcon(item.category)} size={32} color={INK} />
                </View>
              )}
              <Text style={styles.recentLabel} numberOfLines={1}>
                {item.name ?? item.category ?? "Item"}
              </Text>
              <Text style={styles.recentSub}>{timeSince(item.created_at)}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.recentAddBtn}
            onPress={() => router.push("/(protected)/(tabs)/add/camera")}
            accessibilityRole="button"
            accessibilityLabel="Add new clothing item"
          >
            <Ionicons name="add" size={22} color={ACCENT} />
            <Text style={styles.recentAddLabel}>Add item</Text>
          </Pressable>
        </ScrollView>

        {/* Wardrobe challenge */}
        <View style={[styles.px, { marginBottom: 12 }]}>
          <View style={styles.challengeCard}>
            <Text style={styles.challengeChip}>Wardrobe challenge</Text>
            <Text style={styles.challengeText}>
              Style the olive cardigan this week. Last worn{" "}
              <Text style={{ fontStyle: "italic" }}>21 days ago.</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 40 },
  px:      { paddingHorizontal: 22, marginBottom: 20 },

  header: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 20,
  },
  dateLine: {
    fontFamily: MONO,
    fontSize: 12,
    color: INK_50,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 40,
    lineHeight: 44,
    color: INK,
    fontWeight: "400",
    letterSpacing: -1,
  },
  name: {
    fontSize: 40,
    lineHeight: 44,
    color: ACCENT,
    fontStyle: "italic",
    fontWeight: "400",
    letterSpacing: -1,
  },

  weatherCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.06)",
  },
  weatherMiddle:   { flex: 1 },
  weatherMain:     { fontSize: 14, color: INK, fontWeight: "500" },
  weatherSub:      { fontSize: 11, color: INK_50, marginTop: 1 },
  weatherRight:    { alignItems: "flex-end", gap: 4 },
  weatherTag: {
    fontFamily: MONO,
    fontSize: 11,
    color: ACCENT,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  weatherLocation: { fontSize: 10, color: INK_50 },
  weatherInput:    { fontSize: 14, color: INK, padding: 0, margin: 0 },
  weatherError:    { fontSize: 11, color: ACCENT, marginTop: 3 },

  labelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  linkText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "500",
  },

  pickCard: {
    backgroundColor: INK,
    borderRadius: 20,
    padding: 18,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 8,
  },
  pickCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pickMatch: {
    fontFamily: MONO,
    fontSize: 10,
    color: BG,
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  pickTitle: {
    fontSize: 24,
    color: BG,
    fontWeight: "400",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  sparkleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  pickGrid: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(251,246,236,0.06)",
    borderRadius: 14,
    padding: 8,
  },
  pickCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: BG,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: { flexDirection: "row", gap: 10 },
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

  recentScroll: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 10,
  },
  recentCard: { width: 104 },
  recentArt: {
    width: 104,
    height: 104,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    overflow: "hidden",
  },
  recentLabel: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  recentSub: {
    fontFamily: MONO,
    fontSize: 11,
    color: INK_50,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  recentAddBtn: {
    width: 104,
    aspectRatio: 3 / 4,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: ACCENT,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  recentAddLabel: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "500",
  },

  challengeCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: WARM,
  },
  challengeChip: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK,
    opacity: 0.55,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  challengeText: {
    fontSize: 19,
    color: INK,
    letterSpacing: -0.2,
    lineHeight: 26,
    marginTop: 4,
  },
});
