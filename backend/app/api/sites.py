from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import SiteMapping

router = APIRouter(prefix="/api/sites", tags=["sites"])


class SiteMappingIn(BaseModel):
    range_start: int
    range_end: int
    site: str


@router.get("")
def list_sites(session: Session = Depends(get_session)):
    return session.exec(select(SiteMapping).order_by(SiteMapping.range_start)).all()


@router.post("")
def upsert_site(payload: SiteMappingIn, session: Session = Depends(get_session)):
    if payload.range_end < payload.range_start:
        raise HTTPException(status_code=400, detail="range_end must be >= range_start")

    existing = session.exec(
        select(SiteMapping).where(SiteMapping.range_start == payload.range_start)
    ).first()
    if existing:
        existing.range_end = payload.range_end
        existing.site = payload.site
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    mapping = SiteMapping(range_start=payload.range_start, range_end=payload.range_end, site=payload.site)
    session.add(mapping)
    session.commit()
    session.refresh(mapping)
    return mapping


@router.delete("/{mapping_id}")
def delete_site(mapping_id: int, session: Session = Depends(get_session)):
    mapping = session.get(SiteMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(mapping)
    session.commit()
    return {"ok": True}
