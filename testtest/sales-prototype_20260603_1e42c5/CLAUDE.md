# CLAUDE.md — Sales Prototype

> Auto-geladener System-Prompt für diesen Harness. Kompiliert vom AEGIRA Agent
> Operating Model Planner aus dem bei Gate 2 freigegebenen ZGPM-Plan
> (v2, `sha256:1e42c5879c90105f268371733847bea78dd73771facf946781d90fd4e6637b9f`).

## Mission

Setze den freigegebenen ZGPM-Plan in `plan/` um. Der Plan ist die **Single
Source of Truth** — er wird ausgeführt, nicht neu erfunden.

## Wurzel & Pfade

Diese Datei liegt in der Harness-Wurzel. Setze `HARNESS_ROOT` auf dieses
Verzeichnis und verwende **immer absolute Pfade** ab `$HARNESS_ROOT` (z. B.
`$HARNESS_ROOT/plan/msp.yaml`). Keine relativen Pfade (docs/04).

## Agenten (Orchestrator-Worker)

- **PMO-Orchestrator** (`.claude/agents/pmo-orchestrator.md`) — orchestrator
- **Architektur-Agent** (`.claude/agents/architecture-agent.md`) — worker
- **Implementierungs-Agent** (`.claude/agents/implementation-agent.md`) — worker
- **UX/Design-Agent** (`.claude/agents/ux-agent.md`) — worker
- **Methodik-Agent** (`.claude/agents/methodology-agent.md`) — worker
- **Risiko-Agent** (`.claude/agents/risk-agent.md`) — worker
- **Reviewer/QA-Agent** (`.claude/agents/reviewer-agent.md`) — evaluator
- **Test-Agent (E2E)** (`.claude/agents/test-agent.md`) — evaluator
- **Projektleiter (HITL)** (`.claude/agents/hitl-projektleiter.md`) — hitl
- **Router/Triage-Agent** (`.claude/agents/router-triage.md`) — router

Der PMO-Agent orchestriert; Worker liefern Datei-Artefakte unter `plan/`; der
Reviewer prüft als Evaluator-Optimizer (max. 3 Runden, dann HITL). Nach **jedem**
Knoten ein Checkpoint unter `$HARNESS_ROOT/.harness/<run-id>/state.json`.

## Human-in-the-Loop (feste Punkte)

- M01 Scope und Branding-Grundlagen festgelegt — Meilenstein-Freigabe (HITL-PM)
- M02 Clickflow und Screen-Inventar vollständig dokumentiert — Meilenstein-Freigabe (HITL-PM)
- M03 Aegira-Branding auf alle Screens angewendet — Meilenstein-Freigabe (HITL-PM)
- M04 Alle Screens mit Mock-Daten lauffähig umgesetzt — Meilenstein-Freigabe (HITL-PM)
- M05 Prototyp auf Azure deployed und im Browser erreichbar — Meilenstein-Freigabe (HITL-PM)
- M06 Prototyp intern abgenommen und sales-ready freigegeben — Meilenstein-Freigabe (HITL-PM)
- Token-Budget > 80% — HITL-PM bestätigt Fortsetzung
- Neuer Skill eingeführt — HITL-PM-Review vor Nutzung

## Verbindliche Leitplanken (AEGIRA-Constitution)

- AEGIRA ist **Trust-Infrastructure**, nicht Compliance-Software.
- **Keine 100%-Garantien**; formuliere Ergebnisse „nachweisbar / audit-ready".
- Rechtsräume: **DE · EU27-Rest · UK · CH**. Niemals „DACH".
- Maturity-Modell: **AIMS** (ISO 42001 × CMMI v3).
- Produktnamen eingefroren: **AI Navigator / AI Guardian / AI Commander**.
- Keine Secrets im Klartext — nur `.env.example` pflegen.

## Start

Führe `/run-harness` aus. Bei roter Risiko-Ampel hält der `stop-on-red`-Hook und
verlangt HITL-PM-Approval.
