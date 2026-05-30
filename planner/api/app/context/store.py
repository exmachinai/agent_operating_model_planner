"""Ephemerer Kontext-Cache (Schritt 2a).

Hält geparsten Volltext NUR prozess-lokal im Speicher — nie in Cosmos oder
Blob. Wird mit Gate 1 (oder bei Prozess-Neustart) verworfen. Persistiert wird
allein der Quellen-Nachweis (`ContextSource`) am Projekt. So bleibt der Inhalt
ephemer und die Buyer-Promise „evidence-based" trotzdem erfüllt.
"""

from __future__ import annotations

import threading

# project_id -> {source_id: extrahierter Text}
_TEXT: dict[str, dict[str, str]] = {}
_lock = threading.Lock()

# Token-Cap an Foundry je Schärfungs-Runde; grobe Schätzung 1 Token ≈ 4 Zeichen.
TOKEN_CAP = 150_000
_CHAR_CAP = TOKEN_CAP * 4


def estimate_tokens(text: str) -> int:
    return (len(text) + 3) // 4


def add(project_id: str, source_id: str, text: str) -> None:
    with _lock:
        _TEXT.setdefault(project_id, {})[source_id] = text


def remove(project_id: str, source_id: str) -> None:
    with _lock:
        _TEXT.get(project_id, {}).pop(source_id, None)


def clear(project_id: str) -> None:
    """Verwirft allen ephemeren Inhalt eines Projekts (Gate-1-Freeze)."""
    with _lock:
        _TEXT.pop(project_id, None)


def combined(project_id: str) -> str:
    """Verketteter Text aller Quellen, getrunct auf das Token-Cap."""
    with _lock:
        docs = list(_TEXT.get(project_id, {}).values())
    if not docs:
        return ""
    out = "\n\n---\n\n".join(docs)
    return out[:_CHAR_CAP] if len(out) > _CHAR_CAP else out
