"""Multi-User-Auth — Registrierung, E-Mail-Bestätigung (Magic-Link), TOTP-2FA, Admin.

Flow:
  1. POST /register {email, password}  → Konto (unbestätigt), Magic-Link versendet.
  2. POST /verify {token}              → E-Mail bestätigt (Link-Ziel der Mail).
  3. POST /login {email, password}     → Faktor 1; liefert TOTP-Enrollment (QR) beim
                                         ersten Mal, danach „totp_required".
  4. POST /unlock {email,password,code} → Faktor 1+2 → signiertes Session-Token.
  5. GET  /session  (Bearer)           → „noch angemeldet?" inkl. is_admin.
  6. /admin/*  (Bearer, nur Admin)     → Nutzerverwaltung.

Passwörter werden PBKDF2-gehasht gespeichert; TOTP-Secret pro Nutzer (Enrollment
per QR). Geheimnisse verlassen den Server nie Richtung Client.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import EmailStr

from ..auth import email as email_svc
from ..auth import security
from ..config import get_settings
from ..db.users_repo import get_users_repo
from ..schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ResendRequest,
    SessionResponse,
    UnlockRequest,
    UnlockResponse,
    User,
    UserView,
    VerifyRequest,
)

logger = logging.getLogger("aegira.planner.api.auth")
router = APIRouter()


def _norm(email: str) -> str:
    return email.strip().lower()


def _is_admin_email(email: str) -> bool:
    return _norm(email) == _norm(get_settings().auth_admin_email)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _issue_verify(user: User) -> str | None:
    """Erzeugt einen Magic-Link-Token und „versendet" ihn (Stub gibt Link zurück)."""
    s = get_settings()
    token, _ = security.issue_token(
        {"sub": user.email, "purpose": "verify"}, secret=s.auth_session_secret, ttl_sec=s.auth_verify_ttl_sec
    )
    return email_svc.send_verification(user.email, email_svc.build_verify_link(token))


# --- Registrierung & Bestätigung ---------------------------------------------


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest) -> RegisterResponse:
    repo = get_users_repo()
    email = _norm(body.email)
    existing = await repo.get(email)
    if existing and existing.email_verified:
        raise HTTPException(status_code=409, detail="Diese E-Mail ist bereits registriert.")
    # Neu anlegen oder unbestätigtes Konto mit neuem Passwort/Link auffrischen.
    user = User(
        id=email,
        email=email,
        password_hash=security.hash_password(body.password),
        email_verified=False,
        is_admin=_is_admin_email(email),
        created_at=existing.created_at if existing else _now(),
    )
    await repo.upsert(user)
    verify_url = await _issue_verify(user)
    logger.info("registered (unverified) %s", email)
    return RegisterResponse(verify_url=verify_url)


@router.post("/verify")
async def verify_email(body: VerifyRequest) -> dict:
    s = get_settings()
    data = security.verify_token(body.token, secret=s.auth_session_secret)
    if not data or data.get("purpose") != "verify":
        raise HTTPException(status_code=400, detail="Der Bestätigungslink ist ungültig oder abgelaufen.")
    repo = get_users_repo()
    user = await repo.get(str(data.get("sub", "")))
    if user is None:
        raise HTTPException(status_code=404, detail="Konto nicht gefunden.")
    if not user.email_verified:
        await repo.upsert(user.model_copy(update={"email_verified": True}))
    return {"status": "verified", "email": user.email}


@router.post("/resend")
async def resend(body: ResendRequest) -> dict:
    repo = get_users_repo()
    user = await repo.get(_norm(body.email))
    # Kein Account-Enumeration-Leak: immer „ok", Link nur wenn vorhanden+unbestätigt.
    verify_url = None
    if user and not user.email_verified:
        verify_url = await _issue_verify(user)
    return {"status": "ok", "verify_url": verify_url}


# --- Login (Faktor 1) + Unlock (Faktor 1+2) ----------------------------------


async def _require_loginable(email: str, password: str) -> User:
    """Prüft Existenz/Sperre/Passwort/Bestätigung. Wirft 401/403."""
    repo = get_users_repo()
    user = await repo.get(_norm(email))
    # Passwort immer prüfen (auch ohne User) → kein Timing-/Enumeration-Leak.
    ref_hash = user.password_hash if user else security.hash_password("x")
    pw_ok = security.verify_password(password, ref_hash)
    if user is None or not pw_ok:
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort ist falsch.")
    if user.disabled:
        raise HTTPException(status_code=403, detail="Dieses Konto ist gesperrt.")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Bitte zuerst die E-Mail-Adresse bestätigen.")
    return user


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    user = await _require_loginable(body.email, body.password)
    s = get_settings()
    repo = get_users_repo()
    # TOTP-Secret beim ersten Login erzeugen + speichern (Enrollment offen).
    if not user.totp_secret:
        secret = security.generate_totp_secret()
        user = user.model_copy(update={"totp_secret": security.secret_base32(secret)})
        await repo.upsert(user)
    if not user.totp_enrolled:
        sec = security.secret_from_base32(user.totp_secret)
        uri = security.otpauth_uri(sec, email=user.email, issuer=s.auth_totp_issuer)
        return LoginResponse(
            status="totp_enroll",
            otpauth_uri=uri,
            qr_svg=security.qr_svg_data_uri(uri),
            issuer=s.auth_totp_issuer,
            account=user.email,
        )
    return LoginResponse(status="totp_required")


@router.post("/unlock", response_model=UnlockResponse)
async def unlock(body: UnlockRequest) -> UnlockResponse:
    user = await _require_loginable(body.email, body.password)
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Bitte zuerst den Login starten (2FA-Einrichtung).")
    if not security.verify_totp(security.secret_from_base32(user.totp_secret), body.code):
        raise HTTPException(status_code=401, detail="Der 2FA-Code stimmt nicht (oder ist abgelaufen).")
    s = get_settings()
    repo = get_users_repo()
    await repo.upsert(user.model_copy(update={"totp_enrolled": True, "last_login_at": _now()}))
    token, exp = security.issue_session(
        user.email, secret=s.auth_session_secret, ttl_sec=s.auth_session_ttl_sec
    )
    logger.info("login ok %s", user.email)
    return UnlockResponse(token=token, expires_at=exp, is_admin=user.is_admin)


@router.get("/session", response_model=SessionResponse)
async def session(authorization: str | None = Header(default=None)) -> SessionResponse:
    user = await _user_from_bearer(authorization)
    if user is None:
        return SessionResponse(valid=False)
    return SessionResponse(valid=True, email=user.email, is_admin=user.is_admin)


# --- Adminbereich (nur konfigurierter Admin) ---------------------------------


async def _user_from_bearer(authorization: str | None) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    email = security.verify_session(token, secret=get_settings().auth_session_secret)
    if not email:
        return None
    user = await get_users_repo().get(email)
    if user is None or user.disabled:
        return None
    return user


async def require_admin(authorization: str | None = Header(default=None)) -> User:
    user = await _user_from_bearer(authorization)
    if user is None or not user.is_admin:
        raise HTTPException(status_code=403, detail="Adminrechte erforderlich.")
    return user


@router.get("/admin/users", response_model=list[UserView])
async def admin_list_users(_admin: User = Depends(require_admin)) -> list[UserView]:
    users = await get_users_repo().list()
    users.sort(key=lambda u: u.created_at)
    return [UserView.of(u) for u in users]


async def _admin_target(email: EmailStr, admin: User) -> User:
    repo = get_users_repo()
    user = await repo.get(_norm(email))
    if user is None:
        raise HTTPException(status_code=404, detail="Nutzer nicht gefunden.")
    return user


@router.post("/admin/users/{email}/disable", response_model=UserView)
async def admin_disable(email: EmailStr, admin: User = Depends(require_admin)) -> UserView:
    if _norm(email) == _norm(admin.email):
        raise HTTPException(status_code=400, detail="Der eigene Admin-Account kann nicht gesperrt werden.")
    user = await _admin_target(email, admin)
    user = user.model_copy(update={"disabled": True})
    await get_users_repo().upsert(user)
    return UserView.of(user)


@router.post("/admin/users/{email}/enable", response_model=UserView)
async def admin_enable(email: EmailStr, admin: User = Depends(require_admin)) -> UserView:
    user = await _admin_target(email, admin)
    user = user.model_copy(update={"disabled": False})
    await get_users_repo().upsert(user)
    return UserView.of(user)


@router.post("/admin/users/{email}/reset-2fa", response_model=UserView)
async def admin_reset_2fa(email: EmailStr, admin: User = Depends(require_admin)) -> UserView:
    """Setzt die 2FA zurück — der Nutzer richtet beim nächsten Login neu ein."""
    user = await _admin_target(email, admin)
    user = user.model_copy(update={"totp_secret": None, "totp_enrolled": False})
    await get_users_repo().upsert(user)
    return UserView.of(user)


@router.delete("/admin/users/{email}")
async def admin_delete(email: EmailStr, admin: User = Depends(require_admin)) -> dict:
    if _norm(email) == _norm(admin.email):
        raise HTTPException(status_code=400, detail="Der eigene Admin-Account kann nicht gelöscht werden.")
    ok = await get_users_repo().delete(_norm(email))
    if not ok:
        raise HTTPException(status_code=404, detail="Nutzer nicht gefunden.")
    return {"status": "deleted", "email": _norm(email)}
