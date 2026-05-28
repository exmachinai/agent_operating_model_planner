---
name: zgpm-compose
description: ZGPM-konforme Plan-Komposition — erzeugt MSP, PVM, Aktivitätenpläne aus Auftragstext nach Glasner-Methodik. Trigger beim PMO-Agent in der Strategie-Phase.
---

# ZGPM-Compose Skill

## Zweck
Zerlegt einen Projektauftrag in ein ZGPM-konformes Plan-Skelett.

## Output-Struktur

```yaml
# plan/project.yaml
project: "<Projektname>"
planausgabedatum: "<YYYY-MM-DD>"
kontrolliert_durch: "<Name HITL-PM>"
project_nature: ...
target_platform: ...

phases:
  - id: PH1
    name: "Discovery"
    color: "#1f3a5f"
ergebnispfade:
  - code: P
    name: "Personen"
```

```yaml
# plan/msp.yaml
meilensteine:
  - id: M01
    code: P1
    text: "Persona-Validierung abgeschlossen"   # Verb-im-Perfekt
    phase: PH1
    ergebnispfad: P
    geplant: "2026-06-15"
    vorgaenger: []
    risiko: "gruen"
    status: "offen"
```

## Methodische Regeln
1. **Meilensteine: Verb-im-Perfekt** ("X abgeschlossen", "Y freigegeben"). Niemals Substantiv-Listen.
2. **Phasen MECE**: keine Überlappung, keine Lücke.
3. **Ergebnispfade**: 2 Buchstaben max (z.B. `P`/`S`/`O`). Domänenspezifisch erlaubt.
4. **Vorgänger-Nachfolger**: explizit. Keine impliziten Reihenfolgen.
5. **Aktivitäten** kommen separat in `plan/activities/<MID>.yaml`.

## Schritte
1. Auftragstext einlesen.
2. **MECE-Phasen** vorschlagen (3–7).
3. **Ergebnispfade** aus dem Auftragskontext ableiten (typisch `P`/`S`/`O`, sonst domänenspezifisch).
4. **Meilensteine pro Phase** (2–6) als Verb-im-Perfekt-Sätze.
5. **Vorgänger-Nachfolger** aus inhaltlicher Logik.
6. Pyramid-Test: Beginnt jeder MS-Text mit dem Erreichten?

## Edge-Cases
- Bei `project_nature: concept`: keine Ergebnispfade `S` (Systeme). Nur z.B. `M` (Methodik), `D` (Dokumentation), `K` (Kommunikation).
- Bei `target_platform: claude-code-only`: keine Ergebnispfade `O` (Organisation) als Pflicht.
- Bei Multi-Phase-Projekten (>4 Phasen): vorher prüfen, ob Aufteilung in mehrere Pläne sinnvoll.

## Verbot
- Aktivitäten in MSP mischen.
- Meilensteine als Aktionen formulieren ("Persona validieren" — falsch; "Persona-Validierung abgeschlossen" — richtig).
- Ergebnispfade > 2 Buchstaben.
