from datetime import date, datetime, time
from typing import Optional

from app.models import Call


def apply_call_filters(
    statement,
    date_from: Optional[date],
    date_to: Optional[date],
    site: Optional[list[str]],
    direction: Optional[list[str]],
    extension: Optional[str],
    number: Optional[str],
    min_duration: Optional[int],
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
    return statement
