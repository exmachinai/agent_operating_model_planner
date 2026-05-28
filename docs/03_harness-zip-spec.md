# 03 — Portable Agent-Harness Zip — Spezifikation

> Der Harness ist das **kompilierte Ergebnis** eines ZGPM-Plans. Er enthält alles, was nötig ist, um das geplante Projekt auf jedem Rechner auszuführen, der **Claude Code** oder **Cowork** installiert hat. Keine LangGraph-Runtime, kein Docker, keine Python-venv, kein Ollama. Bewusst.

## Ziel

Eine einzelne `.zip`-Datei, die:

1. den ZGPM-Plan als versionierte YAML/JSON enthält,
2. alle Subagent-Definitionen, Skills, Slash-Commands und Hooks für Claude Code / Cowork bündelt,
3. eine vollständige **Installations- und Bedienungs-Doku** enthält (Pflicht!),
4. **ohne Internet** lauffähig ist, **sofern** der Anthropic-Endpoint erreichbar bleibt (kein lokales LLM — Anforderung an Trust-Infrastructure),
5. keine Geheimnisse oder Kundendaten enthält.

## Pflicht-Inhalt

```
<project_slug>.harness.zip
└── <project_slug>/
    ├── README.md                       # 1-seitiger Überblick
    ├── INSTALL.md                      # AUSFÜHRLICH — Claude-Code/Cowork-Setup
    ├── USERGUIDE.md                    # AUSFÜHRLICH — Bedienung
    ├── CHANGELOG.md
    ├── LICENSE
    ├── CLAUDE.md                       # Main System-Prompt (auto-loaded)
    ├── .env.example
    ├── .gitignore
    ├── checksums.txt                   # SHA-256 aller Dateien
    │
    ├── plan/                           # ZGPM-Plan als Single Source of Truth
    │   ├── project.yaml                # Header + Phasen
    │   ├── msp.yaml                    # Meilensteinplan
    │   ├── pvm.yaml                    # Verantwortlichkeitsmatrix
    │   ├── activities/
    │   │   ├── M01.yaml                # Aktivitäten und MRL je Meilenstein
    │   │   └── ...
    │   ├── risks.yaml                  # Projektrisikoliste (PRL)
    │   ├── effort.yaml                 # Aufwand + Kosten (berechnet)
    │   └── _version.json               # Schema-Version + Plan-Hash + kontrolliert_durch
    │
    ├── .claude/                        # Claude Code / Cowork native
    │   ├── settings.json               # Model-Defaults, MCP-Server, Hook-Registrierung
    │   ├── agents/                     # Subagent-Definitionen
    │   │   ├── pmo-agent.md
    │   │   ├── architecture-agent.md
    │   │   ├── skill-mapping-agent.md
    │   │   ├── risk-agent.md
    │   │   ├── reviewer-agent.md
    │   │   ├── methodology-guard-agent.md
    │   │   └── milestone-executor-agent.md
    │   ├── skills/                     # SKILL.md je Skill
    │   │   ├── zgpm-compose/SKILL.md
    │   │   ├── zgpm-rules-engine/SKILL.md
    │   │   ├── pvm-validate/SKILL.md
    │   │   ├── risk-traffic-light/SKILL.md
    │   │   ├── skill-template/SKILL.md
    │   │   ├── plan-evaluator/SKILL.md
    │   │   └── zgpm-edit-plan/SKILL.md
    │   ├── commands/                   # Slash-Commands
    │   │   ├── run-harness.md
    │   │   ├── validate-plan.md
    │   │   ├── reset-milestone.md
    │   │   ├── risk-view.md
    │   │   ├── export-excel.md
    │   │   ├── usage-report.md
    │   │   ├── show-plan.md
    │   │   └── explain.md
    │   ├── hooks/                      # Deterministic enforcement
    │   │   ├── pre-tool/
    │   │   │   ├── constitution-guard.json
    │   │   │   └── token-budget.json
    │   │   ├── post-tool/
    │   │   │   └── audit-log.json
    │   │   └── stop/
    │   │       └── stop-on-red.json
    │   └── plugins/
    │       └── aegira-harness/
    │           └── plugin.json         # Cowork-Plugin-Manifest
    │
    ├── memory/                         # Long-Horizon-Conversation-Mgmt
    │   ├── lead_plan.md                # PMO-Agent persistiert hier
    │   └── context_compressions/       # Auto-Summaries pro Phase
    │
    ├── docs/                           # Anwender-Doku
    │   ├── 01_zgpm-method.md           # gekürzte Kopie für Endanwender
    │   ├── 02_concepts.md
    │   ├── 03_extension-guide.md       # eigene Agents/Skills/Hooks
    │   ├── 04_hitl-workflows.md
    │   ├── 05_troubleshooting.md
    │   └── 06_claude-code-setup.md     # Tiefe Claude-Code-/Cowork-Anleitung
    │
    └── examples/                       # vollständiger Beispiel-Run
        ├── sample-prompt.md
        └── expected-output/
```

**Was es NICHT mehr gibt** (bewusst gestrichen):

- ~~`langgraph/`~~ — Claude Code orchestriert
- ~~`scripts/run.sh` und `run.ps1`~~ — Slash-Command `/run-harness`
- ~~`docker/`~~ — nicht nötig, Claude Code/Cowork laufen nativ
- ~~Python-Requirements~~ — kein Python im Harness
- ~~Lokale LLM (Ollama)~~ — Anthropic-Endpoint ist Anforderung

## Format der Plan-YAML

Beispiel `plan/msp.yaml`:

```yaml
project: "AEGIRA AGP Launch DE"
planausgabedatum: "2026-05-28"
kontrolliert_durch: "Michael Veil (HITL-PM)"
phases:
  - id: PH1
    name: "Discovery"
    color: "#1f3a5f"
  - id: PH2
    name: "Design"
ergebnispfade:
  - code: P
    name: "Personen"
  - code: S
    name: "Systeme"
  - code: O
    name: "Organisation"
meilensteine:
  - id: M01
    code: P1
    text: "Persona-Validierung abgeschlossen"
    phase: PH1
    ergebnispfad: P
    geplant: "2026-06-15"
    ist_akt_plan: null
    vorgaenger: []
    risiko: "gruen"
    status: "offen"
  - id: M02
    code: S1
    text: "API-Architektur freigegeben"
    phase: PH2
    ergebnispfad: S
    geplant: "2026-07-20"
    vorgaenger: ["M01"]
    risiko: "gelb"
```

Beispiel `plan/pvm.yaml`:

```yaml
ressourcen:
  - id: R01
    name: "Michael Veil"
    rolle: "HITL-PM"
    typ: "human"
  - id: R02
    name: "milestone-executor-agent"
    typ: "agent"
    skill: "zgpm-compose"
matrix:
  M01:
    R01: "L"
    R02: "A"
  M02:
    R01: "F"
    R02: "A"
```

**Konsistenz-Regeln** werden vor dem Build und beim Run vom **reviewer-agent** plus dem **`zgpm-rules-engine`-Skill** geprüft:

- Pro Meilenstein/Aktivität mindestens ein `A`.
- Genau ein `F` oder `L` pro Meilenstein/Aktivität.
- `e` nie ohne `E`.

## Format der Subagent-Datei

`.claude/agents/<name>-agent.md` — YAML-Frontmatter + Body:

```markdown
---
name: pmo-agent
description: Orchestrator/Lead — zerlegt Projektauftrag in Phasen+Meilensteine; delegiert
model: claude-sonnet-4-6
thinking_budget: high
tools:
  - Read
  - Grep
  - Glob
  - skill:zgpm-compose
  - skill:zgpm-rules-engine
  - mcp:github-pat__github_*
---

# PMO-Agent

## Rolle
Lead-Agent für die Planungs-Phase. Implementiert das Orchestrator-Worker-Pattern.

## Operating Instructions
1. Extended Thinking für Strategie-Planung.
2. Lead-Plan in `memory/lead_plan.md` persistieren.
3. Sub-Tasks an Architecture/Skill-Mapping/Risk delegieren mit:
   - vollem User-Prompt,
   - bisherigem Trace,
   - klarem Objective + Output-Schema,
   - Tool-Allow-List,
   - Task-Boundaries.
4. Synthese der Subagent-Outputs.
5. Kein Code in geteilte Dateien schreiben — Workers persistieren in `plan/`.

## Anti-Patterns (verboten)
Siehe docs/04_agent-best-practices.md §5. Reviewer-Agent prüft.
```

## Format eines Skills

`.claude/skills/<name>/SKILL.md`:

```markdown
---
name: zgpm-rules-engine
description: Prüft ZGPM-Konsistenz-Regeln (≥1 A je MS, genau 1 F/L, "e" nie allein). Trigger: wenn Plan-YAML validiert wird.
---

# ZGPM Rules Engine Skill

Regeln (bindend, siehe docs/01_zgpm-method.md):
- R1: Pro Meilenstein/Aktivität ≥1 `A`.
- R2: Pro Meilenstein/Aktivität genau ein `F` oder `L`.
- R3: `e` nie ohne `E` in derselben Reihe.

Verhalten:
1. Lade `plan/msp.yaml` und `plan/pvm.yaml`.
2. Pro Meilenstein die drei Regeln prüfen.
3. Bei Verstoß: Konsolen-Output mit MS-ID, verletzter Regel und Fix-Vorschlag.
4. Bei OK: kurzes "PASS"-Statement.

Edge-Cases:
- Meilenstein ohne Aktivitäten → R1 nur auf MS-Ebene prüfen.
- Ressource ohne Rolle in PVM → Warnung, kein Fail.
```

## Format eines Slash-Commands

`.claude/commands/<name>.md`:

```markdown
---
name: run-harness
description: Startet oder setzt den ZGPM-Plan-Run fort.
args:
  - name: dry-run
    required: false
    description: Trockenlauf ohne Side-Effects
  - name: only
    required: false
    description: Nur den angegebenen Meilenstein ausführen
  - name: headless
    required: false
    description: Ohne HITL-Prompts, Notifications via Webhook
---

# /run-harness

Workflow:
1. `.env` validieren.
2. `plan/` über `zgpm-rules-engine` validieren.
3. Bei FAIL: stop, Fix-Vorschläge zeigen.
4. PMO-Agent spawnen.
5. Loop: aktiven Meilenstein ausführen, HITL-Approval, weiter.
6. Checkpoint nach jedem Subagent-Run in `.harness/<run-id>/state.json`.
```

## Format eines Hooks

`.claude/hooks/stop/stop-on-red.json`:

```json
{
  "name": "stop-on-red",
  "trigger": "after_tool",
  "tool_pattern": "zgpm-rules-engine|risk-traffic-light",
  "condition": "tool_output.contains('rot') || tool_output.contains('red')",
  "action": "halt",
  "message": "Rote Risikoampel — HITL-PM-Approval erforderlich, bevor weitergemacht wird.",
  "require_hitl_ack": true
}
```

## Schema-Versionierung

`plan/_version.json`:

```json
{
  "schema_version": "2.0.0-claude-native",
  "plan_hash": "sha256:<hex>",
  "planausgabedatum": "2026-05-28T10:30:00Z",
  "kontrolliert_durch": "Michael Veil",
  "compiled_by": "aegira-planner@0.2.0",
  "compiled_at": "2026-05-28T10:32:11Z",
  "runtime_requirements": {
    "claude_code": ">=0.8",
    "cowork": ">=0.4",
    "anthropic_api": "required"
  }
}
```

Schema-Version `2.0.0-claude-native` markiert das neue Modell ohne LangGraph. Schema-`1.x` (Langraph-basiert) ist deprecated.

## Was der Harness nicht enthalten darf

- **Keine Tokens / API-Keys / Secrets** im Klartext. Nur `.env.example` mit Platzhaltern.
- **Keine Customer-Daten** außerhalb explizit markierter `examples/`-Inhalte.
- **Keine PwC-/ZGPM-Markenattribution** als Eigenmarke.
- **Keine Cloud-Lock-in-Abhängigkeiten** außer dem Anthropic-Endpoint.
- **Keine Constitution-Zone-2-Pfade** (`00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`).
- **Keine LangGraph- / Docker- / Python-venv-Abhängigkeiten** — wir sind Claude-Code-/Cowork-nativ.

## Build-Pfad

Der Planner-App-Output (Plan-YAML) wird durch den Harness-Compiler (`tools/compile_harness.ts` im Planner) zu einem Zip kompiliert. Der Compiler:

1. validiert ZGPM-Konsistenz-Regeln,
2. instanziert `harness/_template/` mit den Plan-Inhalten,
3. generiert die Subagent-Definitionen aus PVM + MSP,
4. registriert Skills/Commands/Hooks in `.claude/settings.json`,
5. berechnet Checksums,
6. zippt das Ganze.

Output-Name: `<project_slug>_<planausgabedatum>_<short_hash>.harness.zip`.

Beispiel: `aegira-agp-launch-de_20260528_a3f1c2.harness.zip`.

## Integritäts-Check

`checksums.txt` enthält SHA-256-Hashes aller Dateien. Vor dem ersten Start:

```bash
shasum -a 256 -c checksums.txt   # macOS/Linux
```

Plattform-spezifische Kommandos in `INSTALL.md` §5.
