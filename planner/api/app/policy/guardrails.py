"""Leitplanken-Screen (Schritt 5) — deterministisch, ohne LLM.

Spec: docs/09_process-flow.md (Schritt 5). Prüft den Projekttext gegen verbotene
Kategorien (EU AI Act + Safety). Harte Treffer => `refused`. Weiche/zweideutige
Treffer => `escalate` (der Anwender entscheidet, das System nicht still).

Bewusst keyword-basiert und konservativ gehalten: ein Spike-Screen, kein
abschließender Compliance-Filter. Die echte Klassifikation übernimmt später der
Reviewer-Agent. Keine absoluten Claims — Grenzfälle gehen an den Menschen.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..schemas.guardrails import GuardrailCategory, GuardrailFlag
from ..schemas.project import ProjectNature

ALLOWED_NATURES: list[ProjectNature] = ["concept", "technical", "hybrid-concept-tech"]


@dataclass(frozen=True)
class _Rule:
    id: str
    label: str
    description: str
    hard: tuple[str, ...]  # eindeutige Verbotsbegriffe -> refused
    soft: tuple[str, ...]  # zweideutige/Dual-Use-Begriffe -> escalate


_RULES: tuple[_Rule, ...] = (
    _Rule(
        id="weapons_dual_use",
        label="Waffen & gefährliches Dual-Use",
        description="Entwicklung, Steuerung oder Optimierung von Waffen oder gefährlicher Dual-Use-Technik.",
        hard=("waffe", "weapon", "munition", "sprengstoff", "explosive", "lenkflugkörper", "raketensteuerung"),
        soft=("drohne", "drone", "dual-use", "dual use", "zielerfassung", "targeting"),
    ),
    _Rule(
        id="cbrn",
        label="Bio-/Chemie-/Nuklear-Gefahren",
        description="Erzeugung oder Verbreitung biologischer, chemischer oder nuklearer Gefahren (CBRN).",
        hard=("bioweapon", "biowaffe", "nervengift", "nerve agent", "anreicherung von uran", "kampfstoff", "pathogen-design"),
        soft=("pathogen", "toxin", "uran", "uranium", "zentrifuge", "centrifuge"),
    ),
    _Rule(
        id="discrimination",
        label="Diskriminierung & unfaire Benachteiligung",
        description="Systeme, die Personen anhand geschützter Merkmale benachteiligen oder aussortieren.",
        hard=("rassen-scoring", "ethnisches profiling", "ethnic profiling"),
        soft=("scoring nach herkunft", "bewerber aussortieren", "geschlecht filtern", "religion filtern", "bonität nach"),
    ),
    _Rule(
        id="malware",
        label="Malware, Exploits & Spoofing",
        description="Entwicklung von Schadsoftware, Exploits, Phishing oder Identitäts-/Absender-Spoofing.",
        hard=("malware", "ransomware", "trojaner", "trojan", "keylogger", "exploit-kit", "phishing-kit", "botnet", "botnetz"),
        soft=("exploit", "spoofing", "credential", "payload", "obfuskieren", "umgehung der erkennung", "evasion"),
    ),
    _Rule(
        id="eu_ai_act_prohibited",
        label="EU-AI-Act-verbotene Praktiken",
        description="Social Scoring, manipulatives/unterschwelliges Profiling, biometrische Massenüberwachung.",
        hard=("social scoring", "social-scoring", "biometrische massenüberwachung", "mass surveillance", "unterschwellige manipulation", "subliminal manipulation"),
        soft=("gesichtserkennung", "facial recognition", "emotionserkennung", "emotion recognition", "predictive policing", "verhaltensprofil"),
    ),
)


def forbidden_categories() -> list[GuardrailCategory]:
    """Statischer Rahmen für die Anzeige — was das System verweigert."""
    return [
        GuardrailCategory(id=r.id, label=r.label, description=r.description)
        for r in _RULES
    ]


def _matches(text: str, terms: tuple[str, ...]) -> list[str]:
    hits: list[str] = []
    for term in terms:
        # Wortgrenzen, damit "uran" nicht in "uranus" o.ä. trifft.
        if re.search(r"(?<!\w)" + re.escape(term) + r"(?!\w)", text):
            hits.append(term)
    return hits


def screen(text: str) -> tuple[str, list[GuardrailFlag]]:
    """Klassifiziert den Projekttext. Gibt (verdict, flags) zurück.

    verdict: 'refused' bei hartem Treffer, sonst 'escalate' bei weichem Treffer,
    sonst 'allowed'.
    """
    haystack = text.lower()
    flags: list[GuardrailFlag] = []

    for rule in _RULES:
        hard_hits = _matches(haystack, rule.hard)
        if hard_hits:
            flags.append(
                GuardrailFlag(
                    category_id=rule.id,
                    label=rule.label,
                    matched_terms=hard_hits,
                    severity="hard",
                )
            )
            continue
        soft_hits = _matches(haystack, rule.soft)
        if soft_hits:
            flags.append(
                GuardrailFlag(
                    category_id=rule.id,
                    label=rule.label,
                    matched_terms=soft_hits,
                    severity="soft",
                )
            )

    if any(f.severity == "hard" for f in flags):
        return "refused", flags
    if flags:
        return "escalate", flags
    return "allowed", flags


def rationale_for(verdict: str, flags: list[GuardrailFlag]) -> str:
    if verdict == "refused":
        labels = ", ".join(f.label for f in flags if f.severity == "hard")
        return (
            f"Das Vorhaben berührt einen harten Verbotsbereich ({labels}). "
            "Eine Planung ist hier nicht möglich."
        )
    if verdict == "escalate":
        labels = ", ".join(f.label for f in flags)
        return (
            f"Mögliche Grenzfälle erkannt ({labels}). Bitte prüfen und bewusst "
            "bestätigen, dass das Vorhaben keinen verbotenen Zweck verfolgt."
        )
    return "Keine Verbotsbereiche erkannt. Die Planung kann starten."
