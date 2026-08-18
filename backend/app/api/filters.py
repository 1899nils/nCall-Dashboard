from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import and_, or_

from app.models import Call

SERVICE_SEGMENTS = ("business", "off_hours", "weekend", "opening_hours", "closed_hours")

# Real opening hours: Mo-Sa 10-18, Fr 10-20, closed Sunday.
def _within_opening_hours(weekday: int, hour: int) -> bool:
    if weekday == 6:  # Sunday
        return False
    if weekday == 4:  # Friday
        return 10 <= hour < 20
    return 10 <= hour < 18  # Mon-Thu + Saturday


def _call_type_clause(key: str):
    """Friendly Anruftyp filter -> SQL clause.

    COMtrexx's callType only distinguishes forwarding (CfIntern/CfExtern);
    a plain "Normal" call is used for BOTH a genuine external call and a
    purely internal one (colleague calling colleague, no external number
    involved at all). Tell those two apart by whether external_number is
    set, rather than by callType alone.
    """
    no_external_number = or_(Call.external_number.is_(None), Call.external_number == "")
    has_external_number = and_(Call.external_number.isnot(None), Call.external_number != "")
    if key == "external":
        return and_(Call.call_type == "Normal", has_external_number)
    if key == "internal":
        return and_(Call.call_type == "Normal", no_external_number)
    if key == "internal_forwarded":
        return Call.call_type == "CfIntern"
    if key == "external_forwarded":
        return Call.call_type == "CfExtern"
    return None


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
        clauses = [c for c in (_call_type_clause(key) for key in call_type) if c is not None]
        if clauses:
            statement = statement.where(or_(*clauses))
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
    if segment == "opening_hours":
        return _within_opening_hours(weekday, hour)
    if segment == "closed_hours":
        return not _within_opening_hours(weekday, hour)
    return True


def filter_by_service_segments(calls: list[Call], segments: Optional[list[str]]) -> list[Call]:
    if not segments:
        return calls
    return [c for c in calls if any(matches_service_segment(c, s) for s in segments)]
