# Loads environment variables from a .env file and exposes them as typed attributes.
# Every module that needs a secret should import `settings` from here — never read
# os.environ directly — so all required keys are validated at startup.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Your Anthropic API key — found at console.anthropic.com
    anthropic_api_key: str
    # Your Supabase project URL — found at Supabase dashboard > Project Settings > API
    # Used to build the JWKS endpoint: {supabase_url}/auth/v1/.well-known/jwks.json
    supabase_url: str


settings = Settings()
