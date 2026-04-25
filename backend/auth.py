# FastAPI dependency that validates a Supabase-issued JWT and returns the user's ID.
#
# Modern Supabase projects (those using sb_publishable_* API keys) sign user session
# JWTs with ES256 — an asymmetric algorithm. Rather than sharing a secret, Supabase
# publishes its public keys at /.well-known/jwks.json. We fetch those keys once,
# cache them for 10 minutes, and use them to verify incoming tokens locally with no
# round-trip to Supabase on every request.
#
# Why not the legacy HS256 secret?
#   The legacy JWT secret only works for projects still on symmetric signing. New
#   projects with sb_publishable_* keys issue ES256 session tokens — decoding those
#   with the HS256 secret will always fail.
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings

# Tells FastAPI to expect `Authorization: Bearer <token>` on incoming requests.
bearer_scheme = HTTPBearer()

# PyJWKClient fetches and caches the public keys from Supabase's JWKS endpoint.
# lifespan=600 means keys are re-fetched every 10 minutes, which handles key
# rotation without restarting the server.
_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
    cache_jwk_set=True,
    lifespan=600,
)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    token = credentials.credentials
    try:
        # Resolve the correct public key for this specific token (identified by `kid`
        # in the JWT header). Supabase may have multiple active signing keys during
        # a rotation, and PyJWKClient picks the right one automatically.
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            # Accept both ES256 (modern Supabase) and RS256/HS256 as fallbacks.
            algorithms=["ES256", "RS256", "HS256"],
            # Supabase sets `aud` to "authenticated" for user session tokens, but
            # the value can vary — skip verification to avoid false 401s.
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    # `sub` is the Supabase user UUID — present in every valid session token.
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing user ID in token")

    return user_id
