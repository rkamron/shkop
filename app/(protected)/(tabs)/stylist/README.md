# Stylist tab

AI outfit recommendation screen. All suggestion logic runs client-side against the user's already-fetched wardrobe — no backend round-trip per suggestion.

## Files

| File | Purpose |
|---|---|
| `_layout.tsx` | Stack navigator wrapper; sets `headerShown: false` on the index |
| `index.tsx` | The entire feature: data fetching, scoring engine, and all UI components |

Everything is in one file intentionally. When the feature grows (e.g. a detail screen for a saved outfit, a "Wear today" confirmation sheet), extract individual components then.

## How suggestions are generated

### 1. Data fetch (on tab focus)

Two parallel Supabase queries:
- `clothing_items` — the full item pool, ordered by `created_at DESC`
- `preferences.preferred_styles` — used to pre-populate vibe chips on first load

The pool is fetched on every tab focus (`useFocusEffect`) so it stays fresh after adding or deleting items on another tab.

### 2. Scoring

Every item gets a numeric score against the currently selected filters:

```
score = (occasion_tag_hits × 3) + (vibe_tag_hits × 2) + (is_favorite ? 1 : 0)
```

**Occasion hits** are checked against `OCCASION_TAGS`, **vibe hits** against `VIBE_TAGS`. Both use bidirectional substring matching (`"professional".includes("profession")` OR `"profession".includes("professional")`), which absorbs minor wording differences from the AI tagger.

Occasion hits outweigh vibe hits (3 vs 2) because occasion is the hard constraint — you wouldn't wear gym clothes to an office meeting regardless of aesthetic.

### 3. Bucketing

Items are placed into structural slots by regex-matching `category + subcategory`:

| Bucket | Matched terms |
|---|---|
| `dress` | dress, romper, jumpsuit |
| `top` | shirt, top, blouse, tee, tank, knit, cami |
| `bottom` | pant, jean, trouser, short, skirt, legging |
| `shoes` | shoe, sneaker, boot, heel, sandal, loafer, flat |
| `outer` | jacket, coat, blazer, cardigan, hoodie |
| `accessory` | bag, purse, hat, scarf, belt, accessory, jewelry, watch |
| `other` | anything unrecognised |

Regex order matters: `dress` is tested before `top` to catch edge cases like "dress-top."

### 4. Combo assembly

Templates are tried in preference order:

1. `[top, bottom, shoes]` — most complete everyday outfit
2. `[dress, shoes]` — dress-based look
3. `[top, bottom, outer]` — layered look
4. `[top, bottom]` — minimal, when shoes unavailable
5. `[dress]` — single-piece fallback

For each outfit slot the algorithm picks the highest-scoring *unused* item in that bucket. After committing to a combo, all chosen items are added to a `usedIds` set so the same item never appears in two cards.

This repeats up to 3 times (capped at 12 attempts to guard against infinite loops on sparse wardrobes).

### 5. Confidence percentage

```
maxPossible = itemsInCombo × (occasions.length × 3 + vibes.length × 2 + 1)
confidence  = clamp(62 + (rawScore / maxPossible) × 35, 62, 97)
```

The floor (62) means the badge always looks meaningful. The ceiling (97) avoids "100% match," which would feel algorithmic.

### 6. Regenerate

"Regenerate" increments a `seed` integer. `buildSuggestions` passes `seed` to `seededShuffle`, which runs Fisher-Yates with a 32-bit xorshift-multiply hash, producing a different but deterministic permutation. This changes which item floats to the top of each bucket without any network call.

## Supabase columns used

| Table | Column | Used for |
|---|---|---|
| `clothing_items` | `occasion_tags text[]` | Occasion scoring |
| `clothing_items` | `style_tags text[]` | Vibe scoring |
| `clothing_items` | `is_favorite boolean` | Tie-breaker score bonus |
| `clothing_items` | `image_path text` | Signed URL generation for thumbnails |
| `clothing_items` | `category`, `subcategory` | Bucket assignment |
| `preferences` | `preferred_styles text[]` | Vibe chip pre-population |

## What is NOT wired yet

- **"Wear today" CTA** — should INSERT into `wear_history` and UPDATE `clothing_items.last_worn`
- **Thumbs up / down / bookmark** — local state only; should persist to the `feedback` table
- **Last-worn boosting** — items worn recently could get a slight score penalty to encourage wardrobe rotation
- **AI prompt interpretation** — the text input does keyword parsing today; a future `/stylist/suggest` backend endpoint could use Claude to return structured filters

## Extending the scoring

To add a new filter dimension (e.g. Season), follow this pattern:

1. Add the constant array and union type alongside `OCCASIONS` / `VIBES`
2. Add a tag-mapping object like `SEASON_TAGS`
3. Add `+N per hit` in `scoreItem`
4. Add a chip row in the JSX using the same toggle pattern
5. Pass the new filter array into `buildSuggestions` and thread it through to `scoreItem`
