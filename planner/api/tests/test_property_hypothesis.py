"""Property-based Tests (Teststrategie §4, P2) — `hypothesis`.

Der Compiler erzeugt dateisichere Slugs (Agenten-/Skill-Dateinamen, Plugin-Pfade).
Eine fehlerhafte Slug-Funktion bricht die Determinismus-/Pfad-Invarianten. Statt
Beispieldaten prüfen wir die Eigenschaften über viele zufällige Eingaben.
"""

from __future__ import annotations

import re

from hypothesis import given
from hypothesis import strategies as st

from app.harness.compiler import slugify

_SLUG_RE = re.compile(r"^[a-z0-9-]+$")


@given(st.text())
def test_slug_charset_and_trim(text: str) -> None:
    s = slugify(text)
    assert s, "Slug ist nie leer (Fallback 'harness')"
    assert _SLUG_RE.match(s), f"unerlaubte Zeichen im Slug: {s!r}"
    assert not s.startswith("-") and not s.endswith("-"), s


@given(st.text())
def test_slug_is_deterministic(text: str) -> None:
    assert slugify(text) == slugify(text)


@given(st.text())
def test_slug_is_idempotent(text: str) -> None:
    once = slugify(text)
    assert slugify(once) == once, f"nicht idempotent: {text!r} -> {once!r}"


@given(st.text(alphabet="äöüßÄÖÜ "))
def test_slug_transliterates_umlauts(text: str) -> None:
    s = slugify(text)
    # Keine Umlaute/ß mehr im Ergebnis — wurden transliteriert.
    assert not any(ch in s for ch in "äöüßÄÖÜ")
    assert _SLUG_RE.match(s)
