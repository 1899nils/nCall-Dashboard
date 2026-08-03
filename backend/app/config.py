from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # COMtrexx connection. base_url should include the API version path,
    # e.g. "https://192.168.0.10/api/v1" (verified against COMtrexx API
    # v0.0.37's own ctx-api-v1.yml, downloaded from a live system via
    # /api/system/api).
    comtrexx_base_url: str = ""
    comtrexx_username: str = ""
    comtrexx_password: str = ""
    comtrexx_verify_ssl: bool = True
    comtrexx_login_endpoint: str = "/login"
    comtrexx_call_endpoint: str = "/calldata"
    comtrexx_users_endpoint: str = "/users"
    comtrexx_page_size: int = 500
    comtrexx_request_timeout: float = 30.0

    # Demo/mock mode: generates synthetic call data instead of calling a real
    # COMtrexx. Enabled by default so the dashboard is usable out of the box.
    comtrexx_mock: bool = True

    # Scheduler
    tz: str = "UTC"  # e.g. "Europe/Berlin" — the SYNC_CRON below is evaluated in this timezone
    sync_cron: str = "15 0 * * *"  # daily at 00:15
    sync_lookback_days: int = 2  # initial backfill window on first run

    # Storage
    database_path: str = "/data/ncall.db"

    # Optional seed for extension→site mapping, JSON list of
    # {"range_start": 800, "range_end": 899, "site": "Standort Nord"}
    # objects (inclusive numeric extension range).
    site_mapping_seed: str = "[]"

    # Dashboard login. The first admin account is created at startup from
    # these two if no AppUser exists yet; further users can then be added
    # from the Einstellungen tab. Leave ADMIN_PASSWORD empty to skip
    # creating an account (e.g. once one already exists).
    admin_username: str = "admin"
    admin_password: str = ""

    # Signs the login session cookie. Leave empty to auto-generate one on
    # first start and persist it in the database (see app/auth.py) — set
    # explicitly only if you need sessions to survive a fresh database.
    session_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
