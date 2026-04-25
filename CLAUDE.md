# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Expo)
```bash
npx expo start          # start Metro bundler (scan QR with Expo Go or dev client)
npx expo start --ios    # open in iOS simulator
npx expo lint           # ESLint via expo lint
```

Physical device testing requires a **development build** (not Expo Go) because the project uses `expo-dev-client`. Build with EAS:
```bash
eas build --profile development --platform ios
```
`EXPO_PUBLIC_*` env vars are baked in at build time — if you add or change one, you must rebuild.

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0   # 0.0.0.0 required for physical device access
```

When testing from a physical device, set `EXPO_PUBLIC_BACKEND_URL` to the Mac's LAN IP (e.g., `http://192.168.1.x:8000`), not `localhost`.

## Environment Variables

**Frontend** (`.env` at repo root, never commit):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_KEY=      # anon/publishable key
EXPO_PUBLIC_BACKEND_URL=       # e.g. http://192.168.1.x:8000
```

**Backend** (`backend/.env`, never commit):
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
```

## Architecture

### Frontend

**Expo Router** file-based routing with two top-level route groups:
- `app/(public)/` — unauthenticated screens (login, signup)
- `app/(protected)/` — auth-gated; `_layout.tsx` redirects to `/login` if not logged in
  - `(tabs)/` — bottom tab navigator with 5 tabs: home, wardrobe, add, stylist, me

**State / Providers** (both wrapped at root in `app/_layout.tsx`):
- `AuthProvider` (`providers/auth-provider.tsx`) — fetches Supabase JWT claims and `public.profiles` row; exposes `isLoggedIn`, `claims`, `profile`, `signInWithPassword`, `signUpWithPassword`, `signOut`. Uses `maybeSingle()` on the profile query (returns null rather than erroring when no row exists yet).
- `AddClothingDraftProvider` (`providers/add-clothing-draft-provider.tsx`) — holds multi-step add-item flow state across screens (localImageUri, all AI-returned attributes). Call `setAiAttributes` after the backend responds.

**Wardrobe tab** (`(tabs)/wardrobe/`):
- `index.tsx` — custom top tab bar (Clothing | Outfits); Clothing tab has the full clothing grid with filters; Outfits tab is a placeholder
- `item/[id].tsx` — clothing item detail: image, all metadata, favorite toggle, delete
- `edit/[id].tsx` — edit core clothing metadata
- The old `closet/`, `outfits/`, and `profile/` tab folders remain on disk but are hidden from the tab bar via `href: null`

**Add flow** (`(tabs)/add/`):
1. `index.tsx` — entry: camera or photo library picker
2. `preview.tsx` — confirm image
3. `processing.tsx` — calls `services/ai/processClothingImage.ts` → FastAPI → Claude, then navigates to review
4. `review.tsx` — editable form for all 14 AI attributes; saves via `services/clothing/saveClothingItemFromDraft.ts`
5. `camera.tsx` — native camera screen
6. `edit.tsx` — edit existing item

**Supabase client** (`lib/supabase.ts`) — uses `expo-secure-store` as the session storage adapter. Auth tokens are persisted and auto-refreshed.

**Services pattern** (`services/`):
- `services/clothing/` — Supabase table operations; `_shared.ts` holds table name, bucket name, and `normalizeClothingItem`
- `services/ai/processClothingImage.ts` — gets session JWT, POSTs image as `multipart/form-data` to `${EXPO_PUBLIC_BACKEND_URL}/clothing/process`, maps response to `AiAttributes`

### Backend (Python / FastAPI)

```
backend/
  main.py              # FastAPI app; mounts routers; /health endpoint
  auth.py              # JWT validation via JWKS (PyJWKClient, ES256)
  config.py            # pydantic-settings reads backend/.env
  routers/clothing.py  # POST /clothing/process — receives image, returns attributes
  services/image_tagger.py  # Claude Haiku vision call with tool_choice:"any"
```

**Auth flow**: Frontend sends `Authorization: Bearer <supabase_jwt>`. Backend fetches the public key from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (ES256, cached 10 min), decodes the JWT, and returns `sub` (user UUID). No shared secret needed.

**AI tagging** (`services/image_tagger.py`): Uses `claude-haiku-4-5` (cheapest Claude vision model). `tool_choice: {"type": "any"}` forces a structured tool-call response. System prompt and tool schema both have `cache_control: {"type": "ephemeral"}` for prompt caching. Stream with `async with _client.messages.stream(...) as stream:` — do NOT `await` the stream call.

### Database (Supabase / PostgreSQL 15)

Migrations in `supabase/migrations/` — run manually in the Supabase SQL editor in order:
1. `000_drop_all.sql` — wipe tables (dev reset only)
2. `001_initial_schema.sql` — all 7 tables with RLS policies. Note: `CREATE POLICY IF NOT EXISTS` syntax is not available until PG17; omit `IF NOT EXISTS`.
3. `002_profile_trigger.sql` — `handle_new_user()` trigger auto-creates `public.profiles` on `auth.users` INSERT; includes backfill for pre-existing users.

Tables: `profiles`, `preferences`, `clothing_items`, `outfits`, `outfit_items`, `wear_history`, `feedback`.

Storage: one bucket `clothing` for item photos. Bucket must be created in the Supabase dashboard before storage RLS policies take effect.
