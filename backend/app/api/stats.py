from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.api.filters import apply_call_filters
from app.database import get_session
from app.models import Call

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary")
def summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    site: Optional[list[str]] = Query(default=None),
    direction: Optional[list[str]] = Query(default=None),
    extension: Optional[str] = None,
    number: Optional[str] = None,
    min_duration: Optional[int] = None,
    session: Session = Depends(get_session),
):
    base = select(Call)
    base = apply_call_filters(base, date_from, date_to, site, direction, extension, number, min_duration)
    calls = session.exec(base).all()

    total_calls = len(calls)
    missed_calls = sum(1 for c in calls if c.direction == "missed")
    answered = [c for c in calls if c.duration_seconds > 0]
    avg_duration = round(sum(c.duration_seconds for c in answered) / len(answered), 1) if answered else 0

    per_day: dict[str, int] = {}
    per_site: dict[str, int] = {}
    per_number: dict[str, int] = {}
    for c in calls:
        day_key = c.started_at.date().isoformat()
        per_day[day_key] = per_day.get(day_key, 0) + 1
        site_key = c.site or "Nicht zugeordnet"
        per_site[site_key] = per_site.get(site_key, 0) + 1
        if c.external_number:
            per_number[c.external_number] = per_number.get(c.external_number, 0) + 1

    calls_per_day = [{"date": d, "count": n} for d, n in sorted(per_day.items())]
    calls_per_site = [{"site": s, "count": n} for s, n in sorted(per_site.items(), key=lambda x: -x[1])]
    top_numbers = sorted(
        [{"number": num, "count": n} for num, n in per_number.items()], key=lambda x: -x["count"]
    )[:10]

    return {
        "total_calls": total_calls,
        "missed_calls": missed_calls,
        "avg_duration_seconds": avg_duration,
        "calls_per_day": calls_per_day,
        "calls_per_site": calls_per_site,
        "top_numbers": top_numbers,
    }
