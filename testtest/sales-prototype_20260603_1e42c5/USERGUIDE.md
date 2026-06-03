# USERGUIDE — Sales Prototype

## Was dieser Harness tut

Er führt den ZGPM-Plan (v2) aus: 6 Meilensteine
als Zustände, Verantwortlichkeiten als PVM-Codes, Risiken mit Ampel, Token-Budget.

## Slash-Commands

- `/run-harness` — Lauf starten/fortsetzen
- `/show-plan` — Plan anzeigen
- `/validate-plan` — ZGPM-Konsistenz prüfen
- `/risk-view` — Risiko-Ampeln
- `/usage-report` — Token-Verbrauch
- `/reset-milestone <id>` — Meilenstein zurücksetzen
- `/explain` — Methodik erklären

## Ablauf

1. `/run-harness` startet den PMO-Agent (Orchestrator).
2. Worker arbeiten je Meilenstein und legen Ergebnisse als Datei-Artefakte ab.
3. Der Reviewer prüft jeden Output (Evaluator-Optimizer, max. 3 Runden).
4. An HITL-Punkten wirst du um Freigabe gebeten:
   - M01 Scope und Branding-Grundlagen festgelegt — Meilenstein-Freigabe (HITL-PM)
   - M02 Clickflow und Screen-Inventar vollständig dokumentiert — Meilenstein-Freigabe (HITL-PM)
   - M03 Aegira-Branding auf alle Screens angewendet — Meilenstein-Freigabe (HITL-PM)
   - M04 Alle Screens mit Mock-Daten lauffähig umgesetzt — Meilenstein-Freigabe (HITL-PM)
   - M05 Prototyp auf Azure deployed und im Browser erreichbar — Meilenstein-Freigabe (HITL-PM)
   - M06 Prototyp intern abgenommen und sales-ready freigegeben — Meilenstein-Freigabe (HITL-PM)
   - Token-Budget > 80% — HITL-PM bestätigt Fortsetzung
   - Neuer Skill eingeführt — HITL-PM-Review vor Nutzung
5. Nach jedem Knoten ein Checkpoint — Resume jederzeit möglich.

## Methodik

Pläne folgen ZGPM (Glasner et al., methodisch genutzt) plus McKinsey-Prinzipien
(MECE, Pyramid, hypothesengetrieben). Ergebnisse sind „nachweisbar / audit-ready",
keine 100%-Garantien.
