from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import SyncRun
from app.sync import run_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status")
def status(session: Session = Depends(get_session)):
    runs = session.exec(select(SyncRun).order_by(SyncRun.started_at.desc()).limit(10)).all()
    return {
        "last_run": runs[0] if runs else None,
        "recent_runs": runs,
    }


@router.post("/run")
def trigger_sync():
    run = run_sync()
    return run
