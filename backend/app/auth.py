import secrets

import bcrypt
from fastapi import Depends, HTTPException, Request
from sqlmodel import Session, select

from app.config import get_settings
from app.database import session_scope
from app.models import AppUser, Setting

SESSION_SECRET_KEY = "session_secret"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def get_or_create_session_secret() -> str:
    settings = get_settings()
    if settings.session_secret:
        return settings.session_secret

    with session_scope() as session:
        row = session.get(Setting, SESSION_SECRET_KEY)
        if row:
            return row.value
        secret = secrets.token_hex(32)
        session.add(Setting(key=SESSION_SECRET_KEY, value=secret))
        session.commit()
        return secret


def seed_admin_user() -> None:
    """Create the first login account from ADMIN_USERNAME/ADMIN_PASSWORD if
    no AppUser exists yet. Safe to call on every startup."""
    settings = get_settings()
    with session_scope() as session:
        existing = session.exec(select(AppUser)).first()
        if existing or not settings.admin_password:
            return
        session.add(
            AppUser(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
                is_admin=True,
            )
        )
        session.commit()


def get_current_user(request: Request) -> AppUser:
    user_id = request.session.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with session_scope() as session:
        user = session.get(AppUser, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_admin(user: AppUser = Depends(get_current_user)) -> AppUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin rights required")
    return user
