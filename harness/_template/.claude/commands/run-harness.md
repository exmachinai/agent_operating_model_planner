---
name: run-harness
description: Startet oder setzt den ZGPM-Plan-Run fort.
args:
  - name: dry-run
    required: false
    description: Trockenlauf ohne Side-Effects.
  - name: only
    required: false
    description: Nur den angegebenen Meilenstein.
  - name: headless
    required: false
    description: Ohne HITL-Prompts, Notifications via Webhook.
  - name: trace
    required: false
    description: Verbose tracing nach .harness/<run-id>/logs/.
  - name: refresh-risk-only
    required: false
    description: Risk-Re-Eval, kein MS-Vorlauf.
---

# /run-harness

## Workflow
1. **.env validieren** — ANTHROPIC_API_KEY oder claude auth login muss aktiv sein.
2. **`plan/` via zgpm-rules-engine validieren** — bei FAIL: stop, Fix-Vorschläge zeigen.
3. **`plan/project.yaml` prüfen** — wenn `project_nature` oder `target_platform` fehlt: `platform-discovery`-Skill triggern.
4. **Run-ID generieren** oder aus laufendem Checkpoint übernehmen.
5. **PMO-Agent spawnen**.
6. **Loop**:
   - Aktiven Meilenstein ermitteln (erster offener nach Vorgänger-Logik).
   - Bei `--only`: nur diesen MS.
   - Bei `--dry-run`: kein Tool-Output schreiben, nur Tracing.
   - HITL-Approval anfordern bei `E` oder `L`.
   - Nach jedem Subagent-Run: Checkpoint nach `.harness/<run-id>/state.json`.
7. **Stop** bei: alle MS geschlossen, oder rote Ampel, oder Token-Budget, oder HITL-Stop.

## Resume
Bei erneutem Aufruf: vorhandenen Checkpoint laden, Run-ID identifizieren, ab letztem validen Knoten fortsetzen.

## Headless-Mode
`--headless`: Approvals via `HITL_NOTIFY_*`-Webhooks. Antwort kommt zurück über Polling.
