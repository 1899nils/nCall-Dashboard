from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.api.filters import apply_call_filters, filter_by_service_segments
from app.database import get_session
from app.models import Call, KnownUser

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _fetch_filtered_calls(
    session: Session,
    date_from: Optional[date],
    date_to: Optional[date],
    site: Optional[list[str]],
    direction: Optional[list[str]],
    extension: Optional[str],
    number: Optional[str],
    min_duration: Optional[int],
    call_type: Optional[list[str]],
    service_segment: Optional[list[str]],
) -> list[Call]:
    base = select(Call)
    base = apply_call_filters(
        base, date_from, date_to, site, direction, extension, number, min_duration, call_type
    )
    calls = session.exec(base).all()
    return filter_by_service_segments(calls, service_segment)


@router.get("/summary")
def summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    site: Optional[list[str]] = Query(default=None),
    direction: Optional[list[str]] = Query(default=None),
    call_type: Optional[list[str]] = Query(default=None),
    service_segment: Optional[list[str]] = Query(default=None),
    extension: Optional[str] = None,
    number: Optional[str] = None,
    min_duration: Optional[int] = None,
    session: Session = Depends(get_session),
):
    calls = _fetch_filtered_calls(
        session, date_from, date_to, site, direction, extension, number, min_duration,
        call_type, service_segment,
    )

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


@router.get("/participants")
def participants(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    site: Optional[list[str]] = Query(default=None),
    direction: Optional[list[str]] = Query(default=None),
    call_type: Optional[list[str]] = Query(default=None),
    service_segment: Optional[list[str]] = Query(default=None),
    extension: Optional[str] = None,
    number: Optional[str] = None,
    min_duration: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """Per-Teilnehmer (Tn-Name real) Auswertung of the currently filtered
    calls: Anzahl, Anteil %, Gesamtzeit, Ø Dauer. Mirrors the manual
    per-agent PDF report, but live and filterable (Standort, Richtung,
    Anruftyp, Servicezeit, Zeitraum).

    Only counts calls whose internal_number belongs to a real, configured
    COMtrexx user (refreshed from GET /users on every sync) — otherwise
    call groups (e.g. "GIE - alle") and, for externally forwarded calls,
    raw external numbers would show up as "participants" too.
    """
    calls = _fetch_filtered_calls(
        session, date_from, date_to, site, direction, extension, number, min_duration,
        call_type, service_segment,
    )

    known_numbers = set(session.exec(select(KnownUser.phone_number)).all())
    if known_numbers:
        calls = [c for c in calls if c.internal_number in known_numbers]

    by_name: dict[str, list[Call]] = {}
    for c in calls:
        name = c.internal_name or c.internal_number or "Unbekannt"
        by_name.setdefault(name, []).append(c)

    total = len(calls)
    rows = []
    for name, group in by_name.items():
        count = len(group)
        total_duration = sum(c.duration_seconds for c in group)
        rows.append(
            {
                "name": name,
                "count": count,
                "share_percent": round(count / total * 100, 1) if total else 0,
                "total_duration_seconds": total_duration,
                "avg_duration_seconds": round(total_duration / count, 1) if count else 0,
            }
        )
    rows.sort(key=lambda r: -r["count"])

    return {"total": total, "participants": rows}
