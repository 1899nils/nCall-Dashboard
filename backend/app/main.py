import json
import logging
import os

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import select
from starlette.middleware.sessions import SessionMiddleware

from app.api import admin, auth, calls, sites, stats, sync
from app.auth import get_current_user, get_or_create_session_secret, seed_admin_user
from app.comtrexx.mock import site_mapping_seed
from app.config import get_settings
from app.database import init_db, session_scope
from app.models import SiteMapping
from app.scheduler import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ncall.main")

# init_db() runs at import time (not just in the startup event) because the
# session secret below is persisted in the database and has to be ready
# before SessionMiddleware is configured.
init_db()

app = FastAPI(title="nCall Dashboard")
app.add_middleware(SessionMiddleware, secret_key=get_or_create_session_secret(), same_site="lax")

_login_required = [Depends(get_current_user)]

app.include_router(auth.router)
app.include_router(calls.router, dependencies=_login_required)
app.include_router(stats.router, dependencies=_login_required)
app.include_router(sites.router, dependencies=_login_required)
app.include_router(sync.router, dependencies=_login_required)
app.include_router(admin.router, dependencies=_login_required)


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
            session.add(
                SiteMapping(range_start=entry["range_start"], range_end=entry["range_end"], site=entry["site"])
            )
        if seed:
            session.commit()


@app.on_event("startup")
def on_startup():
    _seed_site_mappings()
    seed_admin_user()
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    shutdown_scheduler()


# Serve the built frontend (see frontend/ + Dockerfile) as static files.
# Must be mounted last so it doesn't shadow the /api routes above. This is
# just the SPA shell (HTML/JS/CSS) - it contains no data, so it's fine to
# serve unauthenticated; the SPA itself shows a login form until every
# actual /api/* data call (protected above) succeeds.
_frontend_dist = os.environ.get("FRONTEND_DIST", "/app/frontend_dist")
if os.path.isdir(_frontend_dist):
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
