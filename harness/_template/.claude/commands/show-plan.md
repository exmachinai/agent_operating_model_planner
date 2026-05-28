---
name: show-plan
description: Plan-Details für einen Meilenstein oder aktuellen Stand anzeigen.
args:
  - name: target
    required: false
    description: MS-ID (M03), "current" (aktueller MS), oder "summary" (Gesamtübersicht). Default current.
---

# /show-plan

## Workflow

**Bei `summary`:**
Lade alle plan-Dateien, zeige: Phasen, MS-Liste mit Status+Ampel, Risiko-Übersicht, Aufwand-Summe.

**Bei `current`:**
Identifiziere den aktuell aktiven MS aus `.harness/<run-id>/state.json`. Zeige dessen Aktivitäten, PVM-Zuordnung, Risiken.

**Bei `M03`:**
Wie current, aber für den expliziten MS.

## Output-Format (für einen MS)
```
Meilenstein M03 — DSC-Konzept abgeschlossen
═══════════════════════════════════════
Phase:           Hardening (PH3)
Ergebnispfad:    O
Geplant:         2026-08-15
Ist/akt. Plan:   2026-08-22
Risiko:          ● rot (R12)
PVM:
  R01 (Michael Veil, HITL-PM):  L
  R02 (milestone-executor):     A
  R05 (Reviewer):               F

Aktivitäten:
  A11 ✓ DTIA-Entwurf
  A12 ✓ BfDI-Konsultation
  A13 ⏳ Schulungskonzept
  A14   Internal-Review
```
