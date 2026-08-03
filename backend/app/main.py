import json
import logging
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import select

from app.api import admin, calls, sites, stats, sync
from app.comtrexx.mock import site_mapping_seed
from app.config import get_settings
from app.database import init_db, session_scope
from app.models import SiteMapping
from app.scheduler import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ncall.main")

app = FastAPI(title="nCall Dashboard")

app.include_router(calls.router)
app.include_router(stats.router)
app.include_router(sites.router)
app.include_router(sync.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


def _seed_site_mappings() -> None:
    settings = get_settings()
    with session_scope() as session:
        existing = session.exec(select(SiteMapping)).first()
        if existing:
            return

        seed = json.loads(settings.site_mapping_seed) if settings.site_mapping_seed else []
        if not seed and settings.comtrexx_mock:
            # In demo mode, seed a plausible example mapping for 8 sites so
            # charts are meaningful out of the box.
            seed = site_mapping_seed()

        for entry in seed:
            session.add(SiteMapping(prefix=entry["prefix"], site=entry["site"]))
        if seed:
            session.commit()


@app.on_event("startup")
def on_startup():
    init_db()
    _seed_site_mappings()
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    shutdown_scheduler()


# Serve the built frontend (see frontend/ + Dockerfile) as static files.
# Must be mounted last so it doesn't shadow the /api routes above.
_frontend_dist = os.environ.get("FRONTEND_DIST", "/app/frontend_dist")
if os.path.isdir(_frontend_dist):
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
