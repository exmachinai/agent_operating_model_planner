"""E-Mail-Versand für die Konto-Bestätigung (Magic-Link).

Modus aus `AUTH_EMAIL_MODE`:
  - "stub" (Default): KEIN echter Versand. Der Link wird geloggt und von der API
    zurückgegeben (Dev/Beta), sodass der Flow ohne Mail-Infra testbar ist.
  - "smtp" / "acs": Platzhalter zum späteren Einhängen eines echten Providers
    (SMTP bzw. Azure Communication Services). Bis dahin wie "stub" + Warnung.

`send_verification` gibt den Link zurück, wenn er dem Aufrufer angezeigt werden
soll (Stub-Modus), sonst None (echter Versand).
"""

from __future__ import annotations

import logging

from ..config import get_settings

logger = logging.getLogger("aegira.planner.api.auth.email")


def build_verify_link(token: str) -> str:
    base = get_settings().auth_public_app_url.rstrip("/")
    return f"{base}/auth/verify?token={token}"


def send_verification(to_email: str, link: str) -> str | None:
    """Versendet (oder stubbt) die Bestätigungs-Mail. Gibt den Link zurück, wenn
    er dem Nutzer in der API-Antwort gezeigt werden soll (Stub), sonst None."""
    mode = get_settings().auth_email_mode.lower()
    if mode == "stub":
        logger.warning("E-Mail-STUB: Bestätigungslink für %s: %s", to_email, link)
        return link
    if mode in ("smtp", "acs"):
        # TODO: echten Provider einhängen (SMTP-Client bzw. Azure Communication
        # Services). Bis dahin defensiv wie Stub, aber mit deutlicher Warnung.
        logger.error(
            "AUTH_EMAIL_MODE=%s ist noch nicht verdrahtet — falle auf Stub zurück. "
            "Link für %s: %s",
            mode, to_email, link,
        )
        return link
    logger.error("Unbekannter AUTH_EMAIL_MODE=%s — Stub-Verhalten.", mode)
    return link
