// ─── Stylist tab — client-side outfit recommendation screen ───────────────────
//
// DATA FLOW OVERVIEW
// ──────────────────
// 1. On tab focus → fetch all of the user's clothing_items + their preferred_styles
//    from Supabase (two parallel queries).
// 2. On first load only → pre-select up to 2 vibe chips from preferred_styles so
//    the screen is never blank for a returning user.
// 3. Whenever allItems, selectedOccasions, selectedVibes, or seed changes →
//    synchronously run buildSuggestions() to recompute outfit cards. No network
//    call; all matching logic is client-side against the already-fetched items.
// 4. Each SuggestionCard lazily fetches signed image URLs for its item
//    thumbnails (one Supabase Storage call per item, cancelled on unmount).
//
// SCORING PIPELINE (inside buildSuggestions)
// ──────────────────────────────────────────
//  a. Shuffle items with a deterministic seed so "Regenerate" gives variety
//     without calling the server again.
//  b. Score every item: occasion tag hits (+3 each), vibe tag hits (+2 each),
//     is_favorite bonus (+1).
//  c. Sort descending by score, then group into buckets (top/bottom/dress/…).
//  d. Greedy combo selection: try each outfit template (e.g. top+bottom+shoes),
//     pick the highest-scoring valid combo from unused items, repeat up to 3x.
//  e. Normalise the raw score into a 62–97% "confidence" badge.

import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { getClothingImageUrl } from "@/services/clothing/getClothingImageUrl";
import { ClothingItem } from "@/types/clothing";

// ─── Design tokens ─────────────────────────────────────────────────────────────
// Duplicated from the app-wide palette because there is no global theme provider
// yet. If a ThemeContext is added later, replace these with useTheme() calls.
const ACCENT = "#E27D5E"; // coral — primary interactive colour
const INK    = "#2B2418"; // near-black — primary text & dark card background
const INK_50 = "rgba(43,36,24,0.5)"; // half-opacity ink — secondary text
const BG     = "#FBF6EC"; // warm off-white — screen background
const CARD   = "#FFFCF4"; // lighter warm white — card surfaces
// "Courier New" is the only monospace font guaranteed on iOS; "monospace" works
// on Android. Platform.select is evaluated at bundle time.
const MONO   = Platform.select({ ios: "Courier New", android: "monospace" }) as string;

// ─── Filter chip constants ─────────────────────────────────────────────────────
// `as const` makes TypeScript narrow the array to a tuple of string literals,
// which lets us derive the union type Occasion without duplication.
const OCCASIONS = ["Work", "Casual", "Date", "Gym", "Travel", "Evening"] as const;
type Occasion = typeof OCCASIONS[number];

const VIBES = ["Minimal", "Soft", "Edgy", "Bold", "Cozy", "Preppy"] as const;
type Vibe = typeof VIBES[number];

// An outfit suggestion produced entirely client-side — no backend involved.
type OutfitSuggestion = {
  id: string;
  name: string;       // display headline, e.g. "Minimal Work Look"
  reason: string;     // one-sentence human-readable explanation
  confidence: number; // integer 62–97, shown as "XX% match"
  items: ClothingItem[]; // 2–4 items chosen from the user's wardrobe
};

// ─── Tag mappings ──────────────────────────────────────────────────────────────
// Each UI chip maps to a list of lowercase keywords that should appear in an
// item's occasion_tags or style_tags (written by the AI tagger during the Add
// flow). Matching is bidirectional substring: "professional" matches "profession"
// and vice versa, so minor wording differences in AI output still score hits.

const OCCASION_TAGS: Record<Occasion, string[]> = {
  Work:    ["work", "office", "business", "professional", "formal"],
  Casual:  ["casual", "everyday", "weekend", "relaxed"],
  Date:    ["date", "romantic", "evening", "dinner"],
  Gym:     ["gym", "sport", "athletic", "workout", "active"],
  Travel:  ["travel", "outdoor", "adventure", "versatile"],
  Evening: ["evening", "formal", "cocktail", "night", "party"],
};

const VIBE_TAGS: Record<Vibe, string[]> = {
  Minimal: ["minimal", "minimalist", "clean", "simple"],
  Soft:    ["soft", "feminine", "romantic", "gentle", "delicate"],
  Edgy:    ["edgy", "bold", "streetwear", "grunge", "rock"],
  Bold:    ["bold", "statement", "colorful", "vibrant", "maximalist"],
  Cozy:    ["cozy", "comfortable", "relaxed", "casual", "laid-back"],
  Preppy:  ["preppy", "classic", "traditional", "collegiate"],
};

// Pre-written reason strings keyed by the primary selected occasion.
// Used as the base of a SuggestionCard's reason sentence.
const OCCASION_REASONS: Record<Occasion, string> = {
  Work:    "Professional and polished — ready for whatever the day brings.",
  Casual:  "Effortless and comfortable for your everyday.",
  Date:    "Thoughtful, romantic, and confident.",
  Gym:     "Functional and stylish for your workout.",
  Travel:  "Versatile pieces that keep you comfortable on the move.",
  Evening: "Elevated and intentional for the night ahead.",
};

// ─── Scoring ───────────────────────────────────────────────────────────────────
// Returns a raw score for a single item against the currently selected filters.
//
// Weight rationale:
//   +3 per occasion keyword hit — occasion is the strongest intent signal
//   +2 per vibe keyword hit     — vibe refines style but is secondary
//   +1 for is_favorite          — tie-breaker: surface things the user loves
//
// A higher weight for occasions than vibes mirrors real styling logic: you
// wouldn't wear gym clothes to a work meeting regardless of aesthetic.
function scoreItem(item: ClothingItem, occasions: Occasion[], vibes: Vibe[]): number {
  let score = 0;
  // Normalise to lowercase once to avoid repeated calls inside the filter.
  const oTags = (item.occasion_tags ?? []).map(t => t.toLowerCase());
  const sTags = (item.style_tags ?? []).map(t => t.toLowerCase());

  for (const occ of occasions) {
    // Count how many of this occasion's keywords appear in the item's tags.
    const hits = OCCASION_TAGS[occ].filter(t => oTags.some(o => o.includes(t) || t.includes(o)));
    score += hits.length * 3;
  }
  for (const vibe of vibes) {
    const hits = VIBE_TAGS[vibe].filter(t => sTags.some(s => s.includes(t) || t.includes(s)));
    score += hits.length * 2;
  }
  if (item.is_favorite) score += 1;
  return score;
}

// ─── Category bucketing ────────────────────────────────────────────────────────
// Maps an item's free-text category + subcategory into one of seven structural
// slots used when assembling outfit combos. Regex order matters: "dress" is
// tested before "top" because a jumpsuit contains neither, but a dress-top
// hybrid should land in "dress", not "top".
function bucketItem(item: ClothingItem): string {
  const val = `${item.category ?? ""} ${item.subcategory ?? ""}`.toLowerCase();
  if (/dress|romper|jumpsuit/.test(val))                            return "dress";
  if (/shirt|top|blouse|tee|tank|knit|cami/.test(val))             return "top";
  if (/pant|jean|trouser|short|skirt|legging/.test(val))           return "bottom";
  if (/shoe|sneaker|boot|heel|sandal|loafer|flat/.test(val))       return "shoes";
  if (/jacket|coat|blazer|cardigan|hoodie/.test(val))              return "outer";
  if (/bag|purse|hat|scarf|belt|accessory|jewelry|watch/.test(val)) return "accessory";
  return "other"; // unrecognised category — kept in pool but rarely picked first
}

// ─── Seeded shuffle ────────────────────────────────────────────────────────────
// Fisher-Yates shuffle driven by a 32-bit LCG so that:
//   seed === 0 → same default ordering every render (favourites float to top)
//   seed > 0   → deterministic but different permutation each time the user
//                taps "Regenerate" (which increments the seed integer)
// Using Math.imul for integer multiply keeps values within 32-bit range without
// BigInt. The three-step xorshift-multiply pattern is a standard hash mix.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]; // never mutate the original state array
  let s = seed === 0 ? 0xdeadbeef : seed;
  for (let i = a.length - 1; i > 0; i--) {
    // Mix the seed bits to avoid low-quality low-order patterns.
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Outfit suggestion builder ─────────────────────────────────────────────────
// Pure function — no side effects, no async. Takes the full wardrobe and the
// current filter state; returns up to 3 outfit suggestions.
//
// PHASES
// 1. Shuffle — randomise item order with the current seed so Regenerate works.
// 2. Score & sort — every item gets a relevance score; higher scores float up.
// 3. Group by bucket — build a map from structural slot → sorted item list.
// 4. Greedy combo assembly — for each target outfit:
//      a. Try every outfit template in COMBOS order.
//      b. For each template slot, pick the best-scoring unused item in that bucket.
//      c. Keep whichever template produced the highest total score.
//      d. Mark chosen items as used so they don't appear in later outfits.
//      e. Normalise the combo's raw score to a confidence percentage.
// 5. Fallback — if no valid combo could be assembled (sparse wardrobe), show the
//    top 4 scored items as a loose "picks" card.
function buildSuggestions(
  items: ClothingItem[],
  occasions: Occasion[],
  vibes: Vibe[],
  seed: number,
): OutfitSuggestion[] {
  if (items.length === 0) return [];

  // Phase 1 + 2: shuffle then score-sort.
  const shuffled = seededShuffle(items, seed);
  const scored = shuffled
    .map(item => ({ item, score: scoreItem(item, occasions, vibes), bucket: bucketItem(item) }))
    .sort((a, b) => b.score - a.score);

  // Phase 3: group into bucket lists (each list is already score-sorted).
  const byBucket: Record<string, typeof scored> = {};
  for (const s of scored) {
    if (!byBucket[s.bucket]) byBucket[s.bucket] = [];
    byBucket[s.bucket].push(s);
  }

  // Outfit templates, tried in order of preference. A template is "valid" only
  // if every slot has at least one unused item available.
  // Combos with shoes are preferred over those without (more complete looks).
  const COMBOS = [
    ["top", "bottom", "shoes"],   // most common full outfit
    ["dress", "shoes"],           // dress-based look
    ["top", "bottom", "outer"],   // layered look (no shoes required)
    ["top", "bottom"],            // minimal — only if shoes unavailable
    ["dress"],                    // single-piece fallback
  ];

  const outfits: OutfitSuggestion[] = [];
  // usedIds prevents the same item appearing in two different outfit cards.
  const usedIds = new Set<string>();

  // Pick the best unused item for a given bucket slot.
  const pick = (bucket: string) =>
    (byBucket[bucket] ?? []).find(s => !usedIds.has(s.item.id)) ?? null;

  // Build display copy from filters. If multiple occasions selected, only the
  // first drives the reason text — keeps the sentence coherent.
  const reasonBase = occasions[0] ? OCCASION_REASONS[occasions[0]] : "Curated from your wardrobe.";
  const vibeSuffix = vibes.length > 0 ? ` A ${vibes[0].toLowerCase()} feel.` : "";

  // Three distinct look names so repeated renders don't look identical.
  const lookNames = [
    `${vibes[0] ?? "Curated"} ${occasions[0] ?? "Daily"} Look`,
    `The ${vibes[0] ?? "Essential"} Edit`,
    `${occasions[0] ?? "Everyday"} Signature`,
  ];

  // Phase 4: greedy combo assembly. attempt cap (12) prevents an infinite loop
  // if the wardrobe is very sparse and every combo fails on the first try.
  for (let attempt = 0; outfits.length < 3 && attempt < 12; attempt++) {
    let best: ClothingItem[] | null = null;
    let bestScore = -1;

    for (const combo of COMBOS) {
      const comboItems: ClothingItem[] = [];
      let comboScore = 0;
      let ok = true;
      for (const slot of combo) {
        const found = pick(slot);
        if (!found) { ok = false; break; } // template invalid — skip it
        comboItems.push(found.item);
        comboScore += found.score;
      }
      if (ok && comboScore > bestScore) {
        best = comboItems;
        bestScore = comboScore;
      }
    }

    // No valid combo at all — wardrobe is too sparse to make more outfits.
    if (!best || best.length < 1) break;

    // Commit: mark chosen items as used for subsequent outfit passes.
    for (const item of best) usedIds.add(item.id);

    // Confidence formula: map the raw score onto [62, 97].
    // maxPossible = (items in combo) × (max score per item given current filters)
    // We cap at 97 so it never reads as "perfect" and floor at 62 so it always
    // looks meaningful even when no tags matched (score = 0 → is_favorite only).
    const maxPossible = best.length * (occasions.length * 3 + vibes.length * 2 + 1);
    const confidence = Math.min(97, Math.max(62, Math.round(62 + (bestScore / Math.max(1, maxPossible)) * 35)));

    outfits.push({
      id: `outfit-${outfits.length}`,
      name: lookNames[outfits.length] ?? `Look 0${outfits.length + 1}`,
      reason: reasonBase + vibeSuffix,
      confidence,
      items: best,
    });
  }

  // Phase 5: fallback for sparse wardrobes where no structural combo was possible.
  // Shows the top 4 scored items as a loose "picks" card so the screen is never
  // completely empty when the user has clothes but no matching outfit templates.
  if (outfits.length === 0) {
    const top = scored.slice(0, 4).map(s => s.item);
    if (top.length > 0) {
      outfits.push({
        id: "fallback",
        name: vibes[0] ? `${vibes[0]} Picks` : "Top Picks",
        reason: "Your best-matching pieces for today.",
        confidence: 68,
        items: top,
      });
    }
  }

  return outfits;
}

// ─── ItemThumbnail ─────────────────────────────────────────────────────────────
// Renders a single square item photo inside a SuggestionCard. Image URLs are
// not stored in the database — clothing images live in a private Supabase Storage
// bucket and must be fetched as short-lived signed URLs at runtime.
//
// Why load URLs here instead of in the parent?
//   SuggestionCard renders 2–4 thumbnails; fetching all URLs in the parent would
//   mean one Promise.all per card, adding latency before the card appears.
//   Loading per-thumbnail means each square fills in independently as its URL
//   resolves, so the card skeleton is visible immediately.
//
// The cancelled flag prevents a setState call on an unmounted component if the
// user navigates away before a slow URL fetch resolves.
function ItemThumbnail({ item, size, dark }: { item: ClothingItem; size: number; dark: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item.image_path) return;
    let cancelled = false;
    getClothingImageUrl(item.image_path)
      .then(u => { if (!cancelled) setUrl(u); })
      .catch(() => {}); // swallow; placeholder icon remains visible on error
    return () => { cancelled = true; };
  }, [item.image_path]); // re-fetch only if the item's storage path changes

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        // Subtle tinted placeholder matches whichever card variant is showing.
        backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(43,36,24,0.05)",
      }}
    >
      {url ? (
        // expo-image gives better caching and memory management than React Native's
        // built-in Image, which matters when multiple cards are rendered at once.
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        // Placeholder until the signed URL resolves (typically <200 ms on a good
        // connection, but can be longer on a slow network or cold Supabase edge).
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons
            name="shirt-outline"
            size={Math.max(14, size * 0.35)}
            color={dark ? "rgba(255,255,255,0.2)" : "rgba(43,36,24,0.2)"}
          />
        </View>
      )}
    </View>
  );
}

// ─── SuggestionCard ────────────────────────────────────────────────────────────
// Displays one outfit suggestion. The first card (index === 0) uses a dark INK
// background to visually distinguish it as the primary recommendation; all
// subsequent cards use the light CARD surface.
//
// Thumb size calculation:
//   The card occupies the full screen width minus 44 px of screen margin (22 each
//   side) and 32 px of card padding (16 each side). Thumbs are evenly distributed
//   across that inner width with 8 px gaps between them.
//
// Feedback state (thumbsUp / thumbsDown / bookmarked) is local-only for now.
// These will need to be persisted to the `feedback` Supabase table when that
// feature is wired up.
function SuggestionCard({ suggestion, index }: { suggestion: OutfitSuggestion; index: number }) {
  const dark = index === 0;
  const { width } = useWindowDimensions(); // re-evaluates on device rotation
  const cardInnerWidth = width - 44 - 32; // 22px screen margin + 16px card padding, each side
  const displayItems = suggestion.items.slice(0, 4); // cap at 4 to avoid layout overflow
  const thumbSize = displayItems.length > 0
    ? Math.floor((cardInnerWidth - (displayItems.length - 1) * 8) / displayItems.length)
    : 80;

  // Thumbs are mutually exclusive: liking clears dislike and vice versa.
  const [thumbsUp, setThumbsUp]     = useState(false);
  const [thumbsDown, setThumbsDown] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Pre-compute icon colour to avoid repeating the ternary in each Pressable.
  const dimBtn = dark ? "rgba(251,246,236,0.6)" : INK_50;

  return (
    <View style={[card.root, dark && card.rootDark]}>
      {/* ── Top row: look number label (left) + confidence badge (right) ── */}
      <View style={card.headerRow}>
        <Text style={[card.lookLabel, dark && card.lookLabelDark]}>LOOK 0{index + 1}</Text>
        <View style={card.badge}>
          {/* Animated dot mirrors the "AI detecting" pill in camera.tsx */}
          <View style={card.badgeDot} />
          <Text style={card.badgeText}>{suggestion.confidence}% match</Text>
        </View>
      </View>

      {/* ── Outfit name ── */}
      <Text style={[card.name, dark && card.nameDark]}>{suggestion.name}</Text>

      {/* ── One-line reason derived from the selected occasion ── */}
      <Text style={[card.reason, dark && card.reasonDark]}>{suggestion.reason}</Text>

      {/* ── Item thumbnails — each loads its own signed URL independently ── */}
      <View style={card.thumbRow}>
        {displayItems.map(item => (
          <ItemThumbnail key={item.id} item={item} size={thumbSize} dark={dark} />
        ))}
      </View>

      {/* ── Action row: feedback icons (left) + CTA button (right) ── */}
      <View style={card.actions}>
        <View style={card.actionsLeft}>
          <Pressable
            hitSlop={6} // extend touch target without changing visual size
            style={[card.iconBtn, dark && card.iconBtnDark, thumbsUp && card.iconBtnActive]}
            onPress={() => { setThumbsUp(v => !v); if (thumbsDown) setThumbsDown(false); }}
          >
            <Ionicons
              name={thumbsUp ? "thumbs-up" : "thumbs-up-outline"}
              size={15}
              color={thumbsUp ? ACCENT : dimBtn}
            />
          </Pressable>
          <Pressable
            hitSlop={6}
            style={[card.iconBtn, dark && card.iconBtnDark, thumbsDown && card.iconBtnActive]}
            onPress={() => { setThumbsDown(v => !v); if (thumbsUp) setThumbsUp(false); }}
          >
            <Ionicons
              name={thumbsDown ? "thumbs-down" : "thumbs-down-outline"}
              size={15}
              color={thumbsDown ? ACCENT : dimBtn}
            />
          </Pressable>
          <Pressable
            hitSlop={6}
            style={[card.iconBtn, dark && card.iconBtnDark, bookmarked && card.iconBtnActive]}
            onPress={() => setBookmarked(v => !v)}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={15}
              color={bookmarked ? ACCENT : dimBtn}
            />
          </Pressable>
        </View>

        {/* "Wear today" will eventually log to wear_history and update last_worn */}
        <Pressable style={[card.wearBtn, dark && card.wearBtnDark]}>
          <Text style={[card.wearBtnText, dark && card.wearBtnTextDark]}>Wear today →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Styles are separated from the main StyleSheet so SuggestionCard can be
// extracted into its own file later without touching the screen styles.
const card = StyleSheet.create({
  root: {
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.07)",
    padding: 16,
    gap: 10,
  },
  rootDark: {
    backgroundColor: INK,
    borderColor: "rgba(251,246,236,0.06)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lookLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    letterSpacing: 1.5,
  },
  lookLabelDark: {
    color: "rgba(251,246,236,0.35)",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(226,125,94,0.1)",
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT,
  },
  badgeText: {
    fontFamily: MONO,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 19,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  nameDark: { color: "#FBF6EC" },
  reason: {
    fontSize: 13,
    color: INK_50,
    lineHeight: 18,
  },
  reasonDark: { color: "rgba(251,246,236,0.45)" },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  actionsLeft: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(43,36,24,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDark: {
    backgroundColor: "rgba(251,246,236,0.07)",
  },
  iconBtnActive: {
    // Coral tint when toggled — same for both card variants.
    backgroundColor: "rgba(226,125,94,0.1)",
  },
  wearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: INK,
  },
  wearBtnDark: {
    // Inverted on the dark card so the button still has sufficient contrast.
    backgroundColor: "#FBF6EC",
  },
  wearBtnText: {
    fontSize: 13,
    color: "#FBF6EC",
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  wearBtnTextDark: { color: INK },
});

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function StylistIndexScreen() {
  const { claims } = useAuthContext();
  // claims.sub is the Supabase user UUID, available synchronously after auth.
  const userId = claims?.sub as string | undefined;

  const [prompt, setPrompt]                       = useState("");
  const [selectedOccasions, setSelectedOccasions] = useState<Occasion[]>([]);
  const [selectedVibes, setSelectedVibes]         = useState<Vibe[]>([]);
  // Full wardrobe fetched from Supabase — this is the scoring pool.
  const [allItems, setAllItems]                   = useState<ClothingItem[]>([]);
  // Derived from allItems + filters; recomputed synchronously on every change.
  const [suggestions, setSuggestions]             = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading]                     = useState(true);
  // Shown in the context strip below the prompt input.
  const [itemCount, setItemCount]                 = useState(0);
  // Incrementing this triggers seededShuffle to produce a different permutation,
  // giving "Regenerate" its variety without a network call.
  const [seed, setSeed]                           = useState(0);

  // Guards the vibe pre-population so navigating back to this tab doesn't reset
  // chips the user has manually adjusted. Set to true after the first load.
  const hasPrePopulated = useRef(false);

  // ── Data fetching ────────────────────────────────────────────────────────────
  // useFocusEffect re-runs whenever this tab becomes active, so the wardrobe
  // pool stays fresh if the user added or deleted items while on another tab.
  // useEffect would only run on mount and miss those updates.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void (async () => {
        setLoading(true);
        // Fetch wardrobe and style preferences in parallel to minimise wait time.
        // preferences.preferred_styles → array like ["Minimal", "Classic", "Soft"]
        const [itemsRes, prefsRes] = await Promise.all([
          supabase
            .from("clothing_items")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("preferences")
            .select("preferred_styles")
            .eq("user_id", userId)
            .maybeSingle(), // returns null (not an error) when no preferences row exists
        ]);

        const items = (itemsRes.data ?? []) as ClothingItem[];
        setAllItems(items);
        setItemCount(items.length);

        // Pre-populate vibe chips on first load using the user's saved preferences.
        // Cap at 2 so the screen doesn't look over-filtered on first view.
        // Case-insensitive match because preferences are stored as "Minimal" etc.
        if (!hasPrePopulated.current) {
          const styles = (prefsRes.data?.preferred_styles as string[]) ?? [];
          const matched = VIBES.filter(v => styles.some(s => s.toLowerCase() === v.toLowerCase()));
          if (matched.length > 0) setSelectedVibes(matched.slice(0, 2));
          hasPrePopulated.current = true;
        }

        setLoading(false);
      })();
    }, [userId])
  );

  // ── Suggestion recomputation ─────────────────────────────────────────────────
  // Runs synchronously (no await) every time the input data changes.
  // Keeping this in a separate useEffect from the data fetch means suggestions
  // update immediately when the user toggles a chip, without waiting for a
  // re-fetch.
  useEffect(() => {
    if (allItems.length === 0) { setSuggestions([]); return; }
    setSuggestions(buildSuggestions(allItems, selectedOccasions, selectedVibes, seed));
  }, [allItems, selectedOccasions, selectedVibes, seed]);

  // ── Filter toggles ───────────────────────────────────────────────────────────
  // Multi-select: tapping a selected chip deselects it; tapping an unselected
  // chip adds it to the array. No maximum enforced — users can select all.
  const toggleOccasion = (occ: Occasion) =>
    setSelectedOccasions(prev => prev.includes(occ) ? prev.filter(o => o !== occ) : [...prev, occ]);

  const toggleVibe = (vibe: Vibe) =>
    setSelectedVibes(prev => prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]);

  // ── Prompt parsing ───────────────────────────────────────────────────────────
  // Very lightweight NLP: scan the free-text prompt for occasion keywords and
  // auto-select matching chips. This gives the text input real utility without
  // needing an API call. When a backend AI endpoint is added, replace this with
  // a server call that returns structured filter suggestions.
  const handlePromptSubmit = () => {
    Keyboard.dismiss();
    const lower = prompt.toLowerCase().trim();
    if (!lower) return;
    const detected: Occasion[] = [];
    if (/office|work|meeting|professional|business/.test(lower)) detected.push("Work");
    if (/gym|workout|exercise|sport|run|yoga/.test(lower))       detected.push("Gym");
    if (/date|dinner|romantic/.test(lower))                      detected.push("Date");
    if (/brunch|coffee|weekend|errand|casual/.test(lower))       detected.push("Casual");
    if (/travel|trip|flight|airport/.test(lower))                detected.push("Travel");
    if (/party|club|night out|gala|event/.test(lower))           detected.push("Evening");
    // Only update occasions if we found a recognisable keyword; otherwise just
    // increment the seed to reshuffle without changing the filter selection.
    if (detected.length > 0) setSelectedOccasions(detected);
    setSeed(s => s + 1); // always reshuffle so submitting feels responsive
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  // hasFilters gates the "For you" section: we never show cards without context.
  const hasFilters = selectedOccasions.length > 0 || selectedVibes.length > 0;
  const todayStr   = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* keyboardShouldPersistTaps="handled" lets chip Pressables fire even when
          the prompt keyboard is open, without requiring a tap to dismiss first. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>AI STYLIST</Text>
          <Text style={styles.headline}>What are you{"\n"}dressing for?</Text>
        </View>

        {/* ── Prompt card ──
            The text input is decorative + functional: typing recognisable keywords
            ("office", "brunch", "date night") auto-selects the matching occasion
            chip when the user submits. The context strip shows environmental
            awareness without requiring location/weather permissions. */}
        <View style={styles.promptCard}>
          <View style={styles.promptRow}>
            <TextInput
              style={styles.promptInput}
              placeholder="Brunch with my in-laws, 58°F…"
              placeholderTextColor={INK_50}
              value={prompt}
              onChangeText={setPrompt}
              returnKeyType="done"
              onSubmitEditing={handlePromptSubmit}
            />
            <Pressable style={styles.sendBtn} onPress={handlePromptSubmit}>
              <Ionicons name="arrow-up" size={16} color="#fff" />
            </Pressable>
          </View>
          {/* Context strip: today's date + wardrobe size give the user a sense
              that the stylist "knows" their situation without requiring API calls. */}
          <View style={styles.contextStrip}>
            <View style={styles.contextItem}>
              <Ionicons name="calendar-outline" size={11} color={INK_50} />
              <Text style={styles.contextText}>{todayStr}</Text>
            </View>
            <View style={styles.contextSep} />
            <View style={styles.contextItem}>
              <Ionicons name="shirt-outline" size={11} color={INK_50} />
              <Text style={styles.contextText}>{itemCount} item{itemCount !== 1 ? "s" : ""}</Text>
            </View>
          </View>
        </View>

        {/* ── Occasion chips ──
            Horizontal ScrollView so chips never wrap to a second line, even on
            a narrow device. Multi-select: any combination of occasions is valid. */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>OCCASION</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {OCCASIONS.map(occ => {
              const active = selectedOccasions.includes(occ);
              return (
                <Pressable
                  key={occ}
                  onPress={() => toggleOccasion(occ)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{occ}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Vibe chips ──
            Pre-populated from preferred_styles on first mount (see useFocusEffect).
            Selecting a vibe adds +2 per matching style_tag hit in the scorer. */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>VIBE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {VIBES.map(vibe => {
              const active = selectedVibes.includes(vibe);
              return (
                <Pressable
                  key={vibe}
                  onPress={() => toggleVibe(vibe)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{vibe}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── "For you" header + Regenerate ──
            Regenerate increments seed, which changes the seededShuffle permutation,
            which changes which items float to the top of each bucket, producing
            different valid combos without any network call. */}
        <View style={styles.forYouRow}>
          <Text style={styles.forYouTitle}>For you</Text>
          {hasFilters && (
            <Pressable onPress={() => setSeed(s => s + 1)} style={styles.regenBtn}>
              <Ionicons name="refresh-outline" size={13} color={ACCENT} />
              <Text style={styles.regenText}>Regenerate</Text>
            </Pressable>
          )}
        </View>

        {/* ── Content area — four mutually exclusive states ── */}
        {loading ? (
          // Wardrobe fetch in progress.
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} />
            <Text style={styles.centerLabel}>Loading your wardrobe…</Text>
          </View>
        ) : allItems.length === 0 ? (
          // User has no clothing items yet — direct them to the Add tab.
          <View style={styles.center}>
            <Ionicons name="shirt-outline" size={36} color={INK_50} />
            <Text style={styles.emptyTitle}>Your closet is empty</Text>
            <Text style={styles.emptyDesc}>
              Add items to your wardrobe and your AI stylist will start curating looks.
            </Text>
          </View>
        ) : !hasFilters ? (
          // Items exist but no filters selected — prompt them to choose context.
          <View style={styles.center}>
            <Ionicons name="sparkles-outline" size={36} color={INK_50} />
            <Text style={styles.emptyTitle}>Pick an occasion or vibe</Text>
            <Text style={styles.emptyDesc}>
              Select filters above and your stylist will pull together outfits from your wardrobe.
            </Text>
          </View>
        ) : suggestions.length === 0 ? (
          // Filters selected but no combo template could be satisfied.
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyDesc}>
              Try different filters or add more items to build out your wardrobe.
            </Text>
          </View>
        ) : (
          // Happy path: show outfit cards.
          <View style={styles.cards}>
            {suggestions.map((s, i) => (
              // index drives the dark/light card variant — index 0 is always dark.
              <SuggestionCard key={s.id} suggestion={s} index={i} />
            ))}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: BG },
  scroll:  { flex: 1 },
  content: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 20,
  },
  headerLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 2,
    marginBottom: 10,
  },
  headline: {
    fontSize: 30,
    color: INK,
    fontWeight: "300",
    fontStyle: "italic",
    letterSpacing: -0.8,
    lineHeight: 36,
  },

  promptCard: {
    marginHorizontal: 22,
    marginBottom: 22,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.07)",
    overflow: "hidden",
  },
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  promptInput: {
    flex: 1,
    fontSize: 15,
    color: INK,
    // Zero padding/margin avoids the extra tap target area that React Native
    // adds by default, keeping the input flush with the card edge.
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  contextStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 7,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contextText: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    letterSpacing: 0.2,
  },
  contextSep: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: INK_50,
  },

  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: INK_50,
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingHorizontal: 22,
  },
  chipsRow: {
    paddingHorizontal: 22,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(43,36,24,0.15)",
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  chipText: {
    fontSize: 13,
    color: INK,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
  },

  forYouRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginTop: 6,
    marginBottom: 14,
  },
  forYouTitle: {
    fontSize: 20,
    color: INK,
    fontWeight: "400",
    letterSpacing: -0.4,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(226,125,94,0.08)",
  },
  regenText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "500",
  },

  center: {
    alignItems: "center",
    paddingHorizontal: 36,
    paddingVertical: 44,
    gap: 10,
  },
  centerLabel: {
    fontSize: 14,
    color: INK_50,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 17,
    color: INK,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: INK_50,
    textAlign: "center",
    lineHeight: 20,
  },

  cards: {
    paddingHorizontal: 22,
    gap: 16,
  },
  bottomPad: { height: 8 },
});
