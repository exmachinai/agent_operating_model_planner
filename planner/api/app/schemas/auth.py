"""Auth-Schemas — Multi-User (Registrierung, E-Mail-Bestätigung, TOTP-2FA, Admin).

`User` ist das Speicher-Dokument (Cosmos `users`, id == E-Mail klein). Geheimnisse
(`password_hash`, `totp_secret`) verlassen den Server nie Richtung Client — die
API liefert ausschließlich `UserView`.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    """Internes Speicher-Dokument eines Nutzers (mit Geheimnissen)."""

    id: str  # == email (klein) — Partition-Key + Eindeutigkeit
    email: EmailStr
    password_hash: str
    email_verified: bool = False
    totp_secret: str | None = None  # base32, pro Nutzer (bei Enrollment gesetzt)
    totp_enrolled: bool = False
    is_admin: bool = False
    disabled: bool = False
    created_at: datetime
    last_login_at: datetime | None = None


class UserView(BaseModel):
    """Öffentliche Sicht (Adminliste) — ohne Hash/Secret."""

    email: EmailStr
    email_verified: bool
    totp_enrolled: bool
    is_admin: bool
    disabled: bool
    created_at: datetime
    last_login_at: datetime | None = None

    @classmethod
    def of(cls, u: User) -> "UserView":
        return cls(
            email=u.email,
            email_verified=u.email_verified,
            totp_enrolled=u.totp_enrolled,
            is_admin=u.is_admin,
            disabled=u.disabled,
            created_at=u.created_at,
            last_login_at=u.last_login_at,
        )


# --- API-Request/Response ----------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class RegisterResponse(BaseModel):
    status: str = "verify_sent"
    # Nur im Dev-Stub-Modus gesetzt (kein echter Mailversand) — sonst None.
    verify_url: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    # "totp_enroll" (erstes Mal, mit QR) oder "totp_required".
    status: str
    otpauth_uri: str | None = None
    qr_svg: str | None = None
    issuer: str | None = None
    account: str | None = None


class UnlockRequest(BaseModel):
    email: EmailStr
    password: str
    code: str


class UnlockResponse(BaseModel):
    status: str = "ok"
    token: str
    expires_at: int
    is_admin: bool = False


class VerifyRequest(BaseModel):
    token: str


class ResendRequest(BaseModel):
    email: EmailStr


class SessionResponse(BaseModel):
    valid: bool
    email: str | None = None
    is_admin: bool = False
