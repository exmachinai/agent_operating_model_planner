"""Multi-User-Auth — Registrierung, Magic-Link-Bestätigung, Login+TOTP, Admin.

Plus die Krypto-Primitive (PBKDF2, RFC-6238-TOTP, signierte Token).
"""

from __future__ import annotations

import re

from fastapi.testclient import TestClient

from app.auth import security


# --- Primitive ---------------------------------------------------------------


def test_password_hash_roundtrip() -> None:
    h = security.hash_password("Demo2026#")
    assert h.startswith("pbkdf2_sha256$")
    assert security.verify_password("Demo2026#", h)
    assert not security.verify_password("falsch", h)


def test_totp_rfc6238_known_vector() -> None:
    assert security.totp_now(b"12345678901234567890", at=59) == "287082"


def test_totp_base32_roundtrip_and_verify() -> None:
    sec = security.generate_totp_secret()
    b32 = security.secret_base32(sec)
    assert security.secret_from_base32(b32) == sec
    code = security.totp_now(sec)
    assert security.verify_totp(sec, code)


def test_token_purpose_and_expiry() -> None:
    tok, _ = security.issue_token({"sub": "a@b.de", "purpose": "verify"}, secret="k", ttl_sec=100, now=1000)
    assert security.verify_token(tok, secret="k", now=1050)["purpose"] == "verify"
    assert security.verify_token(tok, secret="k", now=2000) is None  # abgelaufen
    # session-Helfer akzeptiert nur purpose=session
    assert security.verify_session(tok, secret="k", now=1050) is None
    stok, _ = security.issue_session("a@b.de", secret="k", ttl_sec=100, now=1000)
    assert security.verify_session(stok, secret="k", now=1050) == "a@b.de"


# --- Helfer für den Endpunkt-Flow --------------------------------------------

_ADMIN = "zgpm@aegira.ai"
_PW = "Demo2026#"


def _totp_for(client: TestClient, email: str, password: str) -> str:
    """Holt das (in login erzeugte) Secret über die Repo-Schicht und rechnet den Code."""
    import asyncio

    from app.db.users_repo import get_users_repo

    user = asyncio.run(get_users_repo().get(email))
    return security.totp_now(security.secret_from_base32(user.totp_secret))


def _register_and_verify(client: TestClient, email: str, password: str = _PW) -> None:
    r = client.post("/v1/auth/register", json={"email": email, "password": password})
    assert r.status_code == 201, r.text
    url = r.json()["verify_url"]
    assert url and "/auth/verify?token=" in url
    token = re.search(r"token=([^&]+)", url).group(1)
    v = client.post("/v1/auth/verify", json={"token": token})
    assert v.status_code == 200 and v.json()["status"] == "verified"


def _full_login(client: TestClient, email: str, password: str = _PW) -> dict:
    """register→verify→login(enroll)→unlock; gibt die UnlockResponse zurück."""
    _register_and_verify(client, email, password)
    lg = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert lg.status_code == 200, lg.text
    assert lg.json()["status"] == "totp_enroll"
    assert lg.json()["qr_svg"].startswith("data:image/svg+xml;base64,")
    code = _totp_for(client, email, password)
    un = client.post("/v1/auth/unlock", json={"email": email, "password": password, "code": code})
    assert un.status_code == 200, un.text
    return un.json()


# --- Registrierung & Bestätigung ---------------------------------------------


def test_register_requires_verification_before_login(client: TestClient) -> None:
    client.post("/v1/auth/register", json={"email": "neu@firma.de", "password": _PW})
    # Login ohne Bestätigung → 403
    lg = client.post("/v1/auth/login", json={"email": "neu@firma.de", "password": _PW})
    assert lg.status_code == 403


def test_register_duplicate_verified(client: TestClient) -> None:
    _register_and_verify(client, "dup@firma.de")
    r = client.post("/v1/auth/register", json={"email": "dup@firma.de", "password": _PW})
    assert r.status_code == 409


def test_verify_invalid_token(client: TestClient) -> None:
    assert client.post("/v1/auth/verify", json={"token": "kaputt"}).status_code == 400


def test_weak_password_rejected(client: TestClient) -> None:
    r = client.post("/v1/auth/register", json={"email": "x@y.de", "password": "kurz"})
    assert r.status_code == 422  # min_length=8


# --- Login + TOTP -------------------------------------------------------------


def test_full_login_flow_and_session(client: TestClient) -> None:
    res = _full_login(client, "user@firma.de")
    token = res["token"]
    assert res["is_admin"] is False
    sess = client.get("/v1/auth/session", headers={"Authorization": f"Bearer {token}"})
    assert sess.status_code == 200 and sess.json()["valid"] is True
    assert sess.json()["email"] == "user@firma.de"


def test_login_wrong_password(client: TestClient) -> None:
    _register_and_verify(client, "pw@firma.de")
    r = client.post("/v1/auth/login", json={"email": "pw@firma.de", "password": "falsch"})
    assert r.status_code == 401


def test_unlock_rejects_bad_code(client: TestClient) -> None:
    _register_and_verify(client, "code@firma.de")
    client.post("/v1/auth/login", json={"email": "code@firma.de", "password": _PW})
    r = client.post("/v1/auth/unlock", json={"email": "code@firma.de", "password": _PW, "code": "000000"})
    assert r.status_code == 401


def test_admin_email_gets_admin_flag(client: TestClient) -> None:
    res = _full_login(client, _ADMIN)
    assert res["is_admin"] is True


# --- Adminbereich ------------------------------------------------------------


def test_admin_manages_users(client: TestClient) -> None:
    admin = _full_login(client, _ADMIN)
    atoken = admin["token"]
    _register_and_verify(client, "member@firma.de")

    hdr = {"Authorization": f"Bearer {atoken}"}
    lst = client.get("/v1/auth/admin/users", headers=hdr)
    assert lst.status_code == 200
    emails = {u["email"] for u in lst.json()}
    assert {"zgpm@aegira.ai", "member@firma.de"} <= emails

    # sperren → Login verboten
    dis = client.post("/v1/auth/admin/users/member@firma.de/disable", headers=hdr)
    assert dis.status_code == 200 and dis.json()["disabled"] is True
    blocked = client.post("/v1/auth/login", json={"email": "member@firma.de", "password": _PW})
    assert blocked.status_code == 403

    # entsperren + 2FA zurücksetzen + löschen
    assert client.post("/v1/auth/admin/users/member@firma.de/enable", headers=hdr).json()["disabled"] is False
    assert client.post("/v1/auth/admin/users/member@firma.de/reset-2fa", headers=hdr).json()["totp_enrolled"] is False
    assert client.delete("/v1/auth/admin/users/member@firma.de", headers=hdr).status_code == 200


def test_admin_requires_admin(client: TestClient) -> None:
    member = _full_login(client, "normal@firma.de")
    hdr = {"Authorization": f"Bearer {member['token']}"}
    assert client.get("/v1/auth/admin/users", headers=hdr).status_code == 403
    assert client.get("/v1/auth/admin/users").status_code == 403  # ohne Token


def test_admin_cannot_delete_self(client: TestClient) -> None:
    admin = _full_login(client, _ADMIN)
    hdr = {"Authorization": f"Bearer {admin['token']}"}
    assert client.delete("/v1/auth/admin/users/zgpm@aegira.ai", headers=hdr).status_code == 400
