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

    # Raw COMtrexx callType (Normal | CfIntern | CfExtern | ...), see
    # app/comtrexx/client.py for the mapping to "external"/"internal_forwarded".
    call_type: Optional[str] = Field(default=None, index=True)

    # Resolved from SiteMapping at sync time based on internal_number.
    site: Optional[str] = Field(default=None, index=True)

    synced_at: datetime = Field(default_factory=datetime.utcnow)


class SiteMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Inclusive numeric extension range, e.g. 800-899. Not a string prefix:
    # "starts with 800" would wrongly include 8000-8009 but exclude 801-899.
    range_start: int = Field(index=True)
    range_end: int
    site: str


class KnownUser(SQLModel, table=True):
    """Mirrors COMtrexx's real telephony users (GET /users: phoneNumber +
    userName), refreshed on every sync. Used to filter the Teilnehmer report
    down to actual configured people, excluding call groups (e.g. "GIE -
    alle") and raw external numbers that can otherwise show up as the
    "connected" party on a Call record."""

    phone_number: str = Field(primary_key=True)
    name: str


class AppUser(SQLModel, table=True):
    """A dashboard login account (separate from COMtrexx's own telephony
    users). The first one is seeded at startup from ADMIN_USERNAME/
    ADMIN_PASSWORD; more can be added via the Einstellungen tab."""

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


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
