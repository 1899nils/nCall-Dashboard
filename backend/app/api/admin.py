from fastapi import APIRouter, Depends
from sqlmodel import Session, delete

from app.database import get_session
from app.models import Call, Setting, SyncRun
from app.sync import WATERMARK_KEY

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/reset")
def reset_data(session: Session = Depends(get_session)):
    """Wipe all imported calls, sync history and the sync watermark.

    Site mappings (Standort-Zuordnung) are left untouched. Use this after
    testing in mock mode, before/after reconfiguring site mappings, or
    ahead of a fresh full backfill.
    """
    session.exec(delete(Call))
    session.exec(delete(SyncRun))
    watermark = session.get(Setting, WATERMARK_KEY)
    if watermark:
        session.delete(watermark)
    session.commit()
    return {"ok": True}
