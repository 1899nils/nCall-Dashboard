"""Client for the COMtrexx REST API.

The exact endpoint path, query parameters and payload shape for the call
journal are NOT publicly documented by Auerswald outside the OpenAPI spec
that a given COMtrexx exposes itself. Before pointing this at a real system:

1. Log into the COMtrexx web UI as admin.
2. Open https://<comtrexx-ip>/api/system/api to download the current
   ctx-api-v1.yml for your firmware version.
3. Find the call-journal / call-log endpoint and its field names.
4. Adjust COMTREXX_CALL_ENDPOINT (env var) and `_map_record()` below to match.

Until that's done, run with COMTREXX_MOCK=true (the default) to develop and
demo against synthetic data with the same shape.
"""

from datetime import datetime
from typing import Any

import httpx

from app.config import Settings


class ComtrexxError(RuntimeError):
    pass


class ComtrexxClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = httpx.Client(
            base_url=settings.comtrexx_base_url,
            auth=(settings.comtrexx_username, settings.comtrexx_password),
            verify=settings.comtrexx_verify_ssl,
            timeout=settings.comtrexx_request_timeout,
        )

    def close(self) -> None:
        self._client.close()

    def fetch_call_journal(self, since: datetime) -> list[dict[str, Any]]:
        """Fetch raw call journal records created at/after `since`."""
        try:
            response = self._client.get(
                self.settings.comtrexx_call_endpoint,
                params={"since": since.isoformat()},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ComtrexxError(f"COMtrexx call journal request failed: {exc}") from exc

        payload = response.json()
        # Some REST APIs wrap the list in an envelope (e.g. {"items": [...]});
        # handle both a bare list and a common envelope key.
        if isinstance(payload, dict):
            for key in ("items", "results", "data", "callJournal"):
                if key in payload and isinstance(payload[key], list):
                    return payload[key]
            return []
        return payload


def map_record(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw COMtrexx call-journal record into our Call schema.

    Field names below are best-guess placeholders based on typical CDR
    payloads and must be verified/adjusted against a real response.
    """

    def pick(*keys: str, default=None):
        for key in keys:
            if key in raw and raw[key] not in (None, ""):
                return raw[key]
        return default

    direction_raw = str(pick("direction", "callDirection", default="")).lower()
    if "in" in direction_raw:
        direction = "missed" if pick("missed", "wasMissed", default=False) else "in"
    elif "out" in direction_raw:
        direction = "out"
    else:
        direction = "in"

    return {
        "external_id": str(pick("id", "callId", "uuid")),
        "started_at": pick("startTime", "timestamp", "date"),
        "duration_seconds": int(pick("duration", "durationSeconds", default=0) or 0),
        "direction": direction,
        "internal_number": str(pick("extension", "internalNumber", "user", default="")),
        "internal_name": pick("internalName", "userName"),
        "external_number": pick("externalNumber", "remoteNumber", "phoneNumber"),
        "external_name": pick("externalName", "remoteName", "contactName"),
    }
