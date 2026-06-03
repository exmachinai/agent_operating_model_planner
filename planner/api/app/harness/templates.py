"""Datei-Inhalte des kompilierten Harness (docs/03_harness-zip-spec.md).

Jeder Generator gibt fertigen Text zurück; `compiler.build_files` setzt die
Struktur zusammen. Brand-Treue (CLAUDE.md): keine 100%-Claims, Rechtsräume
DE/EU27-Rest/UK/CH, AIMS-Maturity, Produktnamen eingefroren. Pfade im Harness
sind absolut über `$HARNESS_ROOT` (docs/04 — keine relativen Pfade).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from ..schemas.harness import MAX_HARNESS_ITERATIONS, HarnessGraph
from ..schemas.plan import Milestone, Plan
from ..schemas.project import Project


# --- Plan-YAML-Strukturen -----------------------------------------------------


def plan_project(project: Project, plan: Plan) -> dict[str, Any]:
    return {
        "project": project.title,
        "project_id": project.id,
        "project_nature": project.project_nature or "concept",
        "target_platform": project.target_platform or "claude-code-only",
        "planausgabedatum": plan.planausgabedatum,
        "kontrolliert_durch": plan.kontrolliert_durch,
        "plan_version": plan.version,
        "plan_hash": plan.plan_hash,
        "phases": [{"id": p.id, "name": p.name, "order": p.order} for p in plan.phases],
        "ergebnispfade": [{"code": s.code, "label": s.label} for s in plan.streams],
    }


def plan_msp(plan: Plan) -> dict[str, Any]:
    return {
        "meilensteine": [
            {
                "id": m.id,
                "code": m.stream_code,
                "text": m.name,
                "phase": m.phase_id,
                "ergebnispfad": m.stream_code,
                "geplant": m.planned_date,
                "vorgaenger": list(m.predecessors),
                "risiko": m.ampel,
                "status": "offen",
            }
            for m in plan.milestones
        ]
    }


def _role_resource_ids(plan: Plan) -> dict[str, str]:
    """Stabile R-IDs je Rolle — sichere YAML-Schlüssel für die PVM-Matrix."""
    return {role: f"R{idx + 1:02d}" for idx, role in enumerate(plan.pvm_roles)}


def plan_pvm(plan: Plan) -> dict[str, Any]:
    rids = _role_resource_ids(plan)
    ressourcen = [
        {
            "id": rid,
            "name": role,
            "typ": "human" if "HITL" in role or "Fachbereich" in role else "agent",
        }
        for role, rid in rids.items()
    ]
    matrix: dict[str, dict[str, str]] = {}
    for m in plan.milestones:
        matrix[m.id] = {rids[r.role]: r.code for r in m.responsibilities if r.role in rids}
    return {"ressourcen": ressourcen, "matrix": matrix}


def plan_risks(plan: Plan) -> dict[str, Any]:
    return {
        "projektrisikoliste": [
            {
                "id": r.id,
                "beschreibung": r.description,
                "eintritt": r.probability,
                "auswirkung": r.impact,
                "ampel": r.ampel,
                "massnahme": r.mitigation,
            }
            for r in plan.prl
        ]
    }


def plan_cost(plan: Plan) -> dict[str, Any]:
    """Kosten je Agent als Token-Budget (v0.6 — keine Personentage mehr)."""
    total_tokens = sum(t.tokens_estimated for t in plan.token_budget)
    return {
        "token_budget_gesamt": total_tokens,
        "token_budget": [
            {"agent": t.agent, "node": t.node, "tokens": t.tokens_estimated}
            for t in plan.token_budget
        ],
    }


def plan_milestone(m: Milestone) -> dict[str, Any]:
    """Meilenstein-Detail: PVM + Meilensteinrisikoliste (v0.6 — ohne Aktivitäten).

    Die konkrete Arbeit zum Erreichen des Zustands übernehmen die Agenten autonom;
    der Harness-Plan beschreibt nur Ziel-Zustand, Termin, PVM und Risiken."""
    return {
        "meilenstein": m.id,
        "name": m.name,
        "geplant": m.planned_date,
        "pvm": [{"rolle": r.role, "code": r.code} for r in m.responsibilities],
        "mrl": [
            {
                "id": r.id,
                "beschreibung": r.description,
                "eintritt": r.probability,
                "auswirkung": r.impact,
                "ampel": r.ampel,
                "massnahme": r.mitigation,
            }
            for r in m.mrl
        ],
    }


def plan_version_json(
    plan: Plan, schema_version: str, compiler_id: str, compiled_at: datetime
) -> str:
    return json.dumps(
        {
            "schema_version": schema_version,
            "plan_hash": plan.plan_hash,
            "plan_version": plan.version,
            "planausgabedatum": plan.planausgabedatum.isoformat(),
            "kontrolliert_durch": plan.kontrolliert_durch,
            "compiled_by": compiler_id,
            "compiled_at": compiled_at.isoformat(),
            "runtime_requirements": {
                # v0.9 (A5) — gegen reale aktuelle Versionen gepflegt (BP-MD §9).
                "claude_code": ">=2.0",
                "cowork": ">=0.4",
                "anthropic_api": "required",
            },
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


# --- Markdown / Doku ----------------------------------------------------------


def claude_md(project: Project, plan: Plan, graph: HarnessGraph) -> str:
    agents = "\n".join(
        f"- **{a.role}** (`.claude/agents/{a.name}.md`) — {a.kind}"
        for a in graph.agents
    )
    return f"""# CLAUDE.md — {project.title}

> Auto-geladener System-Prompt für diesen Harness. Kompiliert vom AEGIRA Agent
> Operating Model Planner aus dem bei Gate 2 freigegebenen ZGPM-Plan
> (v{plan.version}, `{plan.plan_hash}`).

## Mission

Setze den freigegebenen ZGPM-Plan in `plan/` um. Der Plan ist die **Single
Source of Truth** — er wird ausgeführt, nicht neu erfunden.

## Wurzel & Pfade

Diese Datei liegt in der Harness-Wurzel. Setze `HARNESS_ROOT` auf dieses
Verzeichnis und verwende **immer absolute Pfade** ab `$HARNESS_ROOT` (z. B.
`$HARNESS_ROOT/plan/msp.yaml`). Keine relativen Pfade (docs/04).

## Agenten (Orchestrator-Worker)

{agents}

Der PMO-Agent orchestriert; Worker liefern Datei-Artefakte unter `plan/`; der
Reviewer prüft als Evaluator-Optimizer (max. 3 Runden, dann HITL). Nach **jedem**
Knoten ein Checkpoint unter `$HARNESS_ROOT/.harness/<run-id>/state.json`.

## Human-in-the-Loop (feste Punkte)

{chr(10).join("- " + p for p in graph.hitl_points)}

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
"""


def readme_md(project: Project, plan: Plan, graph: HarnessGraph) -> str:
    return f"""# {project.title} — Agent-Harness

Portables Agententeam, kompiliert aus einem freigegebenen ZGPM-Plan
(v{plan.version}). Läuft auf **Claude Code** oder **Cowork** — keine LangGraph-,
Docker- oder Python-Abhängigkeiten.

- **{len(graph.agents)} Agenten**, {len(plan.milestones)} Meilensteine,
  {len(graph.hitl_points)} HITL-Punkte.
- Plan als Single Source of Truth unter `plan/`.
- Integrität: `shasum -a 256 -c checksums.txt`.

Schnellstart siehe `INSTALL.md`, Bedienung `USERGUIDE.md`, Übergabe an
Claude Code / Cowork `HANDOVER.md`.

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust.*
"""


def install_md(project: Project, graph: HarnessGraph) -> str:
    return f"""# INSTALL — {project.title}

## 1. Voraussetzungen

- **Claude Code** (`>=2.0`) **oder Cowork** (`>=0.4`).
- Erreichbarer **Anthropic-Endpoint** (kein lokales LLM — Trust-Anforderung).
- `bash`, `unzip`, `shasum` (macOS/Linux) bzw. `CertUtil` (Windows).

## 2. Entpacken & Wurzel setzen

```bash
unzip {graph.zip_name}
cd {graph.zip_name.replace(".harness.zip", "")}
export HARNESS_ROOT="$(pwd)"
```

## 3. Konfiguration

```bash
cp .env.example .env
# .env mit echten Werten füllen — niemals committen.
```

## 4. Integritäts-Check (Pflicht vor dem ersten Start)

```bash
shasum -a 256 -c checksums.txt   # macOS/Linux
# Windows (PowerShell):  Get-Content checksums.txt | ForEach-Object {{ ... }}
```

Alle Zeilen müssen `OK` melden. Bei `FAILED` den Harness neu exportieren.

## 5. Start

```bash
claude            # oder: cowork
/run-harness
```

Der PMO-Agent übernimmt die Orchestrierung. HITL-Freigaben werden inline
angefragt; rote Risiko-Ampeln halten den Lauf (Stop-Hook).
"""


def userguide_md(project: Project, plan: Plan, graph: HarnessGraph) -> str:
    cmds = (
        "- `/run-harness` — Lauf starten/fortsetzen\n"
        "- `/show-plan` — Plan anzeigen\n"
        "- `/validate-plan` — ZGPM-Konsistenz prüfen\n"
        "- `/risk-view` — Risiko-Ampeln\n"
        "- `/usage-report` — Token-Verbrauch\n"
        "- `/reset-milestone <id>` — Meilenstein zurücksetzen\n"
        "- `/explain` — Methodik erklären"
    )
    return f"""# USERGUIDE — {project.title}

## Was dieser Harness tut

Er führt den ZGPM-Plan (v{plan.version}) aus: {len(plan.milestones)} Meilensteine
als Zustände, Verantwortlichkeiten als PVM-Codes, Risiken mit Ampel, Token-Budget.

## Slash-Commands

{cmds}

## Ablauf

1. `/run-harness` startet den PMO-Agent (Orchestrator).
2. Worker arbeiten je Meilenstein und legen Ergebnisse als Datei-Artefakte ab.
3. Der Reviewer prüft jeden Output (Evaluator-Optimizer, max. 3 Runden).
4. An HITL-Punkten wirst du um Freigabe gebeten:
{chr(10).join("   - " + p for p in graph.hitl_points)}
5. Nach jedem Knoten ein Checkpoint — Resume jederzeit möglich.

## Methodik

Pläne folgen ZGPM (Glasner et al., methodisch genutzt) plus McKinsey-Prinzipien
(MECE, Pyramid, hypothesengetrieben). Ergebnisse sind „nachweisbar / audit-ready",
keine 100%-Garantien.
"""


def handover_md(project: Project, plan: Plan, graph: HarnessGraph) -> str:
    agent_lines = "\n".join(
        f"- `{a.name}` — {a.role} ({a.kind}); Skills: {', '.join(a.skills) or '—'}"
        for a in graph.agents
    )
    return f"""# HANDOVER → Claude Code / Cowork — {project.title}

**Quelle:** AEGIRA Agent Operating Model Planner · Plan v{plan.version}
(`{plan.plan_hash}`) · kompiliert {graph.created_at.date()}.

## 0. In 5 Minuten lauffähig

1. `unzip {graph.zip_name} && cd {graph.zip_name.replace(".harness.zip", "")}`
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
- `.mcp.json` — MCP-Server (nur falls ein Skill einen verlangt; Secrets nur als `${{ENV}}`).
- `plan/` — der freigegebene ZGPM-Plan als Single Source of Truth (inkl. `plan/matrix.md`).

## 2. Agententeam

{agent_lines}

## 3. Autonomie-/Reifegrad

Stufe **{graph.autonomy_level.value} — {graph.autonomy_level.label}**
(`permissions.defaultMode: {graph.autonomy_level.default_mode}`). Die Stufe koppelt
Permission-Modus, HITL-Dichte und Telemetrie. Prinzip: Autonomie an Reversibilität,
nicht an Mechanik — irreversible Aktionen bleiben stets HITL-pflichtig.

## 4. HITL — wann du gefragt wirst

{chr(10).join("- " + p for p in graph.hitl_points)}

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

- **Build/Revision:** max. {MAX_HARNESS_ITERATIONS} Harness-Iterationen (kein Endlos-Loop).
- **Reviewer (Evaluator-Optimizer):** max. 3 Runden je Knoten, dann HITL-Entscheid.
  Bewusst unterschiedliche Schwellen (Build = Struktur, Reviewer = Qualität je Output).

## 8. Wenn etwas hakt

- Integritätsfehler → Harness im Planner neu exportieren (Gate 3).
- Reviewer-FAIL nach 3 Runden → HITL-PM entscheidet.
- Rote Ampel → `stop-on-red`-Hook hält (`continue:false`); `/risk-view` zeigt Details.

*exmachinAI · AEGIRA AI Trust Platform · Handover für Claude Code / Cowork.*
"""


def changelog_md(graph: HarnessGraph, schema_version: str) -> str:
    return f"""# CHANGELOG

## {graph.created_at.date()} — kompiliert (Iteration {graph.iteration})

- Harness aus freigegebenem Plan v{graph.plan_version} (`{graph.plan_hash}`).
- {len(graph.agents)} Agenten, {len(graph.nodes)} Graph-Knoten.
- Schema `{schema_version}` (LangGraph-frei).
- Autonomie-/Reifegrad-Stufe: {graph.autonomy_level.value} — {graph.autonomy_level.label}.
"""


def agents_md(project: Project) -> str:
    """`AGENTS.md` (B5, v0.9) — Cross-Tool-Einstieg, importiert die `CLAUDE.md`.

    `AGENTS.md` ist der tool-übergreifende Standard (Codex, Cursor, …). Wir halten
    ihn bewusst dünn: er verweist per `@import` auf die kanonische `CLAUDE.md`, damit
    es keine zweite Quelle der Wahrheit gibt (Single Source of Truth bleibt CLAUDE.md).
    """
    return f"""# AGENTS.md — {project.title}

> Tool-übergreifender Einstieg. Die verbindlichen Anweisungen stehen in `CLAUDE.md`
> (Single Source of Truth). Dieses Dokument importiert sie nur.

@CLAUDE.md

## Hinweis

Dieser Harness ist für **Claude Code / Cowork** kompiliert. Andere Agenten-Tools
sollten `CLAUDE.md`, `.claude/agents/` und `plan/` als verbindlich behandeln.
"""


def devcontainer_files(project: Project) -> dict[str, str]:
    """`.devcontainer/` (B6, v0.9) — nur für IT-Harnesses (Non-Root-Sandbox).

    Voraussetzung für `acceptEdits`/höhere Autonomie laut BP-MD §8 (Sandbox).
    Gibt ein leeres Dict für Nicht-IT-Vorhaben zurück (kein Datei-Output)."""
    if (project.project_type or "non-it") != "it":
        return {}
    devcontainer = json.dumps(
        {
            "name": "aegira-harness",
            "image": "mcr.microsoft.com/devcontainers/base:bookworm",
            # Non-Root (BP-MD §8) — höhere Autonomie nur in der Sandbox.
            "remoteUser": "vscode",
            "features": {
                "ghcr.io/devcontainers/features/node:1": {},
                "ghcr.io/devcontainers/features/github-cli:1": {},
            },
            "postCreateCommand": "command -v jq >/dev/null || sudo apt-get update && sudo apt-get install -y jq",
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"
    return {".devcontainer/devcontainer.json": devcontainer}


def license_txt() -> str:
    return (
        "Proprietär — exmachinAI GmbH · AEGIRA AI Trust Platform.\n"
        "Dieser Harness und der enthaltene Plan sind für den lizenzierten "
        "internen Gebrauch bestimmt. Keine ZGPM-/PwC-Markenattribution als "
        "Eigenmarke. Alle Rechte vorbehalten.\n"
    )


def env_example() -> str:
    return """# Harness-Konfiguration — Platzhalter, NIEMALS echte Secrets committen.

# Anthropic-Endpoint (Pflicht — kein lokales LLM).
ANTHROPIC_API_KEY=

# Optional: GitHub via Fine-Grained PAT (MCP-Server).
GITHUB_TOKEN=
GITHUB_DEFAULT_OWNER=exmachinai
GITHUB_PROTECTED_PATHS=00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**

# Wurzelpfad des Harness (absolut). Beim Start: export HARNESS_ROOT="$(pwd)".
HARNESS_ROOT=

# --- Transcript-/Credential-Hygiene (v0.9, C3) -------------------------------
# Prompt-History deaktivieren (keine sensiblen Prompts im Verlauf). Wird auch in
# .claude/settings.json (env) gesetzt — hier zur Sichtbarkeit/Override.
CLAUDE_CODE_SKIP_PROMPT_HISTORY=1
# settings.json verweigert zusätzlich Read(./.env) + Secret-Globs. Niemals echte
# Secrets committen; .env ist gitignored.
"""


def gitignore() -> str:
    return ".env\n.harness/\nmemory/context_compressions/\n*.log\n"


def lead_plan_md(plan: Plan) -> str:
    ms = "\n".join(f"- [ ] {m.id} · {m.name} (fällig {m.planned_date.date()})" for m in plan.milestones)
    return f"""# Lead-Plan (PMO-Agent)

> Vom PMO-Agent gepflegt. Persistiert vor jedem Subagent-Spawn (docs/04).

## Meilensteine

{ms}

## Status

Initialisiert aus Plan v{plan.version}. Checkpoints unter `$HARNESS_ROOT/.harness/`.
"""


# --- .claude/ -----------------------------------------------------------------


def settings_json(graph: HarnessGraph) -> str:
    """`.claude/settings.json` — schematreu (v0.9, P0.3).

    Nur dokumentierte Claude-Code-Felder (gegen die offizielle Settings-Referenz
    verifiziert). Phantasie-Keys (`thinking_budget`, `*_path`, `log_level`) entfernt.
    Permissions deny→ask→allow; `defaultMode`, `ask`-Liste und Telemetrie sind an
    die Autonomie-/Reifegrad-Stufe gekoppelt (C1, BP-MD §7). Hooks im kanonischen
    Event-Schema (PreToolUse/PostToolUse/Stop) mit Command-Handlern.
    """
    from . import catalog

    level = graph.autonomy_level
    agent_tools = {t for a in graph.agents for t in a.tools}
    irreversible = sorted(agent_tools & catalog.irreversible_tool_names())
    high_risk = sorted(agent_tools & catalog.high_risk_tool_names())

    # deny — Credential-/Transcript-Hygiene (C3) + Zone-2-Schutz (Constitution).
    deny = [
        "Bash(rm -rf:*)", "Bash(curl:*)", "Bash(wget:*)", "Bash(sudo:*)",
        "Read(./.env)", "Read(./.env.*)", "Read(./**/.env)",
        "Read(./**/*.pem)", "Read(./**/*.key)", "Read(./**/id_rsa)",
        "Read(./**/secrets/**)",
        "Write(./00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**)",
        "Edit(./00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**)",
    ]

    # ask — harte Gates an irreversiblen/risikoreichen Punkten (BP-MD §7), stufenunabhängig.
    ask = ["Bash(git push:*)"]
    for name in irreversible + high_risk:
        ask.append(f"mcp__*__{name}")

    # allow + ask je Reifegrad. Niedrige Stufe: Schreiben/Bash fragt nach.
    if int(level) <= 2:
        allow = ["Read", "Glob", "Grep"]
        ask = ["Write", "Edit", "Bash"] + ask
    elif int(level) == 3:
        allow = ["Read", "Glob", "Grep", "Write", "Edit"]
        ask = ["Bash"] + ask
    else:  # Stufe 4 — autonom, aber Hooks + Telemetrie bleiben Gate.
        allow = ["Read", "Glob", "Grep", "Write", "Edit", "Bash"]

    # env — Transcript-Hygiene immer; Telemetrie ab Stufe 4 (Audit-Nachweisbarkeit).
    env = {"CLAUDE_CODE_SKIP_PROMPT_HISTORY": "1"}
    if int(level) >= 4:
        env["CLAUDE_CODE_ENABLE_TELEMETRY"] = "1"

    hook = lambda name: {  # noqa: E731 — kompakte Hook-Referenz
        "type": "command",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/" + name,
    }
    return json.dumps(
        {
            "$schema": "https://json.schemastore.org/claude-code-settings.json",
            "model": "claude-sonnet-4-6",
            "includeCoAuthoredBy": False,
            "cleanupPeriodDays": 30,
            "env": env,
            "permissions": {
                "defaultMode": level.default_mode,
                "allow": allow,
                "ask": ask,
                "deny": deny,
            },
            "hooks": {
                "PreToolUse": [
                    {
                        "matcher": "Write|Edit|MultiEdit|NotebookEdit",
                        "hooks": [hook("constitution-guard.sh")],
                    }
                ],
                "PostToolUse": [
                    {"matcher": "*", "hooks": [hook("audit-log.sh"), hook("stop-on-red.sh")]}
                ],
                "Stop": [{"matcher": "*", "hooks": [hook("checkpoint.sh")]}],
            },
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


def plugin_json(project: Project, graph: HarnessGraph) -> str:
    # v0.9 — Befehle sind Skills (kein doppeltes `commands`-Manifest mehr → keine
    # Kollisionswarnung). Plugin referenziert Agenten + die Slash-only-Skills.
    return json.dumps(
        {
            "name": "aegira-harness",
            "version": "1.0.0",
            "description": f"Cowork-Plugin für {project.title} (AEGIRA-Harness).",
            "agents": [a.name for a in graph.agents],
            "skills": list(_HARNESS_COMMANDS.keys()),
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


def mcp_json(graph: HarnessGraph) -> str | None:
    """`.mcp.json` (Schicht 10, v0.9/B1) — MCP-Server aus den Skill-Anforderungen.

    Aggregiert `CatalogSkill.required_mcps` der gewählten Skills zu Server-Einträgen.
    Credentials NUR als `${ENV}`-Referenz (nie Klartext, Constitution). Transport
    `http` für URL-artige Namen, sonst `stdio`. Gibt `None`, wenn kein Skill einen
    MCP-Server verlangt (dann wird keine Datei geschrieben).
    """
    needed: set[str] = set()
    for c in graph.catalog_skills:
        for m in c.required_mcps:
            if m and m != "—":
                needed.add(m)
    if not needed:
        return None

    servers: dict[str, Any] = {}
    for name in sorted(needed):
        key = name.strip()
        slug = key.lower().replace(" ", "-")
        env_token = "${" + slug.upper().replace("-", "_") + "_TOKEN}"
        if key.startswith("http://") or key.startswith("https://"):
            servers[slug] = {
                "type": "http",
                "url": key,
                "headers": {"Authorization": f"Bearer {env_token}"},
            }
        else:
            servers[slug] = {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", f"@modelcontextprotocol/server-{slug}"],
                "env": {f"{slug.upper().replace('-', '_')}_TOKEN": env_token},
            }
    return json.dumps({"mcpServers": servers}, indent=2, ensure_ascii=False) + "\n"


def rule_files() -> dict[str, str]:
    """`.claude/rules/*.md` (Schicht 3, v0.9/B2) — pfad-/themenskopierte Regeln.

    Verbindliche Zonen- und Naming-Regeln aus der Constitution, damit sie auch
    ohne geladenes Knowledge-Repo greifen.
    """
    zones = """---
description: AEGIRA-Zonenregeln — Schreibschutz der Constitution (Zone 2).
paths:
  - "00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**"
---

# Zonenregeln (AEGIRA-Constitution)

- **Zone 2** (`00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`) ist kanonisch und **schreibgeschützt**.
  Kein Write/Edit — der `constitution-guard`-Hook blockt dies zusätzlich deterministisch.
- **Zone 1** (`10_USER_FILES/USER-XXX/_INBOX|_DRAFT|_ARCHIVE/`) ist persönlich.
- **Zone 3** (alle übrigen Top-Level-Ordner) ist kollaborativ und beschreibbar.
"""
    naming = """---
description: AEGIRA-Naming für User-Files in Zone 1.
paths:
  - "10_USER_FILES/**"
---

# Naming-Konvention (Zone 1)

User-Files folgen `YYMMDD_HHMM_USER-XXX_THEMA-KURZ.ext`
(z. B. `260603_0930_USER-001_PLAN-REVIEW.md`). Datum/Uhrzeit zuerst, dann User-ID,
dann Kurzthema. Keine Leerzeichen; Umlaute vermeiden.
"""
    return {
        ".claude/rules/zones.md": zones,
        ".claude/rules/naming.md": naming,
    }


def matrix_export_md(plan: Plan) -> str:
    """Verantwortlichkeits-Matrix als eigenständiges Audit-Artefakt (D5, v0.9).

    Enthält BEIDE Sprachen: interne ZGPM-PVM-Codes und das RACI-Mapping (Anzeige-
    Standard). So ist die Ablage international anschlussfähig und methodisch eindeutig.
    """
    roles = list(plan.pvm_roles)
    header = "| Meilenstein | " + " | ".join(roles) + " | Regel |"
    sep = "|" + "---|" * (len(roles) + 2)
    lines = [
        "# Verantwortlichkeits-Matrix (PVM × RACI)",
        "",
        "PVM = interne ZGPM-Wahrheit · RACI = Anzeige-/Audit-Standard "
        "(A→R · L/F→A · E/e/B→C · I/V→I).",
        "",
        "## PVM-Matrix",
        "",
        header,
        sep,
    ]
    for m in plan.milestones:
        by_role = {r.role: r.code for r in m.responsibilities}
        cells = [by_role.get(role, "·") for role in roles]
        codes = list(by_role.values())
        a_ok = codes.count("A") >= 1
        fl_ok = (codes.count("F") + codes.count("L")) == 1
        e_ok = "e" not in codes or "E" in codes
        rule = "ok" if (a_ok and fl_ok and e_ok) else "⚠"
        lines.append(f"| {m.id} | " + " | ".join(cells) + f" | {rule} |")

    lines += [
        "",
        "## RACI-Matrix (Anzeige-Standard)",
        "",
        header,
        sep,
    ]
    pvm_to_raci = {"A": "R", "L": "A", "F": "A", "E": "C", "e": "C", "B": "C", "I": "I", "V": "I"}
    for m in plan.milestones:
        by_role = {r.role: pvm_to_raci.get(r.code, "·") for r in m.responsibilities}
        cells = [by_role.get(role, "·") for role in roles]
        raci = list(by_role.values())
        a_ok = raci.count("A") == 1
        r_ok = raci.count("R") >= 1
        rule = "ok" if (a_ok and r_ok) else "⚠"
        lines.append(f"| {m.id} | " + " | ".join(cells) + f" | {rule} |")
    lines.append("")
    return "\n".join(lines)


def agent_md(agent, plan: Plan) -> str:  # noqa: ANN001 — AgentSpec
    tools = list(agent.tools) + [f"skill:{s}" for s in agent.skills]
    tools_yaml = "\n".join(f"  - {t}" for t in tools) or "  - Read"
    tasks = "\n".join(f"- {t}" for t in agent.tasks) or "- (aus Plan abgeleitet)"
    # Frontmatter-`description` ist der Delegations-Trigger (Anthropic Subagent-Spec):
    # wofür dieser Subagent zuständig ist. Fällt auf die Mission zurück.
    desc = (getattr(agent, "description", "") or agent.mission).replace("\n", " ")
    responsibility = getattr(agent, "responsibility", "") or "(siehe Rolle)"
    return f"""---
name: {agent.name}
description: {desc}
model: {agent.model}
tools:
{tools_yaml}
---

# {agent.role}

## Verantwortung (eine, fokussiert)
{responsibility}

## Rolle
{agent.mission}

## Aufgaben
{tasks}

## Arbeitsweise (docs/04)
- Absolute Pfade ab `$HARNESS_ROOT`.
- Große Ergebnisse als Datei-Artefakt unter `plan/` ablegen, nur Referenz zurückgeben.
- Checkpoint nach jedem Knoten; Resume möglich.
- Guardrails laufen als eigener Prüf-Aufruf (Reviewer), nicht im Worker-Prompt.

## Anti-Muster (verboten, docs/04 §5)
Vage Delegation · Über-Spawning (>5 parallel) · fehlender Checkpoint · relative
Pfade · Diskutieren statt Delegieren. Der Reviewer-Agent prüft.
"""


def orchestration(graph: HarnessGraph) -> dict[str, Any]:
    """v0.4 — Orchestrierungs-Manifest (Stages/Muster) für den Export.

    Gleiche Stage = parallel (Sectioning); Stage-Reihenfolge = sequenziell
    (Chaining). Meta-Pattern: `handoff` wenn ein Router existiert, sonst `manager`.
    """
    by_stage: dict[int, dict[str, Any]] = {}
    for n in graph.nodes:
        slot = by_stage.setdefault(
            n.stage, {"stage": n.stage, "pattern": n.pattern, "agents": []}
        )
        slot["agents"].append({"label": n.label, "kind": n.kind})
    stages = [by_stage[k] for k in sorted(by_stage)]
    has_router = any(n.kind == "router" for n in graph.nodes)
    return {
        "meta_pattern": "handoff" if has_router else "manager",
        "stages": stages,
        "hitl_points": list(graph.hitl_points),
        "note": "Gleiche Stage = parallel (Sectioning); Stage-Reihenfolge = sequenziell (Chaining).",
    }


def guardrails_doc() -> dict[str, Any]:
    """v0.4 — Guardrail-Schicht (Trust-Layer) als Export-Manifest."""
    from . import catalog

    return {
        "policy": (
            "Layered Defense, optimistische Ausführung. High-Risk-Tools "
            "(Schreiben/irreversibel/Finanz/PII) pausieren für HITL-Freigabe."
        ),
        "guardrails": [
            {"id": g["id"], "label": g["label"], "kind": g["kind"], "desc": g["desc"]}
            for g in catalog.GUARDRAILS
        ],
    }


def skill_files(graph: HarnessGraph) -> dict[str, str]:
    """Schreibt SKILL.md je referenziertem Skill — **nur echte Inhalte**.

    v0.8 — keine generischen Hüllen mehr: Agenten sind ab Kompilierung mit echten,
    hydrierten Katalog-Skills vorbelegt (`graph.imported_skills`). Geschrieben wird
    genau das, was von einem Agenten referenziert wird UND echten Inhalt hat;
    Platzhalter-Skills entfallen vollständig."""
    out: dict[str, str] = {}
    referenced = {s for a in graph.agents for s in a.skills}
    for imp in graph.imported_skills:
        if imp.name in referenced:
            out[f".claude/skills/{imp.name}/SKILL.md"] = imp.content

    # v0.7 — Audit-Manifest der aus dem Repository gewählten Skills (docs/15 §4.5).
    # Macht die Auswahl nachweisbar (audit-ready): Trust-Tier, Quelle, Integrität.
    manifest = skill_manifest(graph)
    if manifest is not None:
        out[".claude/skills/_manifest.json"] = manifest
    return out


def skill_manifest(graph: HarnessGraph) -> str | None:
    """Erzeugt `.claude/skills/_manifest.json` aus den gewählten Katalog-Skills.

    Nur, wenn überhaupt kuratierte Skills gewählt wurden. Listet je Skill die
    audit-relevanten Felder (catalog_id, slug, version, autor, trust_tier, source,
    content_sha256). Deterministisch (nach catalog_id sortiert) → stabiler Hash."""
    if not graph.catalog_skills:
        return None
    entries = [
        {
            "catalog_id": c.catalog_id,
            "slug": c.slug,
            "title": c.title,
            "version": c.version,
            "author": c.author,
            "trust_tier": c.trust_tier.value,
            "source": c.source,
            "license": c.license,
            "domain": c.domain,
            "risk": c.risk,
            "has_scripts": c.has_scripts,
            "required_mcps": list(c.required_mcps),
            "content_sha256": c.content_sha256,
            "path": f".claude/skills/{c.slug}/SKILL.md",
        }
        for c in sorted(graph.catalog_skills, key=lambda c: c.catalog_id)
    ]
    return json.dumps(
        {
            "schema": "aegira-skill-manifest/1",
            "note": (
                "Trust-Tier ist eine Einstufung, keine Garantie. "
                "community/experimental und skript-tragende Skills durchlaufen das HITL-Gate."
            ),
            "count": len(entries),
            "skills": entries,
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


# v0.9 (B4/P1.4) — die 7 Harness-Befehle sind jetzt **Skills** (Anthropic empfiehlt
# Skills statt Commands; bei Namenskollision gewinnt der Skill). Als Slash-only
# (`disable-model-invocation: true`), damit das Modell sie nicht ungefragt auslöst.
_HARNESS_COMMANDS = {
    "run-harness": "Startet oder setzt den ZGPM-Plan-Run fort.",
    "show-plan": "Zeigt den Plan aus `$HARNESS_ROOT/plan/`.",
    "validate-plan": "Prüft die ZGPM-Konsistenz über die Rules-Engine.",
    "risk-view": "Listet Risiko-Ampeln (PRL + MRL).",
    "usage-report": "Zeigt den Token-Verbrauch je Agent/Knoten.",
    "reset-milestone": "Setzt einen Meilenstein zurück (Argument: id).",
    "explain": "Erklärt die ZGPM-Methodik im Kontext des Plans.",
}


def command_skill_files() -> dict[str, str]:
    """Die Harness-Befehle als Slash-only-Skills (`.claude/skills/<name>/SKILL.md`)."""
    out: dict[str, str] = {}
    for name, desc in _HARNESS_COMMANDS.items():
        out[f".claude/skills/{name}/SKILL.md"] = f"""---
name: {name}
description: {desc}
disable-model-invocation: true
---

# /{name}

{desc}

Arbeitet ausschließlich auf absoluten Pfaden ab `$HARNESS_ROOT`.
"""
    # Legacy-Hinweis: `.claude/commands/` ist abgelöst (Skills gewinnen bei Kollision).
    out[".claude/commands/README.md"] = (
        "# `.claude/commands/` — abgelöst (v0.9)\n\n"
        "Die Harness-Befehle (`/run-harness`, `/show-plan`, …) sind jetzt **Skills** "
        "unter `.claude/skills/<name>/SKILL.md` (Slash-only via `disable-model-invocation`).\n"
        "Claude Code lädt Skills bevorzugt; bei Namenskollision gewinnt der Skill. "
        "Dieses Verzeichnis bleibt nur als Migrationshinweis bestehen.\n"
    )
    return out


def hook_files() -> dict[str, str]:
    """`.claude/hooks/*.sh` — kanonische Command-Hooks (v0.9, P0.2).

    Hooks sind das einzige *deterministische* Trust-Instrument (BP-MD §4). Schema
    gegen die offizielle Hooks-Referenz verifiziert: Eingabe als JSON auf stdin,
    Blockieren via Exit-Code 2 **oder** `hookSpecificOutput.permissionDecision:"deny"`,
    Abbruch via `{"continue":false,"stopReason":…}`. Pfade über `${CLAUDE_PROJECT_DIR}`.
    Registriert werden sie in `.claude/settings.json` unter `hooks`.
    """
    return {
        # PreToolUse (matcher Write|Edit|…): blockt Schreibzugriffe auf die
        # Constitution (Zone 2) — greift auch im bypass-Modus und rekursiv für Subagents.
        ".claude/hooks/constitution-guard.sh": (
            "#!/usr/bin/env bash\n"
            "# AEGIRA constitution-guard (PreToolUse) — Zone-2-Schreibschutz.\n"
            "# Blockt Write/Edit auf 00_CLAUDE_KNOWLEDGE_ARCHITECTURE/** (Constitution).\n"
            "set -euo pipefail\n"
            "input=$(cat)\n"
            "path=$(printf '%s' \"$input\" | jq -r '.tool_input.file_path // .tool_input.path // \"\"')\n"
            "case \"$path\" in\n"
            "  *00_CLAUDE_KNOWLEDGE_ARCHITECTURE/*)\n"
            "    jq -n '{hookSpecificOutput:{hookEventName:\"PreToolUse\",permissionDecision:\"deny\","
            "permissionDecisionReason:\"Zone-2-Pfad — Schreibzugriff auf die Constitution ist gesperrt (AEGIRA-Constitution).\"}}'\n"
            "    exit 0 ;;\n"
            "esac\n"
            "exit 0\n"
        ),
        # PostToolUse (matcher *): append-only Audit-Log als datei-seitige Kompensation
        # der Cowork-Telemetrie-Lücke (BP-MD §5/§9).
        ".claude/hooks/audit-log.sh": (
            "#!/usr/bin/env bash\n"
            "# AEGIRA audit-log (PostToolUse) — append-only Tool-Audit.\n"
            "set -euo pipefail\n"
            "input=$(cat)\n"
            "tool=$(printf '%s' \"$input\" | jq -r '.tool_name // \"?\"')\n"
            "ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)\n"
            "dir=\"${CLAUDE_PROJECT_DIR:-.}/.harness\"\n"
            "mkdir -p \"$dir\"\n"
            "printf '%s\\t%s\\n' \"$ts\" \"$tool\" >> \"$dir/audit.log\"\n"
            "exit 0\n"
        ),
        # PostToolUse (matcher *): hält den Lauf an, sobald ein Tool-Ergebnis eine rote
        # Risiko-Ampel meldet — verlangt HITL-PM-Approval (continue:false).
        ".claude/hooks/stop-on-red.sh": (
            "#!/usr/bin/env bash\n"
            "# AEGIRA stop-on-red (PostToolUse) — Halt bei roter Risiko-Ampel.\n"
            "set -euo pipefail\n"
            "input=$(cat)\n"
            "out=$(printf '%s' \"$input\" | jq -r '.tool_response // .tool_result // \"\" | tostring' 2>/dev/null || echo \"\")\n"
            "if printf '%s' \"$out\" | grep -qiE 'ampel[\\\": ]*rot|\\\"red\\\"|risk[_-]?red'; then\n"
            "  jq -n '{continue:false,stopReason:\"Rote Risikoampel erkannt — HITL-PM-Approval erforderlich, bevor fortgesetzt wird.\"}'\n"
            "fi\n"
            "exit 0\n"
        ),
        # Stop (matcher *): Checkpoint nach jedem Lauf-Ende (docs/04 — Resume-Fähigkeit).
        ".claude/hooks/checkpoint.sh": (
            "#!/usr/bin/env bash\n"
            "# AEGIRA checkpoint (Stop) — markiert Lauf-Ende im Audit-Log.\n"
            "set -euo pipefail\n"
            "ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)\n"
            "dir=\"${CLAUDE_PROJECT_DIR:-.}/.harness\"\n"
            "mkdir -p \"$dir\"\n"
            "printf '%s\\tSTOP\\tcheckpoint\\n' \"$ts\" >> \"$dir/audit.log\"\n"
            "exit 0\n"
        ),
    }
