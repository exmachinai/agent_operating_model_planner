"""LLM-gestützte Plangenerierung (Schritt 6) — Foundry-first, deterministisch als Fallback.

Spec: docs/09_process-flow.md (Schritt 6), docs/12_tools-mcp-suggestions.md.

Leitprinzip (User-Vorgabe): Der Anwender ist oft Laie. Der LLM liefert eine
projektspezifische **Gliederung** (Meilenstein-Namen im Perfekt + je Meilenstein
konkrete Aktivitätstexte in einfacher Sprache) sowie eine qualitative Gesamt-
risiko-Begründung. Aus dieser Gliederung baut der `zgpm_composer` einen voll
ZGPM-konformen Plan (PVM-Matrix, Risiken, Termine, Werkzeug-Vorschläge).

Robust wie das Interview: Ist Foundry nicht konfiguriert oder schlägt der Call/
Parse fehl, fällt alles auf den deterministischen Composer zurück — die Plan-
generierung bricht nie. Muster gespiegelt aus llm/interview_engine.py.
"""

from __future__ import annotations

import json
import logging

from ..llm import foundry
from ..schemas.plan import Plan
from ..schemas.project import Project
from . import zgpm_composer

logger = logging.getLogger("aegira.planner.api.planning.llm")

# Plausibilitäts-Grenzen für die LLM-Gliederung (gegen Ausreißer).
_MIN_MS, _MAX_MS = 3, 8
_MIN_ACT, _MAX_ACT = 2, 5


_SYSTEM = """Du bist ein erfahrener Projektplaner und arbeitest nach der ZGPM-\
Methodik (Glasner et al.) für den AEGIRA-Planner. AEGIRA ist Trust-Infrastructure \
(nachweisbar, audit-ready) — niemals 100%-Garantien. Sprache: Deutsch, einfache, \
für Laien verständliche Sprache. Keine Fachjargon-Wände.

AUFGABE: Erzeuge eine projektspezifische Gliederung als Vorschlag, den der \
Anwender danach bearbeiten kann.

REGELN:
- Meilensteine sind ZUSTÄNDE im Perfekt (z. B. „Konzept freigegeben"), KEINE \
Aufgaben. 3–6 Meilensteine, logisch aufeinander aufbauend.
- Je Meilenstein GENAU 3 konkrete Aktivitäten (was getan werden muss, damit der \
Zustand erreicht ist). Aktivitäten sind Tätigkeiten (Verb), kurz und klar.
- Eine qualitative Gesamtrisiko-Einschätzung in 2–4 Sätzen: Was ist das größte \
Risiko, warum, und wie lässt es sich mildern. Kein Methoden-Jargon.

ANTWORTFORMAT — gib AUSSCHLIESSLICH ein JSON-Objekt zurück, ohne Markdown:
{
  "milestones": [
    {
      "name": "<Zustand im Perfekt>",
      "phase": "<kurzer Phasenname, z. B. Discovery / Konzeption / Umsetzung>",
      "activities": ["<Tätigkeit 1>", "<Tätigkeit 2>", "<Tätigkeit 3>"]
    }
  ],
  "risk_narrative": "<2–4 Sätze qualitative Gesamtrisiko-Begründung>"
}"""


def _render_user(project: Project, context_text: str) -> str:
    lines = [
        f"PROJEKT-TITEL: {project.title}",
        f"PROJEKT-BRIEF: {project.description or '(kein Freitext-Brief)'}",
    ]
    if project.project_type:
        lines.append(f"PROJEKTART: {project.project_type}")
    if project.project_subtype:
        lines.append(f"UNTERART: {project.project_subtype}")
    if project.project_nature:
        lines.append(f"NATUR: {project.project_nature}")
    if project.target_platform:
        lines.append(f"ZIELPLATTFORM: {project.target_platform}")
    if project.understanding_summary:
        lines.append(f"VERSTÄNDNIS (Gate 1):\n{project.understanding_summary}")
    if context_text.strip():
        lines.append(f"\nKONTEXT (ephemer, nicht zitieren):\n{context_text.strip()[:6000]}")
    lines.append(
        "\nErzeuge jetzt die Gliederung als JSON gemäß Vorgabe. "
        "3–6 Meilensteine (Zustände im Perfekt), je genau 3 Aktivitäten."
    )
    return "\n".join(lines)


def _strip_fences(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        if s.endswith("```"):
            s = s.rsplit("```", 1)[0]
        s = s.lstrip()
        if s.lower().startswith("json"):
            s = s[4:].lstrip()
    return s.strip()


def _parse_outline(raw: str) -> tuple[list[dict], str]:
    """Tolerantes Parsen → (outline, risk_narrative). Wirft bei unbrauchbarem Output."""
    data = json.loads(_strip_fences(raw))
    raw_ms = data.get("milestones")
    if not isinstance(raw_ms, list) or not raw_ms:
        raise ValueError("LLM-Plan ohne 'milestones'")

    outline: list[dict] = []
    for m in raw_ms[:_MAX_MS]:
        if not isinstance(m, dict):
            continue
        name = str(m.get("name", "")).strip()
        if not name:
            continue
        acts_raw = m.get("activities") or []
        acts = [str(a).strip() for a in acts_raw if str(a).strip()]
        if not acts:
            continue
        acts = acts[:_MAX_ACT]
        outline.append(
            {
                "name": name,
                "phase_name": str(m.get("phase", name)).strip() or name,
                "activities": acts,
            }
        )

    if len(outline) < _MIN_MS:
        raise ValueError(f"LLM-Plan mit zu wenig Meilensteinen ({len(outline)})")

    narrative = str(data.get("risk_narrative", "")).strip()
    return outline, narrative


async def generate_plan(
    project: Project, version: int, plan_id: str, context_text: str = ""
) -> Plan:
    """Schritt 6 — Plan generieren: LLM-Gliederung, sonst deterministisch.

    Der LLM liefert nur die Gliederung + Risiko-Narrativ; den voll ZGPM-konformen
    Plan (PVM/Risiken/Termine/Werkzeuge) baut der deterministische Composer daraus.
    """
    if not foundry.is_configured():
        return zgpm_composer.compose(project, version=version, plan_id=plan_id)
    try:
        raw = await foundry.complete(
            _SYSTEM, _render_user(project, context_text), max_tokens=2000
        )
        outline, narrative = _parse_outline(raw)
        return zgpm_composer.compose(
            project,
            version=version,
            plan_id=plan_id,
            outline=outline,
            risk_narrative_override=narrative or None,
        )
    except Exception as exc:  # noqa: BLE001 — Plangenerierung muss robust bleiben
        logger.warning("Plan-LLM fehlgeschlagen (%s) — Fallback auf Composer", exc)
        return zgpm_composer.compose(project, version=version, plan_id=plan_id)
