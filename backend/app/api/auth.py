from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import get_current_user, hash_password, require_admin, verify_password
from app.database import get_session
from app.models import AppUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool


class CreateUserIn(BaseModel):
    username: str
    password: str
    is_admin: bool = False


@router.post("/login")
def login(payload: LoginIn, request: Request, session: Session = Depends(get_session)):
    user = session.exec(select(AppUser).where(AppUser.username == payload.username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Benutzername oder Passwort falsch")
    request.session["user_id"] = user.id
    return UserOut(id=user.id, username=user.username, is_admin=user.is_admin)


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"ok": True}


@router.get("/me")
def me(user: AppUser = Depends(get_current_user)):
    return UserOut(id=user.id, username=user.username, is_admin=user.is_admin)


@router.get("/users")
def list_users(session: Session = Depends(get_session), _admin: AppUser = Depends(require_admin)):
    users = session.exec(select(AppUser).order_by(AppUser.username)).all()
    return [UserOut(id=u.id, username=u.username, is_admin=u.is_admin) for u in users]


@router.post("/users")
def create_user(
    payload: CreateUserIn,
    session: Session = Depends(get_session),
    _admin: AppUser = Depends(require_admin),
):
    if not payload.username.strip() or not payload.password:
        raise HTTPException(status_code=400, detail="Benutzername und Passwort erforderlich")
    existing = session.exec(select(AppUser).where(AppUser.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
    user = AppUser(
        username=payload.username.strip(),
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserOut(id=user.id, username=user.username, is_admin=user.is_admin)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin: AppUser = Depends(require_admin),
):
    user = session.get(AppUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Der eigene Account kann nicht gelöscht werden")
    remaining_admins = session.exec(
        select(AppUser).where(AppUser.is_admin == True, AppUser.id != user_id)  # noqa: E712
    ).all()
    if user.is_admin and not remaining_admins:
        raise HTTPException(status_code=400, detail="Es muss mindestens ein Admin-Account bestehen bleiben")
    session.delete(user)
    session.commit()
    return {"ok": True}
