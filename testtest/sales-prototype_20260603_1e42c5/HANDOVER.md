# HANDOVER → Claude Code / Cowork — Sales Prototype

**Quelle:** AEGIRA Agent Operating Model Planner · Plan v2
(`sha256:1e42c5879c90105f268371733847bea78dd73771facf946781d90fd4e6637b9f`) · kompiliert 2026-06-03.

## 0. In 5 Minuten lauffähig

1. `unzip sales-prototype_20260603_1e42c5.harness.zip && cd sales-prototype_20260603_1e42c5`
2. `export HARNESS_ROOT="$(pwd)"`
3. `cp .env.example .env` und füllen.
4. `shasum -a 256 -c checksums.txt` → muss grün sein.
5. `claude` (oder `cowork`) starten → `/run-harness`.

## 1. Was Claude Code beim Start lädt

- `CLAUDE.md` — System-Prompt (auto-loaded), inkl. Constitution-Leitplanken.
- `.claude/settings.json` — Modell, **Permissions** (deny→ask→allow, `defaultMode`
  je Reifegrad), `env`-Hygiene und **Hooks** im kanonischen Event-Schema.
- `.claude/hooks/*.sh` — ausführbare Command-Hooks (`constitution-guard`, `audit-log`,
  `stop-on-red`, `checkpoint`). Vor dem Lauf ausführbar machen:
  `chmod +x .claude/hooks/*.sh`. Voraussetzung: `jq` installiert.
- `.claude/agents/*.md` — die Subagenten (s. u.).
- `.claude/skills/*` — Skills inkl. der Slash-Befehle (`/run-harness` …).
- `.claude/rules/*.md` — Zonen-/Naming-Regeln (Schicht 3).
- `.mcp.json` — MCP-Server (nur falls ein Skill einen verlangt; Secrets nur als `${ENV}`).
- `plan/` — der freigegebene ZGPM-Plan als Single Source of Truth (inkl. `plan/matrix.md`).

## 2. Agententeam

- `pmo-orchestrator` — PMO-Orchestrator (orchestrator); Skills: prompting-best-practices, skill-creator, zgpm-plan
- `architecture-agent` — Architektur-Agent (worker); Skills: adr-design, mcp-builder
- `implementation-agent` — Implementierungs-Agent (worker); Skills: webapp-testing
- `ux-agent` — UX/Design-Agent (worker); Skills: accessibility-review, brand-guidelines, canvas-design, theme-factory, frontend-design, web-design-guidelines
- `methodology-agent` — Methodik-Agent (worker); Skills: mece-check, prompting-best-practices, pvm-validate, zgpm-plan
- `risk-agent` — Risiko-Agent (worker); Skills: risk-traffic-light
- `reviewer-agent` — Reviewer/QA-Agent (evaluator); Skills: accessibility-review, code-review, pvm-validate, rubric-eval, web-design-guidelines
- `test-agent` — Test-Agent (E2E) (evaluator); Skills: test-plan, webapp-testing
- `hitl-projektleiter` — Projektleiter (HITL) (hitl); Skills: —
- `router-triage` — Router/Triage-Agent (router); Skills: classify, dispatch

## 3. Autonomie-/Reifegrad

Stufe **2 — Assistiert (Standard)**
(`permissions.defaultMode: default`). Die Stufe koppelt
Permission-Modus, HITL-Dichte und Telemetrie. Prinzip: Autonomie an Reversibilität,
nicht an Mechanik — irreversible Aktionen bleiben stets HITL-pflichtig.

## 4. HITL — wann du gefragt wirst

- M01 Scope und Branding-Grundlagen festgelegt — Meilenstein-Freigabe (HITL-PM)
- M02 Clickflow und Screen-Inventar vollständig dokumentiert — Meilenstein-Freigabe (HITL-PM)
- M03 Aegira-Branding auf alle Screens angewendet — Meilenstein-Freigabe (HITL-PM)
- M04 Alle Screens mit Mock-Daten lauffähig umgesetzt — Meilenstein-Freigabe (HITL-PM)
- M05 Prototyp auf Azure deployed und im Browser erreichbar — Meilenstein-Freigabe (HITL-PM)
- M06 Prototyp intern abgenommen und sales-ready freigegeben — Meilenstein-Freigabe (HITL-PM)
- Token-Budget > 80% — HITL-PM bestätigt Fortsetzung
- Neuer Skill eingeführt — HITL-PM-Review vor Nutzung

## 5. Leitplanken (nicht verhandelbar)

Trust-Infrastructure-Framing · keine 100%-Claims · Rechtsräume DE/EU27-Rest/UK/CH ·
AIMS-Maturity · Produktnamen AI Navigator/Guardian/Commander · keine Secrets im
Klartext. Der `constitution-guard`-Hook (PreToolUse, `permissionDecision:"deny"`)
blockt Schreibzugriffe auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` — zusätzlich zur
deny-Regel in `settings.json`.

## 6. Telemetrie & Audit (C4)

Die Cowork-/App-seitige Audit-Tiefe (OTel) ist nicht datei-erzwingbar
(Virtualisierungsgrenze, BP-MD §5/§9). Datei-seitige Kompensation: der
`audit-log`-Hook schreibt append-only nach `.harness/audit.log`. Ab Reifegrad 4 setzt
`settings.json` zusätzlich `CLAUDE_CODE_ENABLE_TELEMETRY=1`. Optionales OTel-Setup:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_EXPORTER_OTLP_ENDPOINT="https://<collector>:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

## 7. Stopping-Conditions (C5)

- **Build/Revision:** max. 25 Harness-Iterationen (kein Endlos-Loop).
- **Reviewer (Evaluator-Optimizer):** max. 3 Runden je Knoten, dann HITL-Entscheid.
  Bewusst unterschiedliche Schwellen (Build = Struktur, Reviewer = Qualität je Output).

## 8. Wenn etwas hakt

- Integritätsfehler → Harness im Planner neu exportieren (Gate 3).
- Reviewer-FAIL nach 3 Runden → HITL-PM entscheidet.
- Rote Ampel → `stop-on-red`-Hook hält (`continue:false`); `/risk-view` zeigt Details.

*exmachinAI · AEGIRA AI Trust Platform · Handover für Claude Code / Cowork.*
