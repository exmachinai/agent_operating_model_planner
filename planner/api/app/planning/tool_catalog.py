"""Kuratierter Werkzeug-/MCP-Katalog für Aktivitäts-Vorschläge (Schritt 6b).

Spec: docs/12_tools-mcp-suggestions.md.

Zwei Aufgaben:
1. **Deterministische Fallback-Quelle** für `llm_planner.suggest_tools_for_activity`,
   wenn Foundry nicht konfiguriert ist oder der LLM-Call/Parse scheitert.
2. **Bindung im Harness** (Schritt 8): dieselben Einträge stehen beim Agenten-Bau
   zur Verfügung.

Leitprinzip: laienverständlich (Klartext, was das Werkzeug tut + warum + Trust-
Hinweis nach Least-Privilege). Kein Tool wird ungefragt aktiv — der Anwender nimmt
es an oder verwirft es. Keine 100%-Claims; Trust-Hinweise benennen Daten/Rechte.
"""

from __future__ import annotations

from ..schemas.plan import ToolSuggestion

# Kanonische Werkzeug-Einträge. `keywords` triggern den deterministischen Vorschlag
# (Aktivitäts-Beschreibung wird kleingeschrieben gematcht). `name` ist der stabile
# Slug (auch im Harness-Export verwendet).
_CATALOG: list[dict] = [
    {
        "name": "web-search",
        "kind": "tool",
        "label": "Web-Recherche",
        "what_it_does": "Sucht aktuelle Informationen im Internet und fasst Quellen zusammen.",
        "trust_note": "Nur Lesezugriff auf öffentliche Webseiten; keine internen Daten.",
        "keywords": ["recherch", "research", "analyse", "markt", "wettbewerb", "quelle",
                     "benchmark", "trend", "discovery", "informationen"],
    },
    {
        "name": "github-mcp",
        "kind": "mcp",
        "label": "GitHub (Code & Repos)",
        "what_it_does": "Liest und schreibt Code, Issues und Pull-Requests in einem Repository.",
        "trust_note": "Least-Privilege: nur das benötigte Repo, Schreibrechte nur wenn nötig.",
        "keywords": ["code", "repo", "implementier", "entwickl", "programm", "pull-request",
                     "commit", "build", "software", "api"],
    },
    {
        "name": "filesystem-mcp",
        "kind": "mcp",
        "label": "Dateien & Ordner",
        "what_it_does": "Liest und schreibt Dateien in einem festgelegten Arbeitsordner.",
        "trust_note": "Nur ein klar abgegrenzter Ordner; kein Zugriff auf das übrige System.",
        "keywords": ["datei", "dokument", "ordner", "ablage", "sichern", "speicher",
                     "artefakt", "vorlage", "template"],
    },
    {
        "name": "docs-writer",
        "kind": "tool",
        "label": "Dokument-Ersteller",
        "what_it_does": "Erstellt formatierte Dokumente, Berichte und Zusammenfassungen.",
        "trust_note": "Erzeugt nur Ausgabedateien; verändert keine Quellsysteme.",
        "keywords": ["doku", "report", "bericht", "zusammenfass", "protokoll", "nachweis",
                     "audit", "präsentation", "konzept", "spezifikation"],
    },
    {
        "name": "data-analysis",
        "kind": "tool",
        "label": "Datenanalyse",
        "what_it_does": "Wertet Tabellen und Datensätze aus und erstellt Auswertungen.",
        "trust_note": "Verarbeitet nur die bereitgestellten Daten; keine externe Weitergabe.",
        "keywords": ["daten", "analyse", "auswert", "kennzahl", "statistik", "tabelle",
                     "metrik", "report", "dashboard"],
    },
    {
        "name": "review-checker",
        "kind": "tool",
        "label": "Prüf- & Review-Helfer",
        "what_it_does": "Prüft Ergebnisse gegen Kriterien und listet Abweichungen auf.",
        "trust_note": "Nur Lesezugriff auf das zu prüfende Ergebnis; ändert nichts selbst.",
        "keywords": ["prüf", "review", "qualität", "qa", "test", "abnahme", "validier",
                     "freigabe", "kontrolle"],
    },
    {
        "name": "issue-tracker-mcp",
        "kind": "mcp",
        "label": "Aufgaben-/Ticket-System",
        "what_it_does": "Legt Aufgaben an und verfolgt deren Status.",
        "trust_note": "Least-Privilege: nur das Projekt-Board; keine Adminrechte.",
        "keywords": ["aufgabe", "ticket", "planen", "koordin", "nachverfolg", "backlog",
                     "scope", "anforderung"],
    },
]

# Fällt nichts zu, schlagen wir generisch nützliche Werkzeuge vor, damit der
# Anwender nie vor einer leeren Liste steht.
_DEFAULT_NAMES = ["docs-writer", "filesystem-mcp"]


def _to_suggestion(entry: dict, activity_id: str, idx: int, why: str) -> ToolSuggestion:
    return ToolSuggestion(
        id=f"{activity_id}-T{idx + 1}",
        name=entry["name"],
        kind=entry["kind"],
        label=entry["label"],
        what_it_does=entry["what_it_does"],
        why_suggested=why,
        trust_note=entry["trust_note"],
        accepted=False,
    )


def suggest_for_text(description: str, activity_id: str, *, limit: int = 3) -> list[ToolSuggestion]:
    """Deterministischer Werkzeug-Vorschlag aus dem Aktivitätstext (Keyword-Match).

    Liefert bis zu `limit` Vorschläge, nie eine leere Liste (Default-Fallback).
    """
    text = (description or "").lower()
    matched: list[ToolSuggestion] = []
    used: set[str] = set()
    for entry in _CATALOG:
        if any(kw in text for kw in entry["keywords"]):
            why = f"Passt zu „{description.strip()[:60]}“."
            matched.append(_to_suggestion(entry, activity_id, len(matched), why))
            used.add(entry["name"])
            if len(matched) >= limit:
                return matched

    # Auffüllen mit sinnvollen Defaults, falls zu wenig getroffen wurde.
    if not matched:
        for name in _DEFAULT_NAMES:
            entry = next(e for e in _CATALOG if e["name"] == name)
            matched.append(
                _to_suggestion(
                    entry, activity_id, len(matched),
                    "Allgemein nützlich für diese Art von Arbeit.",
                )
            )
            if len(matched) >= limit:
                break
    return matched


def by_name(name: str) -> dict | None:
    """Katalog-Eintrag per Slug (für die Harness-Bindung, Schritt 8)."""
    return next((e for e in _CATALOG if e["name"] == name), None)


def all_entries() -> list[dict]:
    """Alle Katalog-Einträge (für UI-Listen / Harness-Palette)."""
    return list(_CATALOG)
