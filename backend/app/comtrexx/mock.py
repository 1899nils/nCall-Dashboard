"""Synthetic call data so the dashboard works out of the box without a real
COMtrexx connection (COMTREXX_MOCK=true, the default)."""

import random
import uuid
from datetime import datetime, timedelta

_SITES = [
    ("10", "Zentrale"),
    ("20", "Standort Nord"),
    ("30", "Standort Sued"),
    ("40", "Standort West"),
    ("50", "Standort Ost"),
    ("60", "Standort Mitte"),
    ("70", "Standort Lager"),
    ("80", "Standort Service"),
]

_EXTERNAL_NUMBERS = [
    "+49 30 1234567",
    "+49 40 7654321",
    "+49 89 5556677",
    "+49 221 998877",
    "+49 171 3334455",
]

_PEOPLE = [
    "Anna Meier", "Ben Krause", "Clara Voss", "David Schulz", "Eva Wagner",
    "Felix Bauer", "Greta Hoffmann", "Hannes Lang", "Ida Peters", "Jonas Weiss",
]


def site_mapping_seed() -> list[dict[str, str]]:
    return [{"prefix": prefix, "site": site} for prefix, site in _SITES]


def _person_for(extension: str) -> str:
    return _PEOPLE[int(extension) % len(_PEOPLE)]


def generate_mock_records(since: datetime, until: datetime) -> list[dict]:
    """Generate plausible /calldata records between `since` and `until`,
    shaped exactly like the real COMtrexx API response (see client.py) so
    the same map_record() handles both mock and real data."""
    # Cap the range so a full backfill (since=year 2000) or a misconfigured
    # SYNC_LOOKBACK_DAYS doesn't generate years of hourly records.
    earliest = until - timedelta(days=60)
    if since < earliest:
        since = earliest

    records = []
    current = since
    while current < until:
        # Skip most of the night, a handful of calls per business hour.
        if 7 <= current.hour <= 19 and current.weekday() < 5:
            for _ in range(random.randint(0, 4)):
                prefix, _ = random.choice(_SITES)
                extension = prefix + str(random.randint(1, 9))
                outcome = random.choices(["in", "out", "missed"], weights=[45, 45, 10])[0]
                started = current + timedelta(minutes=random.randint(0, 59))
                duration = 0 if outcome == "missed" else random.randint(15, 900)

                connected_extension = extension
                call_type = "Normal"
                if outcome == "in":
                    call_type = random.choices(
                        ["Normal", "CfIntern", "CfExtern"], weights=[80, 15, 5]
                    )[0]
                    if call_type == "CfIntern":
                        # Forwarded to a colleague at the same site.
                        connected_extension = prefix + str(random.randint(1, 9))

                records.append(
                    {
                        "CallDataId": str(uuid.uuid4()),
                        "startDate": started.isoformat(),
                        "length": duration,
                        "direction": "Outgoing" if outcome == "out" else "Incoming",
                        "success": outcome != "missed",
                        "callType": call_type,
                        "userNumber": extension,
                        "userName": "Zentrale" if outcome != "out" else _person_for(extension),
                        "connectedUserNumber": connected_extension,
                        "connectedUserName": _person_for(connected_extension),
                        "externalPhoneNumber": random.choice(_EXTERNAL_NUMBERS),
                        "externalName": None,
                    }
                )
        current += timedelta(hours=1)
    return records
