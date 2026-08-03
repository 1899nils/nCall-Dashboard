from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    # COMtrexx connection
    comtrexx_base_url: str = ""
    comtrexx_username: str = ""
    comtrexx_password: str = ""
    comtrexx_verify_ssl: bool = True
    # Path of the call-journal endpoint on the COMtrexx REST API. Verify this
    # against the box's own OpenAPI spec (https://<comtrexx-ip>/api/system/api)
    # before going live — Auerswald does not publish it outside that spec.
    comtrexx_call_endpoint: str = "/api/v1/callJournal"
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
