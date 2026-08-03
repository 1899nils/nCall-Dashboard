import logging
from datetime import datetime, timedelta

from dateutil import parser as dateutil_parser
from sqlmodel import Session, select

from app.comtrexx import mock as comtrexx_mock
from app.comtrexx.client import ComtrexxClient, ComtrexxError, map_record
from app.config import Settings, get_settings
from app.database import session_scope
from app.models import Call, SiteMapping, Setting, SyncRun

logger = logging.getLogger("ncall.sync")

WATERMARK_KEY = "last_sync_until"
# Used for a full backfill (ignores the stored watermark): far enough back
# that it predates any COMtrexx call history still retained by the PBX.
EPOCH = datetime(2000, 1, 1)


def _get_watermark(session: Session, settings: Settings) -> datetime:
    row = session.get(Setting, WATERMARK_KEY)
    if row:
        return dateutil_parser.isoparse(row.value)
    return datetime.utcnow() - timedelta(days=settings.sync_lookback_days)


def _set_watermark(session: Session, value: datetime) -> None:
    row = session.get(Setting, WATERMARK_KEY)
    if row:
        row.value = value.isoformat()
    else:
        row = Setting(key=WATERMARK_KEY, value=value.isoformat())
    session.add(row)


def _resolve_site(session: Session, internal_number: str) -> str | None:
    mappings = session.exec(select(SiteMapping)).all()
    best: SiteMapping | None = None
    for m in mappings:
        if internal_number.startswith(m.prefix):
            if best is None or len(m.prefix) > len(best.prefix):
                best = m
    return best.site if best else None


def run_sync(full: bool = False) -> SyncRun:
    """Run a sync. With full=True, ignore the stored watermark and fetch
    everything COMtrexx still has on record (for an initial/retroactive
    backfill), then advance the watermark to now as usual."""
    settings = get_settings()
    with session_scope() as session:
        run = SyncRun(status="running")
        session.add(run)
        session.commit()
        session.refresh(run)

        since = EPOCH if full else _get_watermark(session, settings)
        until = datetime.utcnow()
        records_synced = 0

        try:
            if settings.comtrexx_mock:
                raw_records = comtrexx_mock.generate_mock_records(since, until)
            else:
                client = ComtrexxClient(settings)
                try:
                    raw_records = client.fetch_call_journal(since)
                finally:
                    client.close()

            for raw in raw_records:
                mapped = map_record(raw)
                if not mapped.get("external_id") or not mapped.get("started_at"):
                    continue

                started_at = mapped["started_at"]
                if isinstance(started_at, str):
                    started_at = dateutil_parser.isoparse(started_at)

                existing = session.exec(
                    select(Call).where(Call.external_id == mapped["external_id"])
                ).first()
                if existing:
                    continue

                site = _resolve_site(session, mapped["internal_number"])
                call = Call(
                    external_id=mapped["external_id"],
                    started_at=started_at,
                    duration_seconds=mapped["duration_seconds"],
                    direction=mapped["direction"],
                    internal_number=mapped["internal_number"],
                    internal_name=mapped.get("internal_name"),
                    external_number=mapped.get("external_number"),
                    external_name=mapped.get("external_name"),
                    call_type=mapped.get("call_type"),
                    site=site,
                )
                session.add(call)
                records_synced += 1

            _set_watermark(session, until)
            run.status = "success"
            run.records_synced = records_synced
        except ComtrexxError as exc:
            logger.exception("COMtrexx sync failed")
            run.status = "error"
            run.error_message = str(exc)
        except Exception as exc:  # noqa: BLE001 - surface any failure on the run record
            logger.exception("Unexpected sync failure")
            run.status = "error"
            run.error_message = str(exc)
        finally:
            run.finished_at = datetime.utcnow()
            session.add(run)
            session.commit()
            session.refresh(run)

        return run
