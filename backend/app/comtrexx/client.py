"""Client for the COMtrexx REST API (verified against COMtrexx API v0.0.37,
ctx-api-v1.yml pulled from a live system via /api/system/api).

Auth flow (see /login, /calldata, securitySchemes.cookieAuth in the spec):
1. POST {base_url}/login with HTTP Basic Auth in the Authorization header.
   The response sets a `ctx_sessionid` cookie (Max-Age ~24h).
2. Send that cookie on subsequent requests (httpx.Client does this
   automatically for requests made with the same client instance).

Call data (GET /calldata):
- Query params: UserId (optional, restricts to one user), limit, offset —
  there is NO server-side "since"/date filter, so we page through the full
  result set and filter by startDate on our side. Sync-time dedup happens
  via external_id (see app/sync.py), so re-fetching old pages is harmless.
  NOTE: on at least one observed firmware, every record's CallDataId is 0
  (not a usable unique id) — see _fallback_external_id() below, which
  fingerprints a call from its other fields instead.
- Response envelope: {"_links": {"totalCount": ..., ...}, "data": [CallData, ...]}.
- CallData fields: CallDataId, startDate, length (seconds), externalName,
  externalPhoneNumber, msn, userNumber, userName, connectedUserNumber,
  connectedUserName, groupNumber, groupName, cost, costFactor,
  direction ("Incoming"/"Outgoing"), callType, success (bool).
- callType (per the spec's enum): Normal = ordinary/direct call, CfIntern =
  forwarded to another internal extension, CfExtern = forwarded to an
  external destination (plus Voicemailbox/Faxbox/Callthrough/... edge
  cases). map_record() below labels these "external"/"internal_forwarded"/
  "external_forwarded" in the API filters (see app/api/filters.py).
"""

import hashlib
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
            verify=settings.comtrexx_verify_ssl,
            timeout=settings.comtrexx_request_timeout,
        )
        self._logged_in = False

    def close(self) -> None:
        self._client.close()

    def _login(self) -> None:
        try:
            response = self._client.post(
                self.settings.comtrexx_login_endpoint,
                auth=httpx.BasicAuth(
                    self.settings.comtrexx_username, self.settings.comtrexx_password
                ),
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise ComtrexxError(f"COMtrexx login failed: {exc}") from exc
        # Session cookie (ctx_sessionid) is now stored in self._client's cookie jar.
        self._logged_in = True

    def fetch_call_journal(self, since: datetime) -> list[dict[str, Any]]:
        """Fetch raw /calldata records with startDate >= `since`.

        Pages through the full result set (no server-side date filter is
        available) and stops once a full page comes back short.
        """
        if not self._logged_in:
            self._login()

        records: list[dict[str, Any]] = []
        offset = 0
        limit = self.settings.comtrexx_page_size

        while True:
            try:
                response = self._client.get(
                    self.settings.comtrexx_call_endpoint,
                    params={"limit": limit, "offset": offset},
                )
                if response.status_code == 401:
                    # Session expired: re-login once and retry this page.
                    self._login()
                    response = self._client.get(
                        self.settings.comtrexx_call_endpoint,
                        params={"limit": limit, "offset": offset},
                    )
                response.raise_for_status()
            except httpx.HTTPError as exc:
                raise ComtrexxError(f"COMtrexx call data request failed: {exc}") from exc

            payload = response.json()
            page = payload.get("data", []) if isinstance(payload, dict) else payload
            records.extend(page)

            if len(page) < limit:
                break
            offset += limit

        filtered = []
        for raw in records:
            started_raw = raw.get("startDate")
            if not started_raw:
                continue
            started = datetime.fromisoformat(started_raw.replace("Z", "+00:00"))
            if started.replace(tzinfo=None) >= since.replace(tzinfo=None):
                filtered.append(raw)
        return filtered


def _fallback_external_id(raw: dict[str, Any]) -> str:
    """Some COMtrexx firmware versions report CallDataId=0 for every record
    (observed in practice), which would collapse all calls onto a single
    "duplicate" after the first import. Fall back to a fingerprint of the
    fields that together identify a call uniquely enough in practice."""
    fingerprint_src = "|".join(
        str(raw.get(key, ""))
        for key in (
            "startDate", "userNumber", "connectedUserNumber",
            "externalPhoneNumber", "direction", "length",
        )
    )
    return "fp-" + hashlib.sha1(fingerprint_src.encode("utf-8")).hexdigest()


def map_record(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize a raw COMtrexx /calldata record into our Call schema."""

    direction_raw = raw.get("direction", "")
    success = raw.get("success", True)
    if direction_raw == "Incoming":
        direction = "in" if success else "missed"
    elif direction_raw == "Outgoing":
        direction = "out"
    else:
        direction = "in"

    raw_id = raw.get("CallDataId")
    external_id = str(raw_id) if raw_id not in (None, 0, "0") else _fallback_external_id(raw)

    return {
        "external_id": external_id,
        "started_at": raw.get("startDate"),
        "duration_seconds": int(raw.get("length") or 0),
        "direction": direction,
        # connectedUser* is who actually ended up on the call (relevant for
        # forwarded calls); userNumber/userName is often just the trunk/
        # billing owner (e.g. "Zentrale") and not useful for attributing the
        # call to a real person, so prefer connectedUser* and fall back.
        "internal_number": str(raw.get("connectedUserNumber") or raw.get("userNumber") or ""),
        "internal_name": raw.get("connectedUserName") or raw.get("userName"),
        "external_number": raw.get("externalPhoneNumber"),
        "external_name": raw.get("externalName"),
        "call_type": raw.get("callType"),
    }
