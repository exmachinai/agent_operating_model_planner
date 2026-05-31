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

from ..schemas.harness import HarnessGraph
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
                "claude_code": ">=0.8",
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

- **Claude Code** (`>=0.8`) **oder Cowork** (`>=0.4`).
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
- `.claude/settings.json` — Modell, Hooks, MCP-Server, Pfade.
- `.claude/agents/*.md` — die Subagenten (s. u.).
- `plan/` — der freigegebene ZGPM-Plan als Single Source of Truth.

## 2. Agententeam

{agent_lines}

## 3. HITL — wann du gefragt wirst

{chr(10).join("- " + p for p in graph.hitl_points)}

## 4. Leitplanken (nicht verhandelbar)

Trust-Infrastructure-Framing · keine 100%-Claims · Rechtsräume DE/EU27-Rest/UK/CH ·
AIMS-Maturity · Produktnamen AI Navigator/Guardian/Commander · keine Secrets im
Klartext. Der `constitution-guard`-Hook blockt Schreibzugriffe auf
`00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`.

## 5. Wenn etwas hakt

- Integritätsfehler → Harness im Planner neu exportieren (Gate 3).
- Reviewer-FAIL nach 3 Runden → HITL-PM entscheidet.
- Rote Ampel → `stop-on-red`-Hook hält; `/risk-view` zeigt Details.

*exmachinAI · AEGIRA AI Trust Platform · Handover für Claude Code / Cowork.*
"""


def changelog_md(graph: HarnessGraph) -> str:
    return f"""# CHANGELOG

## {graph.created_at.date()} — kompiliert (Iteration {graph.iteration})

- Harness aus freigegebenem Plan v{graph.plan_version} (`{graph.plan_hash}`).
- {len(graph.agents)} Agenten, {len(graph.nodes)} Graph-Knoten.
- Schema `2.0.0-claude-native` (LangGraph-frei).
"""


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
    return json.dumps(
        {
            "$schema": "https://schema.claude.ai/claude-settings.json",
            "model": "claude-sonnet-4-6",
            "thinking_budget": "high",
            "permissions": {
                "allow": ["Read", "Glob", "Grep", "Write", "Edit"],
                "deny": ["Bash(rm -rf:*)", "Bash(curl:*)", "Bash(wget:*)"],
            },
            "hooks": {
                "pre_tool_use": [
                    ".claude/hooks/pre-tool/constitution-guard.json",
                    ".claude/hooks/pre-tool/token-budget.json",
                ],
                "post_tool_use": [".claude/hooks/post-tool/audit-log.json"],
                "stop": [".claude/hooks/stop/stop-on-red.json"],
            },
            "subagents_path": ".claude/agents/",
            "skills_path": ".claude/skills/",
            "commands_path": ".claude/commands/",
            "memory_path": "memory/",
            "state_path": ".harness/",
            "log_level": "info",
        },
        indent=2,
    ) + "\n"


def plugin_json(project: Project, graph: HarnessGraph) -> str:
    return json.dumps(
        {
            "name": "aegira-harness",
            "version": "1.0.0",
            "description": f"Cowork-Plugin für {project.title} (AEGIRA-Harness).",
            "agents": [a.name for a in graph.agents],
            "commands": [
                "run-harness", "show-plan", "validate-plan", "risk-view",
                "usage-report", "reset-milestone", "explain",
            ],
        },
        indent=2,
        ensure_ascii=False,
    ) + "\n"


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
thinking_budget: high
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
    """Erzeugt SKILL.md für jeden referenzierten Skill (deduped).

    v0.6 — vom Anwender importierte Skills (`graph.imported_skills`) werden
    **unverändert** geschrieben (echter Skill); nur für nicht-importierte Skills
    erzeugen wir die kuratierte Hülle."""
    skills = sorted({s for a in graph.agents for s in a.skills})
    imported = {s.name: s.content for s in graph.imported_skills}
    out: dict[str, str] = {}
    descriptions = {
        "zgpm-compose": "Komponiert ZGPM-Pläne (Phasen, Meilensteine, PVM).",
        "zgpm-rules-engine": "Prüft ZGPM-Konsistenz (≥1 A, genau 1 F/L, 'e' nie allein).",
        "pvm-validate": "Validiert die PVM-Matrix gegen die Konsistenzregeln.",
        "risk-traffic-light": "Leitet Risiko-Ampel aus Eintritt × Auswirkung ab.",
        "platform-discovery": "Klärt Projekt-Natur und Zielplattform.",
        "plan-evaluator": "Evaluator-Optimizer-Prüfung des Plans gegen die Regeln.",
    }
    for s in skills:
        if s in imported:
            out[f".claude/skills/{s}/SKILL.md"] = imported[s]
            continue
        desc = descriptions.get(s, f"Skill {s} für den Harness.")
        out[f".claude/skills/{s}/SKILL.md"] = f"""---
name: {s}
description: {desc} Trigger: wenn der Plan unter `$HARNESS_ROOT/plan/` betroffen ist.
---

# {s}

{desc}

## Verhalten
1. Lies die betroffenen Dateien unter `$HARNESS_ROOT/plan/`.
2. Wende die Regel an (siehe docs/01_zgpm-method.md im Planner-Repo).
3. Bei Verstoß: Konsolen-Output mit Knoten-ID, Regel und Fix-Vorschlag.
4. Bei OK: kurzes „PASS".
"""
    return out


def command_files() -> dict[str, str]:
    cmds = {
        "run-harness": "Startet oder setzt den ZGPM-Plan-Run fort.",
        "show-plan": "Zeigt den Plan aus `$HARNESS_ROOT/plan/`.",
        "validate-plan": "Prüft die ZGPM-Konsistenz über die Rules-Engine.",
        "risk-view": "Listet Risiko-Ampeln (PRL + MRL).",
        "usage-report": "Zeigt den Token-Verbrauch je Agent/Knoten.",
        "reset-milestone": "Setzt einen Meilenstein zurück (Argument: id).",
        "explain": "Erklärt die ZGPM-Methodik im Kontext des Plans.",
    }
    out: dict[str, str] = {}
    for name, desc in cmds.items():
        out[f".claude/commands/{name}.md"] = f"""---
name: {name}
description: {desc}
---

# /{name}

{desc}

Arbeitet ausschließlich auf absoluten Pfaden ab `$HARNESS_ROOT`.
"""
    return out


def hook_files() -> dict[str, str]:
    return {
        ".claude/hooks/pre-tool/constitution-guard.json": json.dumps(
            {
                "name": "constitution-guard",
                "trigger": "before_tool",
                "tool_pattern": "Write|Edit",
                "condition": "tool_input.path.contains('00_CLAUDE_KNOWLEDGE_ARCHITECTURE/')",
                "action": "block",
                "message": "Zone-2-Pfad — Schreibzugriff auf die Constitution ist gesperrt.",
            },
            indent=2,
        ) + "\n",
        ".claude/hooks/pre-tool/token-budget.json": json.dumps(
            {
                "name": "token-budget",
                "trigger": "before_tool",
                "action": "warn",
                "threshold_pct": 80,
                "message": "Token-Budget > 80% — HITL-PM-Approval vor Fortsetzung.",
            },
            indent=2,
        ) + "\n",
        ".claude/hooks/post-tool/audit-log.json": json.dumps(
            {
                "name": "audit-log",
                "trigger": "after_tool",
                "action": "append",
                "target": "$HARNESS_ROOT/.harness/audit.log",
            },
            indent=2,
        ) + "\n",
        ".claude/hooks/stop/stop-on-red.json": json.dumps(
            {
                "name": "stop-on-red",
                "trigger": "after_tool",
                "tool_pattern": "zgpm-rules-engine|risk-traffic-light",
                "condition": "tool_output.contains('rot') || tool_output.contains('red')",
                "action": "halt",
                "message": "Rote Risikoampel — HITL-PM-Approval erforderlich.",
                "require_hitl_ack": True,
            },
            indent=2,
        ) + "\n",
    }
