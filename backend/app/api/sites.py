from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import SiteMapping

router = APIRouter(prefix="/api/sites", tags=["sites"])


class SiteMappingIn(BaseModel):
    prefix: str
    site: str


@router.get("")
def list_sites(session: Session = Depends(get_session)):
    return session.exec(select(SiteMapping).order_by(SiteMapping.prefix)).all()


@router.post("")
def upsert_site(payload: SiteMappingIn, session: Session = Depends(get_session)):
    existing = session.exec(select(SiteMapping).where(SiteMapping.prefix == payload.prefix)).first()
    if existing:
        existing.site = payload.site
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    mapping = SiteMapping(prefix=payload.prefix, site=payload.site)
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
