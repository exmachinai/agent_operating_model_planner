---
name: risk-view
description: Konsolen-Dashboard der Risikoampeln.
args: []
---

# /risk-view

## Workflow
1. `plan/msp.yaml` und `plan/risks.yaml` laden.
2. Pro MS: Ampelfarbe, zugeordnete Risiken, Mitigation-Status.
3. Gesamtprojekt-Ampel berechnen.

## Output-Format
```
Meilensteinplan — Risiko-Übersicht
═══════════════════════════════════════════════════════
ID    Code  Phase     Meilenstein                Risiko
─────────────────────────────────────────────────────
M01   P1    Discovery Persona-Validierung abges. ●  gruen
M02   S1    Design    API-Architektur freigegeb. ●  gelb (R03,R07)
M03   O1    Hardening DSC-Konzept abgeschlossen  ●  rot   (R12)
─────────────────────────────────────────────────────
Gesamt: ●  rot — blockiert durch R12

R12 (rot): "<Risikotitel>"
  Maßnahme:  <Mitigation>
  Eskaliert: M03 → HITL-PM
```
