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
    # {"prefix": "1", "site": "Standort Nord"} objects. Prefix matches the
    # start of the internal extension number.
    site_mapping_seed: str = "[]"


@lru_cache
def get_settings() -> Settings:
    return Settings()
