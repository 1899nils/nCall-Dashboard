from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Call(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # id of the record on the COMtrexx side, used to avoid duplicate imports.
    external_id: str = Field(index=True, unique=True)

    started_at: datetime = Field(index=True)
    duration_seconds: int = 0
    direction: str = Field(index=True)  # "in" | "out" | "missed"

    internal_number: str = Field(index=True)  # Nebenstelle
    internal_name: Optional[str] = None
    external_number: Optional[str] = None
    external_name: Optional[str] = None

    # Resolved from SiteMapping at sync time based on internal_number.
    site: Optional[str] = Field(default=None, index=True)

    synced_at: datetime = Field(default_factory=datetime.utcnow)


class SiteMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Extension prefix, e.g. "10" matches internal numbers starting with "10".
    prefix: str = Field(index=True, unique=True)
    site: str


class SyncRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    status: str = "running"  # running | success | error
    records_synced: int = 0
    error_message: Optional[str] = None


class Setting(SQLModel, table=True):
    """Small key/value store, currently used for the sync watermark."""

    key: str = Field(primary_key=True)
    value: str
