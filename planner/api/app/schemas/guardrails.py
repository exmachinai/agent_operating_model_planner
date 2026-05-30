"""Leitplanken (Schritt 5, PLANEN) — Front-loaded Discovery.

Spec: docs/09_process-flow.md (Schritt 5). Der Anwender sieht den erlaubten
Rahmen, bevor geplant wird. Das System verweigert harte Verbote und eskaliert
Grenzfälle an den Anwender — es entscheidet sie nicht still.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .project import ProjectNature

# allowed = sauber, escalate = Grenzfall (HITL entscheidet), refused = hartes Verbot.
GuardrailVerdict = Literal["allowed", "escalate", "refused"]


class GuardrailCategory(BaseModel):
    """Eine verbotene Kategorie aus dem statischen Rahmen."""

    id: str
    label: str
    description: str


class GuardrailFlag(BaseModel):
    """Treffer der Prüfung gegen eine verbotene Kategorie."""

    category_id: str
    label: str
    matched_terms: list[str]
    # hard -> verweigern, soft -> an den Anwender eskalieren.
    severity: Literal["hard", "soft"]


class GuardrailCheck(BaseModel):
    """Ergebnis der Leitplanken-Prüfung plus statischer Rahmen für die Anzeige."""

    project_id: str
    verdict: GuardrailVerdict
    flags: list[GuardrailFlag]
    rationale: str
    allowed_natures: list[ProjectNature]
    forbidden_categories: list[GuardrailCategory]
    cleared_at: datetime | None = None


class GuardrailClearRequest(BaseModel):
    """Anwender quittiert die Leitplanken (und löst etwaige Eskalationen auf)."""

    # Bei verdict=escalate muss der Anwender bewusst weitergehen.
    proceed: bool = True
    note: str | None = Field(default=None, max_length=4000)
