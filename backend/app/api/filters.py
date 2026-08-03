from datetime import date, datetime, time
from typing import Optional

from app.models import Call

# Friendly call-type filter keys -> raw COMtrexx callType values (see
# app/comtrexx/client.py for how these are derived from the API).
CALL_TYPE_MAP = {
    "external": ["Normal"],
    "internal_forwarded": ["CfIntern"],
    "external_forwarded": ["CfExtern"],
}

SERVICE_SEGMENTS = ("business", "off_hours", "weekend")


def apply_call_filters(
    statement,
    date_from: Optional[date],
    date_to: Optional[date],
    site: Optional[list[str]],
    direction: Optional[list[str]],
    extension: Optional[str],
    number: Optional[str],
    min_duration: Optional[int],
    call_type: Optional[list[str]] = None,
):
    if date_from:
        statement = statement.where(Call.started_at >= datetime.combine(date_from, time.min))
    if date_to:
        statement = statement.where(Call.started_at <= datetime.combine(date_to, time.max))
    if site:
        statement = statement.where(Call.site.in_(site))
    if direction:
        statement = statement.where(Call.direction.in_(direction))
    if extension:
        statement = statement.where(Call.internal_number.contains(extension))
    if number:
        statement = statement.where(Call.external_number.contains(number))
    if min_duration is not None:
        statement = statement.where(Call.duration_seconds >= min_duration)
    if call_type:
        raw_values = [v for key in call_type for v in CALL_TYPE_MAP.get(key, [])]
        statement = statement.where(Call.call_type.in_(raw_values))
    return statement


def matches_service_segment(call: Call, segment: str) -> bool:
    weekday = call.started_at.weekday()  # Mon=0 ... Sun=6
    hour = call.started_at.hour
    if segment == "weekend":
        return weekday >= 5
    if segment == "business":
        return weekday <= 4 and 8 <= hour < 17
    if segment == "off_hours":
        return weekday <= 4 and not (8 <= hour < 17)
    return True


def filter_by_service_segments(calls: list[Call], segments: Optional[list[str]]) -> list[Call]:
    if not segments:
        return calls
    return [c for c in calls if any(matches_service_segment(c, s) for s in segments)]
