"""Schärfungs-Interview — Engine (Schritt 2).

Deterministischer Spike-Mock: führt ein MECE-Interview in drei Runden und macht
hypothesengeleitete Vorschläge (Projektart, Plattform, Zusammenfassung). Jede
Runde stellt genau eine Frage (eine nach der anderen).

Der Foundry-LLM ersetzt später diese Heuristik — der Einstiegspunkt ist
`foundry.complete()`. Solange keine Creds vorliegen, läuft dieser Mock.
"""

from __future__ import annotations

import uuid

from ..schemas.interview import InterviewMessage, Suggestion
from ..schemas.project import Project

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


def next_turn(
    project: Project,
    transcript: list[InterviewMessage],
    context_text: str = "",
) -> tuple[InterviewMessage, bool]:
    """Liefert die nächste Assistenz-Runde und ob das Interview fertig ist.

    `context_text` ist der ephemer geparste Volltext hochgeladener Quellen
    (Schritt 2a) — er fließt in die Hypothesenbildung ein, wird aber nie
    persistiert.
    """
    answers = sum(1 for m in transcript if m.role == "user")
    text = _user_text(transcript)
    # Korpus für Hypothesen: Antworten + hochgeladener Kontext (ephemer).
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

    # answers >= 3 → Abschluss mit Zusammenfassungs-Vorschlag (Pyramid: Kernaussage zuerst).
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
