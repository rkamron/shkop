# Shkop — Image Processing Backend

FastAPI server that receives a clothing image from the mobile app, sends it to Claude's vision API, and returns structured clothing metadata ready to store in Supabase.

## Architecture & request flow

```
Mobile app (React Native / Expo)
        │
        │  POST /clothing/process
        │  Authorization: Bearer <supabase_access_token>   ← ES256-signed JWT
        │  Body: multipart/form-data { file: photo.jpg }
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  main.py  —  FastAPI app                                    │
│  Registers the /clothing router. Exposes GET /health.       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  routers/clothing.py  —  POST /clothing/process             │
│                                                             │
│  1. auth.py dependency runs first (see below)               │
│  2. Validates file type  (jpeg / png / webp only)           │
│  3. Reads file bytes, checks size (max 10 MB)               │
│  4. Calls services/image_tagger.py                          │
│  5. Returns ProcessClothingResponse                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴──────────────────────┐
           │  (runs before handler)                │
           ▼                                       ▼
┌──────────────────────────────┐   ┌───────────────────────────────────────────┐
│  auth.py                     │   │  services/image_tagger.py                 │
│                              │   │                                           │
│  Extracts Bearer token       │   │  1. Base64-encodes the image bytes        │
│  Fetches Supabase public     │   │  2. Sends to Claude Haiku (claude-haiku-  │
│    keys from JWKS endpoint   │   │     4-5) via Anthropic SDK (streaming)    │
│  Verifies ES256 signature    │   │  3. Forces tool call via                  │
│  Returns user UUID (sub)     │   │     tool_choice: "any" — guarantees       │
│  Raises 401 on failure       │   │     structured JSON, never prose          │
└──────────────────────────────┘   │  4. System prompt + tool definition are   │
                                   │     prompt-cached (ephemeral) — billed    │
                                   │     once per 5-min TTL, not per request   │
                                   │  5. Validates response → ClothingAttributes│
                                   └───────────────────────────────────────────┘
```

## Auth: why JWKS instead of a shared secret

Supabase has two JWT signing modes:

| Mode | Algorithm | How to verify |
|---|---|---|
| **Legacy** (old `eyJ...` API keys) | HS256 — symmetric | Share the `JWT Secret` from the dashboard |
| **Modern** (new `sb_publishable_*` keys) | ES256 — asymmetric | Use the public key from `/.well-known/jwks.json` |

This project uses modern `sb_publishable_*` API keys, which means user session tokens are signed with **ES256**. Verifying them with the legacy HS256 secret would fail on every request.

Instead, `auth.py` uses `PyJWKClient` to fetch Supabase's public keys from:
```
https://<your-project>.supabase.co/auth/v1/.well-known/jwks.json
```
Keys are cached for 10 minutes, so rotation happens automatically with no restart needed.

## Sessions: access token vs. refresh token

When a user signs in, Supabase issues two credentials:

| Token | Type | Lifetime | Purpose |
|---|---|---|---|
| **Access token** | ES256 JWT | ~1 hour | Sent as `Authorization: Bearer` on every request. Contains `sub` (user UUID), `role`, `exp`, `session_id`. |
| **Refresh token** | Opaque string | Long-lived | Exchanged for a new token pair when the access token expires. Single-use. |

The Supabase SDK in the app manages refresh automatically via `autoRefreshToken: true`. By the time `processClothingImage` calls `supabase.auth.getSession()`, the token is always fresh and valid.

## Project structure

```
backend/
├── main.py                  # FastAPI app entry point, /health endpoint
├── config.py                # Env vars loaded via pydantic-settings
├── auth.py                  # Supabase JWKS-based JWT validation dependency
├── requirements.txt         # Pinned dependencies
├── .env.example             # Copy to .env and fill in values
├── models/
│   └── clothing.py          # ClothingAttributes + ProcessClothingResponse
├── routers/
│   └── clothing.py          # POST /clothing/process
└── services/
    └── image_tagger.py      # Claude vision + tool use logic
```

## Setup

**1. Create and activate a virtual environment**

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

**3. Configure environment**

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |

No JWT secret needed — verification uses Supabase's public JWKS endpoint automatically.

**4. Run the server**

```bash
uvicorn main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## API

### `POST /clothing/process`

Accepts a clothing image and returns structured attributes extracted by Claude.

**Headers**
```
Authorization: Bearer <supabase_access_token>
Content-Type: multipart/form-data
```

**Body**
| Field | Type | Notes |
|---|---|---|
| `file` | image | jpeg, png, or webp; max 10 MB |

**Response `200`**
```json
{
  "attributes": {
    "category": "shirt",
    "subcategory": "t-shirt",
    "color": "black",
    "secondary_colors": [],
    "pattern": "solid",
    "material": "cotton",
    "formality": "casual",
    "fit": "regular",
    "style_tags": ["minimalist", "casual"],
    "season_tags": ["spring", "summer", "fall"],
    "occasion_tags": ["everyday"],
    "weather_tags": ["mild"],
    "brand": null,
    "notes": null
  }
}
```

**Error responses**
| Status | Reason |
|---|---|
| `401` | Missing, expired, or invalid JWT |
| `400` | Empty file |
| `413` | File exceeds 10 MB |
| `415` | Unsupported image type (not jpeg/png/webp) |
| `502` | Claude API error |

### `GET /health`

Returns `{"status": "ok"}`. Used for deployment health probes.

## Calling from the mobile app

The app calls this endpoint in `services/ai/processClothingImage.ts`. The pattern is:

```ts
const { data: { session } } = await supabase.auth.getSession();

const formData = new FormData();
formData.append("file", {
  uri: localImageUri,
  name: "photo.jpg",
  type: "image/jpeg", // Expo normalizes iOS HEIC to JPEG automatically
} as any);

const res = await fetch(`${BACKEND_URL}/clothing/process`, {
  method: "POST",
  headers: { Authorization: `Bearer ${session!.access_token}` },
  body: formData,
});

const { attributes } = await res.json();
```

Set `EXPO_PUBLIC_BACKEND_URL` in the frontend `.env` to point to your deployed server URL in production.
