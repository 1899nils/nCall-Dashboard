from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, func, select

from app.api.filters import apply_call_filters, filter_by_service_segments
from app.database import get_session
from app.models import Call

router = APIRouter(prefix="/api/calls", tags=["calls"])


@router.get("")
def list_calls(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    site: Optional[list[str]] = Query(default=None),
    direction: Optional[list[str]] = Query(default=None),
    call_type: Optional[list[str]] = Query(default=None),
    service_segment: Optional[list[str]] = Query(default=None),
    extension: Optional[str] = None,
    number: Optional[str] = None,
    min_duration: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_session),
):
    base = select(Call)
    base = apply_call_filters(
        base, date_from, date_to, site, direction, extension, number, min_duration, call_type
    )

    if service_segment:
        # No SQL-portable weekday/hour filter here, so fetch everything that
        # matches the other filters and paginate in Python. Fine at the data
        # volumes this dashboard deals with.
        all_items = session.exec(base.order_by(Call.started_at.desc())).all()
        all_items = filter_by_service_segments(all_items, service_segment)
        total = len(all_items)
        items = all_items[(page - 1) * page_size : (page - 1) * page_size + page_size]
    else:
        total = session.exec(select(func.count()).select_from(base.subquery())).one()
        items = session.exec(
            base.order_by(Call.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
        ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
