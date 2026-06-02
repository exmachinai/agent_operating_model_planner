"""Auth-Primitive für das Lockscreen-Gate (App-eigene Anmeldung + TOTP-2FA).

Bewusst self-contained (stdlib): TOTP nach RFC 6238 (HMAC-SHA1), signierte
Session-Token (HMAC-SHA256), konstante-Zeit-Vergleiche. Das TOTP-Secret wird
**deterministisch** aus einem Server-Seed + der Email abgeleitet — dadurch
multi-replica- und restart-stabil ohne Persistenz (kein Cosmos-Container nötig).

Das Passwort wird ausschließlich serverseitig geprüft; es verlässt nie den
Server Richtung Client. Trust-Tier-Hinweis: Demo-/Beta-Gate, keine Garantie.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import struct
import time
from urllib.parse import quote

# --- Konstante-Zeit-Vergleich ------------------------------------------------


def constant_time_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


# --- Passwort-Hashing (PBKDF2-HMAC-SHA256, stdlib) ---------------------------

_PBKDF2_ITER = 240_000


def hash_password(password: str) -> str:
    """Hasht ein Passwort mit zufälligem Salt → `pbkdf2_sha256$iter$salt$hash`."""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITER)
    return f"pbkdf2_sha256${_PBKDF2_ITER}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    """Konstante-Zeit-Prüfung gegen einen `pbkdf2_sha256$…`-Hash."""
    try:
        algo, iters, salt_b64, hash_b64 = stored.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), base64.b64decode(salt_b64), int(iters)
        )
        return hmac.compare_digest(dk, base64.b64decode(hash_b64))
    except (ValueError, TypeError):
        return False


# --- TOTP (RFC 6238) ---------------------------------------------------------

_TOTP_PERIOD = 30
_TOTP_DIGITS = 6


def generate_totp_secret() -> bytes:
    """Erzeugt ein zufälliges 20-Byte-TOTP-Secret (pro Nutzer)."""
    return os.urandom(20)


def secret_base32(secret: bytes) -> str:
    """Base32 (ohne Padding) — das Format, das Authenticator-Apps erwarten."""
    return base64.b32encode(secret).decode("ascii").rstrip("=")


def secret_from_base32(s: str) -> bytes:
    """Umkehrung von `secret_base32` (Padding wird ergänzt)."""
    pad = "=" * (-len(s) % 8)
    return base64.b32decode(s + pad)


def _hotp(secret: bytes, counter: int) -> str:
    msg = struct.pack(">Q", counter)
    digest = hmac.new(secret, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10 ** _TOTP_DIGITS)
    return str(code).zfill(_TOTP_DIGITS)


def totp_now(secret: bytes, at: float | None = None) -> str:
    t = int((at if at is not None else time.time()) // _TOTP_PERIOD)
    return _hotp(secret, t)


def verify_totp(secret: bytes, code: str, *, window: int = 1, at: float | None = None) -> bool:
    """Prüft einen TOTP-Code mit ±`window` Zeitschritten (Uhren-Drift-Toleranz)."""
    code = (code or "").strip().replace(" ", "")
    if not code.isdigit() or len(code) != _TOTP_DIGITS:
        return False
    base = int((at if at is not None else time.time()) // _TOTP_PERIOD)
    for off in range(-window, window + 1):
        if hmac.compare_digest(_hotp(secret, base + off), code):
            return True
    return False


def otpauth_uri(secret: bytes, *, email: str, issuer: str) -> str:
    """`otpauth://`-URI für QR-Enrollment in Microsoft Authenticator o. Ä."""
    label = quote(f"{issuer}:{email}")
    params = f"secret={secret_base32(secret)}&issuer={quote(issuer)}&digits={_TOTP_DIGITS}&period={_TOTP_PERIOD}"
    return f"otpauth://totp/{label}?{params}"


# --- QR-Code als SVG-Data-URI (qrcode-Core, ohne PIL/lxml) -------------------


def qr_svg_data_uri(data: str) -> str:
    import qrcode

    qr = qrcode.QRCode(box_size=1, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    n = len(matrix)
    rects: list[str] = []
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if dark:
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" '
        f'shape-rendering="crispEdges"><rect width="{n}" height="{n}" fill="#fff"/>'
        f'<g fill="#0b143e">{"".join(rects)}</g></svg>'
    )
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"


# --- Signierte Session-Token (HMAC-SHA256) -----------------------------------


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def issue_token(claims: dict, *, secret: str, ttl_sec: int, now: float | None = None) -> tuple[str, int]:
    """Signiert beliebige Claims (+ exp) → `payload.signature`; gibt (token, exp)."""
    exp = int((now if now is not None else time.time())) + ttl_sec
    body = {**claims, "exp": exp}
    payload = _b64url(json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = _b64url(hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest())
    return f"{payload}.{sig}", exp


def verify_token(token: str, *, secret: str, now: float | None = None) -> dict | None:
    """Prüft Signatur + Ablauf; gibt die Claims zurück (ohne exp-Check-Fehler), sonst None."""
    try:
        payload, sig = token.split(".", 1)
    except (ValueError, AttributeError):
        return None
    expected = _b64url(hmac.new(secret.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, sig):
        return None
    try:
        data = json.loads(_b64url_decode(payload))
    except (ValueError, json.JSONDecodeError):
        return None
    if int(data.get("exp", 0)) < int(now if now is not None else time.time()):
        return None
    return data


def issue_session(email: str, *, secret: str, ttl_sec: int, now: float | None = None) -> tuple[str, int]:
    """Session-Token für einen angemeldeten Nutzer (purpose=session)."""
    return issue_token({"sub": email, "purpose": "session"}, secret=secret, ttl_sec=ttl_sec, now=now)


def verify_session(token: str, *, secret: str, now: float | None = None) -> str | None:
    """Gibt die Email einer gültigen Session zurück, sonst None."""
    data = verify_token(token, secret=secret, now=now)
    if not data or data.get("purpose") != "session":
        return None
    sub = data.get("sub")
    return sub if isinstance(sub, str) else None
