import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings
from app.sync import run_sync

logger = logging.getLogger("ncall.scheduler")

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    settings = get_settings()
    tz = ZoneInfo(settings.tz)

    scheduler = BackgroundScheduler(timezone=tz)
    trigger = CronTrigger.from_crontab(settings.sync_cron, timezone=tz)
    scheduler.add_job(run_sync, trigger=trigger, id="daily_call_sync", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started, sync cron=%s", settings.sync_cron)

    _scheduler = scheduler
    return scheduler


def shutdown_scheduler() -> None:
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
