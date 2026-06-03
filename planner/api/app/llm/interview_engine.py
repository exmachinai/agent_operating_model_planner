"""Schärfungs-Interview — Engine (Schritt 2).

Zwei Modi, zur Laufzeit gewählt:
- **LLM** (wenn `foundry.is_configured()`): ein echtes McKinsey-Schärfungs-
  Interview — MECE, hypothesengeleitet, Pyramid-Prinzip, eine Frage nach der
  anderen. Strukturierte JSON-Antwort mit übernehmbaren Vorschlägen.
- **Mock** (sonst / bei LLM-Fehler): deterministische 3-Runden-Heuristik. Dient
  als Fallback, damit das Interview nie bricht.

Der Einstiegspunkt `next_turn` ist async und nimmt automatisch den passenden Modus.
"""

from __future__ import annotations

import json
import logging
import uuid

from ..schemas.interview import InterviewMessage, Suggestion
from ..schemas.project import Project
from . import foundry

logger = logging.getLogger("aegira.planner.api.llm.interview")

# Erlaubte Enum-Werte (müssen zu schemas.project passen) — der LLM darf nur diese liefern.
_NATURE = {"concept", "technical", "hybrid-concept-tech"}
_PLATFORM = {
    "azure", "aws", "gcp", "on-prem",
    "hybrid-cloud", "multi-cloud", "claude-code-only",
}

# =============================================================================
# LLM-Pfad — McKinsey-Schärfungs-Interview
# =============================================================================

_SYSTEM = """Du bist ein erfahrener McKinsey-Engagement-Manager und führst ein \
Schärfungs-Interview, um ein Vorhaben für den AEGIRA-ZGPM-Planner präzise zu \
verstehen. AEGIRA ist Trust-Infrastructure (nachweisbar, audit-ready) — niemals \
100%-Garantien. Sprache: Deutsch. Sei knapp, präzise, respektvoll.

METHODE (strikt einhalten):
- MECE: decke die Verständnis-Dimensionen überschneidungsfrei und vollständig ab.
- Hypothesengeleitet: formuliere eine begründete Hypothese und lass sie \
bestätigen, korrigieren oder verwerfen — frage nicht ins Blaue.
- Pyramid-Prinzip: Kernaussage zuerst, dann die Frage.
- EINE Frage pro Runde. Niemals mehrere Fragen bündeln.
- Progressiv verengen: von grob (Was soll entstehen?) zu scharf (Erfolgskriterium).

ZIEL: In 3–6 Runden genug Verständnis, um drei Felder zu füllen:
- project_nature ∈ {concept, technical, hybrid-concept-tech}
- target_platform ∈ {azure, aws, gcp, on-prem, hybrid-cloud, multi-cloud, claude-code-only}
- understanding_summary (prägnante Kernaussage zuerst, dann Kontext)

Sobald alle drei tragfähig stehen: setze "done": true und liefere als suggestion \
die understanding_summary.

ANTWORTFORMAT — gib AUSSCHLIESSLICH ein JSON-Objekt zurück, ohne Markdown, ohne \
Erklärung drumherum:
{
  "message": "<dein Beitrag an den Anwender: Kernaussage + GENAU eine Frage>",
  "suggestion": null oder {
    "kind": "project_nature" | "target_platform" | "understanding_summary",
    "value": "<exakter Enum-Wert bzw. Summary-Text>",
    "label": "<kurzes deutsches Label>",
    "rationale": "<kurze Begründung der Hypothese>"
  },
  "done": false oder true
}
Biete eine suggestion immer dann an, wenn du eine belastbare Hypothese zu einem \
der drei Felder hast (eine pro Runde). Für project_nature/target_platform MUSS \
"value" exakt einer der erlaubten Enum-Werte sein."""


# v0.9 — Preference-Drift-Guard: bei NICHT-AEGIRA-Projekten das AEGIRA-Framing
# (Marke/Trust-Infrastructure) aus dem System-Prompt entfernen. Methode bleibt.
_AEGIRA_FRAME = (
    "um ein Vorhaben für den AEGIRA-ZGPM-Planner präzise zu verstehen. "
    "AEGIRA ist Trust-Infrastructure (nachweisbar, audit-ready) — niemals 100%-Garantien."
)
_NEUTRAL_FRAME = "um ein Vorhaben präzise zu verstehen. Mache niemals 100%-Garantien."


def _system(apply_preferences: bool) -> str:
    return _SYSTEM if apply_preferences else _SYSTEM.replace(_AEGIRA_FRAME, _NEUTRAL_FRAME)


def _render_user(project: Project, transcript: list[InterviewMessage], context_text: str) -> str:
    """Rendert Projekt + Verlauf + (ephemeren) Kontext in einen Prompt."""
    lines = [
        f"PROJEKT-TITEL: {project.title}",
        f"PROJEKT-BRIEF: {project.description or '(kein Freitext-Brief)'}",
    ]
    known = []
    if project.project_nature:
        known.append(f"project_nature={project.project_nature}")
    if project.target_platform:
        known.append(f"target_platform={project.target_platform}")
    if known:
        lines.append("BEREITS GESETZT: " + ", ".join(known))
    if context_text.strip():
        # Ephemerer Kontext aus hochgeladenen Quellen — fließt in Hypothesen ein.
        snippet = context_text.strip()[:6000]
        lines.append(f"\nHOCHGELADENER KONTEXT (ephemer, nicht zitieren):\n{snippet}")

    lines.append("\nBISHERIGER GESPRÄCHSVERLAUF:")
    if transcript:
        for m in transcript:
            who = "INTERVIEWER" if m.role == "assistant" else "ANWENDER"
            lines.append(f"{who}: {m.content}")
    else:
        lines.append("(noch leer — formuliere die Eröffnung)")

    lines.append(
        "\nFormuliere jetzt die nächste Interviewer-Runde als JSON gemäß Vorgabe. "
        "Eine Frage. Wenn das Verständnis tragfähig ist, schließe ab (done=true) "
        "mit understanding_summary."
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


def _parse(raw: str) -> tuple[InterviewMessage, bool]:
    """Tolerantes Parsen der LLM-JSON-Antwort → (InterviewMessage, done)."""
    data = json.loads(_strip_fences(raw))
    message = str(data.get("message", "")).strip()
    if not message:
        raise ValueError("LLM-Antwort ohne 'message'")
    done = bool(data.get("done", False))

    suggestions: list[Suggestion] = []
    sug = data.get("suggestion")
    if isinstance(sug, dict) and sug.get("kind"):
        kind = sug.get("kind")
        value = str(sug.get("value", "")).strip()
        valid = (
            (kind == "project_nature" and value in _NATURE)
            or (kind == "target_platform" and value in _PLATFORM)
            or (kind == "understanding_summary" and bool(value))
        )
        if valid:
            suggestions.append(
                Suggestion(
                    id="sug_" + uuid.uuid4().hex[:8],
                    kind=kind,
                    value=value,
                    label=str(sug.get("label", value)).strip() or value,
                    rationale=str(sug.get("rationale", "")).strip(),
                )
            )
        else:
            logger.info("LLM-suggestion verworfen (kind=%s value=%r)", kind, value)

    return InterviewMessage(role="assistant", content=message, suggestions=suggestions), done


async def next_turn(
    project: Project,
    transcript: list[InterviewMessage],
    context_text: str = "",
) -> tuple[InterviewMessage, bool]:
    """Nächste Interviewer-Runde + ob das Interview fertig ist.

    Nutzt den Foundry-LLM, wenn konfiguriert; fällt bei fehlenden Creds oder
    jedem Fehler deterministisch auf den Mock zurück (Interview bricht nie).
    """
    if not foundry.is_configured():
        return _mock_next_turn(project, transcript, context_text)
    try:
        raw = await foundry.complete(
            _system(project.apply_preferences),
            _render_user(project, transcript, context_text),
            max_tokens=1200,
        )
        return _parse(raw)
    except Exception as exc:  # noqa: BLE001 — bewusst breit: Interview muss robust bleiben
        logger.warning("Interview-LLM fehlgeschlagen (%s) — Fallback auf Mock", exc)
        return _mock_next_turn(project, transcript, context_text)


# =============================================================================
# Mock-Pfad — deterministische 3-Runden-Heuristik (Fallback)
# =============================================================================

_TECH = ("code", "architekt", "techn, ", "techni", "api", "deploy", "azure",
         "aws", "gcp", "infrastruktur", "software", "kubernetes", "datenbank")
_CONCEPT = ("konzept", "methodik", "dokument", "strategie", "prozess",
            "governance", "schulung", "richtlinie", "playbook", "leitfaden")


def _user_text(transcript: list[InterviewMessage]) -> str:
    return " ".join(m.content for m in transcript if m.role == "user").lower()


def _sug(kind, value, label, rationale) -> Suggestion:  # noqa: ANN001
    return Suggestion(
        id="sug_" + uuid.uuid4().hex[:8],
        kind=kind,
        value=value,
        label=label,
        rationale=rationale,
    )


def _guess_nature(text: str) -> Suggestion:
    tech = any(k in text for k in _TECH)
    concept = any(k in text for k in _CONCEPT)
    if tech and concept:
        value, label = "hybrid-concept-tech", "Hybrid (Konzept & Technik)"
    elif tech:
        value, label = "technical", "Technisch (Architektur & Code)"
    elif concept:
        value, label = "concept", "Konzept (Methodik & Dokumente)"
    else:
        value, label = "hybrid-concept-tech", "Hybrid (Konzept & Technik)"
    return _sug("project_nature", value, label,
                "Hypothese aus deiner Beschreibung — annehmbar, änderbar oder verwerfbar.")


def _guess_platform(text: str) -> Suggestion:
    mapping = [
        ("azure", "azure", "Azure"),
        ("aws", "aws", "AWS"),
        ("google", "gcp", "GCP"),
        ("gcp", "gcp", "GCP"),
        ("on-prem", "on-prem", "On-Prem"),
        ("eigene server", "on-prem", "On-Prem"),
    ]
    for needle, value, label in mapping:
        if needle in text:
            return _sug("target_platform", value, label, "Aus deiner Antwort abgeleitet.")
    return _sug("target_platform", "claude-code-only", "Nur Claude Code",
                "Keine Plattform genannt — Default für rein agentische Vorhaben.")


def _mock_next_turn(
    project: Project,
    transcript: list[InterviewMessage],
    context_text: str = "",
) -> tuple[InterviewMessage, bool]:
    """Deterministischer Fallback — drei MECE-Runden, hypothesengeleitet."""
    answers = sum(1 for m in transcript if m.role == "user")
    text = _user_text(transcript)
    corpus = (text + " " + context_text.lower()).strip()

    if answers == 0:
        ctx_note = (
            "\n\n(Ich beziehe deine hochgeladenen Kontext-Quellen in die "
            "Schärfung ein.)"
            if context_text.strip()
            else ""
        )
        msg = (
            f"Lass uns „{project.title}“ schärfen. Eine Frage nach der anderen.\n\n"
            "Was soll am Ende konkret vorliegen — ein laufendes System, ein "
            "Dokumenten-/Methodik-Ergebnis, oder beides?" + ctx_note
        )
        return InterviewMessage(role="assistant", content=msg), False

    if answers == 1:
        nature = _guess_nature(corpus)
        msg = (
            "Verstanden. Hypothese zur Projektart (bitte bestätigen oder korrigieren):\n\n"
            f"→ **{nature.label}**\n\n"
            "Nächste Frage: Wo soll das Ergebnis am Ende laufen bzw. betrieben werden?"
        )
        return InterviewMessage(role="assistant", content=msg, suggestions=[nature]), False

    if answers == 2:
        platform = _guess_platform(corpus)
        msg = (
            "Danke. Daraus leite ich die Zielplattform ab:\n\n"
            f"→ **{platform.label}**\n\n"
            "Letzte Frage: Was ist die eine Kernaussage, an der Erfolg gemessen wird?"
        )
        return InterviewMessage(role="assistant", content=msg, suggestions=[platform]), False

    last_answer = next(
        (m.content for m in reversed(transcript) if m.role == "user"), ""
    )
    summary = _sug(
        "understanding_summary",
        f"Kernaussage: {last_answer.strip()} "
        f"Projekt „{project.title}“ wird methodisch (ZGPM) geplant.",
        "Zusammenfassung übernehmen",
        "Pyramid-Prinzip: Kernaussage zuerst.",
    )
    msg = (
        "Das genügt für ein tragfähiges Verständnis. Vorschlag für die "
        "Zusammenfassung — übernimm sie und gib das Verständnis frei (Gate 1)."
    )
    return InterviewMessage(role="assistant", content=msg, suggestions=[summary]), True
