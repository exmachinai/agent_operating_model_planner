"""Harness-Compiler — freigegebener ZGPM-Plan (Gate 2) → portables Agent-Harness.

Spec: docs/03_harness-zip-spec.md + docs/04_agent-best-practices.md.

Drei Schritte:
1. `compile_graph()` leitet aus PVM-Rollen + Meilensteinen den Agenten-Graph ab
   (Orchestrator → Worker → Evaluator → HITL) und macht Anti-Muster sichtbar.
2. `apply_command()` revidiert den Graph (Sequenz/Parallel/Skill/Agent-CRUD),
   versioniert (max. Iterationen, kein Endlos-Loop).
3. `build_zip()` instanziert die Datei-Struktur, berechnet SHA-256 je Datei plus
   den Gesamt-Zip-Hash und zippt alles — inkl. CLAUDE.md, INSTALL/USERGUIDE/
   HANDOVER und der Plan-YAMLs.

Alles deterministisch, ohne LLM — derselbe Plan ergibt denselben Harness.
"""

from __future__ import annotations

import hashlib
import io
import re
import uuid
import zipfile
from datetime import datetime, timezone

from ..schemas.harness import (
    MAX_HARNESS_ITERATIONS,
    AgentSpec,
    ArtifactRef,
    HarnessFinding,
    HarnessGraph,
    HarnessNode,
    ReviseCommand,
)
from ..schemas.plan import Plan
from ..schemas.project import Project
from . import catalog, templates, yaml_emit

_SCHEMA_VERSION = "2.1.0-claude-native"
_COMPILER_ID = "aegira-planner@0.4.0"


# --- Slug / Ableitung ---------------------------------------------------------


def slugify(text: str) -> str:
    """Macht aus einem Titel/Rollennamen einen dateisicheren Slug."""
    text = text.lower()
    text = (
        text.replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "harness"


# PVM-Rolle → Agenten-Bauplan. `None` = keine autonome Agentendatei (z. B. nur
# informierte Stakeholder). Skills folgen docs/03 (verfügbare SKILL.md).
_ROLE_BLUEPRINT: dict[str, dict] = {
    "PMO-Agent": {
        "name": "pmo-agent",
        "kind": "orchestrator",
        "mission": (
            "Zerlegt den freigegebenen Plan in Phasen und Meilensteine und "
            "delegiert Arbeitspakete an die Worker (Orchestrator-Worker-Pattern). "
            "Persistiert den Lead-Plan in memory/lead_plan.md vor jedem Spawn."
        ),
        "skills": ["zgpm-compose", "zgpm-rules-engine"],
        "tools": ["Read", "Write", "Edit", "Glob", "Grep"],
    },
    "Architektur-Agent": {
        "name": "architecture-agent",
        "kind": "worker",
        "mission": (
            "Entwirft je Meilenstein die fachlich-technische Lösung und sichert "
            "das Ergebnis als Datei-Artefakt (Filesystem-Artifact-Pattern)."
        ),
        "skills": ["platform-discovery", "zgpm-compose"],
        "tools": ["Read", "Write", "Edit", "Glob", "Grep"],
    },
    "Methodik-Agent": {
        "name": "methodology-agent",
        "kind": "worker",
        "mission": (
            "Hält die ZGPM-Methodik durch (Meilensteine als Zustände, PVM-Codes, "
            "Ergebnispfade) und prüft die Konsistenzregeln je Knoten."
        ),
        "skills": ["zgpm-compose", "zgpm-rules-engine", "pvm-validate"],
        "tools": ["Read", "Write", "Edit", "Glob", "Grep"],
    },
    "Risiko-Agent": {
        "name": "risk-agent",
        "kind": "worker",
        "mission": (
            "Pflegt Projekt- und Meilensteinrisikolisten, leitet die Ampel aus "
            "Eintritt × Auswirkung ab und eskaliert rote Ampeln an die HITL-PM."
        ),
        "skills": ["risk-traffic-light"],
        "tools": ["Read", "Write", "Edit", "Grep"],
    },
    "Reviewer": {
        "name": "reviewer-agent",
        "kind": "evaluator",
        "mission": (
            "Evaluator-Optimizer: prüft jeden Worker-Output gegen die ZGPM-Regeln "
            "und die Anti-Muster aus docs/04. Max. 3 Iterationen, dann HITL."
        ),
        "skills": ["plan-evaluator", "zgpm-rules-engine"],
        "tools": ["Read", "Grep", "Glob"],
    },
    "Projektleiter (HITL)": {
        "name": "hitl-projektleiter",
        "kind": "hitl",
        "mission": (
            "Menschlicher Checkpoint (Human-in-the-Loop): gibt Meilensteine frei, "
            "quittiert rote Risiken, neue Skills und Budget-Überschreitungen."
        ),
        "skills": [],
        "tools": [],
        "hitl": True,
    },
}


def _derive_agents(plan: Plan, project: Project | None = None) -> list[AgentSpec]:
    """Leitet die Subagenten aus dem Katalog ab — vorbelegt je Projekttyp/Subtyp.

    v0.4 (docs/11): Weltklasse-Katalog (Modell-Tiering, least-privilege Tools mit
    Risk, Delegations-Trigger). Deterministisch. Aufgaben werden aus dem Plan je
    Agent abgeleitet. Ohne Projekttyp greift ein sinnvoller Non-IT-Default.
    """
    ptype = project.project_type if project else None
    psub = project.project_subtype if project else None
    templates_ = catalog.defaults_for(ptype, psub)

    agents: list[AgentSpec] = []
    for cat in templates_:
        agents.append(
            AgentSpec(
                id="ag_" + cat.id,
                role=cat.label,
                name=cat.id,
                kind=cat.kind,
                mission=cat.mission,
                description=cat.description,
                responsibility=cat.responsibility,
                tasks=_tasks_for(cat.id, plan),
                skills=list(cat.skills),
                tools=[t.name for t in cat.tools],
                hitl=(cat.kind == "hitl"),
                model=cat.model,
            )
        )
    return agents


def _tasks_for(name: str, plan: Plan) -> list[str]:
    """Konkrete Aufgaben je Agent — für Worker aus den Meilensteinen abgeleitet."""
    if name in ("pmo-agent", "pmo-orchestrator"):
        return [
            f"{len(plan.milestones)} Meilensteine orchestrieren und HITL-Freigaben einholen",
            "Lead-Plan in memory/lead_plan.md führen; nach jedem Knoten Checkpoint",
        ]
    if name == "reviewer-agent":
        return [
            "PVM-Regeln je Knoten prüfen (≥1 A, genau ein F/L, 'e' nie allein)",
            "Anti-Muster aus docs/04 flaggen; Ampel-Propagation verifizieren",
        ]
    if name == "hitl-projektleiter":
        return [f"{m.id} {m.name}: Freigabe" for m in plan.milestones]
    if name in ("architecture-agent", "methodology-agent"):
        return [
            f"{m.id} · {a.description}"
            for m in plan.milestones
            for a in m.activities
        ][:8]
    if name == "risk-agent":
        return [
            f"{r.id}: {r.description} (E{r.probability}×A{r.impact})"
            for r in plan.prl
        ]
    return []


def _build_nodes(agents: list[AgentSpec], parallel: bool = True) -> list[HarnessNode]:
    """Baut den Graph: Orchestrator → Worker (parallel|sequenziell) → Evaluator → HITL."""
    orchestrators = [a for a in agents if a.kind == "orchestrator"]
    workers = [a for a in agents if a.kind == "worker"]
    evaluators = [a for a in agents if a.kind == "evaluator"]
    hitls = [a for a in agents if a.kind == "hitl"]

    # v0.4 — Routers teilen sich Stage 0 mit dem Orchestrator (Handoff vs. Manager).
    routers = [a for a in agents if a.kind == "router"]

    nodes: list[HarnessNode] = []
    orch_id = None
    for a in orchestrators + routers:
        nid = f"n_{a.name}"
        if a.kind == "orchestrator":
            orch_id = nid
        nodes.append(
            HarnessNode(id=nid, label=a.role, kind=a.kind, agent_id=a.id, stage=0, pattern="route")
        )

    worker_ids: list[str] = []
    prev: str | None = orch_id
    for a in workers:
        nid = f"n_{a.name}"
        depends = [orch_id] if (parallel or prev is None) else [prev]
        depends = [d for d in depends if d]
        nodes.append(
            HarnessNode(
                id=nid, label=a.role, kind="worker", agent_id=a.id, depends_on=depends,
                stage=1, pattern="section" if parallel else "chain",
            )
        )
        worker_ids.append(nid)
        if not parallel:
            prev = nid

    eval_ids: list[str] = []
    for a in evaluators:
        nid = f"n_{a.name}"
        nodes.append(
            HarnessNode(
                id=nid, label=a.role, kind="evaluator", agent_id=a.id,
                depends_on=worker_ids or ([orch_id] if orch_id else []),
                stage=2, pattern="evaluator-optimizer",
            )
        )
        eval_ids.append(nid)

    for a in hitls:
        nid = f"n_{a.name}"
        nodes.append(
            HarnessNode(
                id=nid, label=a.role, kind="hitl", agent_id=a.id, hitl=True,
                depends_on=eval_ids or worker_ids, stage=3, pattern="chain",
            )
        )
    return nodes


def _hitl_points(plan: Plan) -> list[str]:
    """Feste HITL-Punkte (docs/04): Meilenstein, rotes Risiko, neuer Skill, Budget."""
    points = [f"{m.id} {m.name} — Meilenstein-Freigabe (HITL-PM)" for m in plan.milestones]
    for m in plan.milestones:
        if m.ampel == "rot":
            points.append(f"{m.id}: rote Ampel — HITL-PM-Approval vor Fortsetzung")
    for r in plan.prl:
        if r.ampel == "rot":
            points.append(f"{r.id}: rotes Projektrisiko — Klärung mit HITL-PM")
    points.append("Token-Budget > 80% — HITL-PM bestätigt Fortsetzung")
    points.append("Neuer Skill eingeführt — HITL-PM-Review vor Nutzung")
    return points


def _detect_anti_patterns(
    agents: list[AgentSpec], nodes: list[HarnessNode]
) -> list[HarnessFinding]:
    """Macht Anti-Muster aus docs/04 sichtbar (vage Delegation, Über-Spawning …)."""
    findings: list[HarnessFinding] = []

    workers = [n for n in nodes if n.kind == "worker"]
    # A5: höchstens 5 Worker parallel (Über-Spawning).
    parallel_count = sum(
        1 for n in workers if not any(d in {w.id for w in workers} for d in n.depends_on)
    )
    if parallel_count > 5:
        findings.append(
            HarnessFinding(
                severity="warn",
                rule="anti.ueber-spawning",
                message=f"{parallel_count} Worker parallel — docs/04 A5 empfiehlt max. 5.",
            )
        )

    # A4: vage Delegation — Mission zu dünn.
    for a in agents:
        if not a.hitl and len(a.mission.strip()) < 40:
            findings.append(
                HarnessFinding(
                    severity="warn",
                    rule="anti.vage-delegation",
                    message=f"Agent '{a.name}': Mission zu vage (docs/04 A4).",
                )
            )

    # A11: fehlender Checkpoint — kein HITL-Knoten im Graph.
    if not any(n.kind == "hitl" for n in nodes):
        findings.append(
            HarnessFinding(
                severity="fail",
                rule="anti.fehlender-checkpoint",
                message="Kein HITL-Checkpoint im Graph (docs/04 A11).",
            )
        )

    # Evaluator-Optimizer: Reviewer vorhanden?
    if not any(n.kind == "evaluator" for n in nodes):
        findings.append(
            HarnessFinding(
                severity="warn",
                rule="harness.kein-evaluator",
                message="Kein Reviewer/Evaluator — Evaluator-Optimizer fehlt (docs/04).",
            )
        )

    if not findings:
        findings.append(
            HarnessFinding(
                severity="info",
                rule="harness.preflight-ok",
                message="Preflight ohne Anti-Muster: Orchestrator-Worker mit HITL & Evaluator.",
            )
        )
    return findings


def compile_graph(project: Project, plan: Plan, *, harness_id: str | None = None) -> HarnessGraph:
    """Erzeugt den Harness-Graph aus dem freigegebenen Plan (Status `draft`)."""
    now = datetime.now(timezone.utc)
    agents = _derive_agents(plan, project)
    nodes = _build_nodes(agents, parallel=True)
    findings = _detect_anti_patterns(agents, nodes)
    slug = slugify(project.title)
    short = plan.plan_hash.split(":")[-1][:6]
    date = plan.planausgabedatum.strftime("%Y%m%d")

    return HarnessGraph(
        projectId=project.id,
        id=harness_id or ("hns_" + uuid.uuid4().hex[:12]),
        plan_version=plan.version,
        plan_hash=plan.plan_hash,
        status="draft",
        iteration=1,
        agents=agents,
        nodes=nodes,
        hitl_points=_hitl_points(plan),
        artifacts=[],
        findings=findings,
        zip_name=f"{slug}_{date}_{short}.harness.zip",
        created_at=now,
    )


# --- Revision (Schritt 8 Kommandofeld + Agent-CRUD) ---------------------------


def apply_command(graph: HarnessGraph, cmd: ReviseCommand) -> HarnessGraph:
    """Wendet ein Revisions-Kommando an und gibt einen neuen Graph-Entwurf zurück.

    Hebt `ValueError` bei ungültigen Kommandos (vom Router als 422 gemappt) und
    `RuntimeError`, wenn die maximale Iterationszahl erreicht ist (kein Loop).
    """
    if graph.status == "compiled":
        raise ValueError("Harness ist nach Gate 3 eingefroren — keine Revision mehr.")
    if graph.iteration >= MAX_HARNESS_ITERATIONS:
        raise RuntimeError(
            f"Maximale Revisionszahl ({MAX_HARNESS_ITERATIONS}) erreicht — "
            "bitte Harness freigeben (Gate 3) oder neu kompilieren."
        )

    agents = [a.model_copy(deep=True) for a in graph.agents]

    if cmd.command in ("sequence", "parallel"):
        parallel = cmd.command == "parallel"
        nodes = _build_nodes(agents, parallel=parallel)
    elif cmd.command == "skill":
        if not cmd.agent_id or not cmd.skill:
            raise ValueError("skill-Kommando braucht agent_id und skill.")
        target = next((a for a in agents if a.id == cmd.agent_id), None)
        if target is None:
            raise ValueError(f"Agent '{cmd.agent_id}' nicht gefunden.")
        if cmd.remove:
            target.skills = [s for s in target.skills if s != cmd.skill]
        elif cmd.skill not in target.skills:
            target.skills.append(cmd.skill)
        nodes = [n.model_copy(deep=True) for n in graph.nodes]
    elif cmd.command == "agent":
        agents, nodes = _apply_agent_op(graph, agents, cmd)
    else:  # pragma: no cover — durch Literal abgesichert
        raise ValueError(f"Unbekanntes Kommando: {cmd.command}")

    findings = _detect_anti_patterns(agents, nodes)
    if cmd.note:
        findings.append(
            HarnessFinding(severity="info", rule="revise.note", message=cmd.note)
        )
    return graph.model_copy(
        update={
            "agents": agents,
            "nodes": nodes,
            "findings": findings,
            "iteration": graph.iteration + 1,
            "artifacts": [],  # nach Revision neu zu kompilieren
        }
    )


def _apply_agent_op(
    graph: HarnessGraph, agents: list[AgentSpec], cmd: ReviseCommand
) -> tuple[list[AgentSpec], list[HarnessNode]]:
    if cmd.op == "delete":
        if not cmd.agent_id:
            raise ValueError("agent/delete braucht agent_id.")
        agents = [a for a in agents if a.id != cmd.agent_id]
    elif cmd.op == "add":
        if cmd.agent is None:
            raise ValueError("agent/add braucht ein agent-Objekt.")
        spec = cmd.agent.model_copy(deep=True)
        if not spec.id:
            spec.id = "ag_" + (slugify(spec.name) or uuid.uuid4().hex[:8])
        spec.name = slugify(spec.name)
        if any(a.id == spec.id or a.name == spec.name for a in agents):
            raise ValueError(f"Agent '{spec.name}' existiert bereits.")
        agents.append(spec)
    elif cmd.op == "update":
        if cmd.agent is None or not cmd.agent_id:
            raise ValueError("agent/update braucht agent_id und agent-Objekt.")
        idx = next((i for i, a in enumerate(agents) if a.id == cmd.agent_id), None)
        if idx is None:
            raise ValueError(f"Agent '{cmd.agent_id}' nicht gefunden.")
        patch = cmd.agent
        agents[idx] = agents[idx].model_copy(
            update={
                "role": patch.role or agents[idx].role,
                "name": slugify(patch.name) if patch.name else agents[idx].name,
                "mission": patch.mission or agents[idx].mission,
                "tasks": patch.tasks or agents[idx].tasks,
                "skills": patch.skills if patch.skills is not None else agents[idx].skills,
                "tools": patch.tools if patch.tools is not None else agents[idx].tools,
                "kind": patch.kind or agents[idx].kind,
                "hitl": patch.hitl,
            }
        )
    else:
        raise ValueError("agent-Kommando braucht op (add|update|delete).")

    # Graph nach Agent-Änderung neu verdrahten (Parallel-Default beibehalten).
    return agents, _build_nodes(agents, parallel=True)


# --- Datei-/Zip-Erzeugung -----------------------------------------------------


def build_files(graph: HarnessGraph, plan: Plan, project: Project) -> dict[str, str]:
    """Instanziert die komplette Harness-Datei-Struktur (Pfad → Inhalt)."""
    files: dict[str, str] = {}
    files["CLAUDE.md"] = templates.claude_md(project, plan, graph)
    files["README.md"] = templates.readme_md(project, plan, graph)
    files["INSTALL.md"] = templates.install_md(project, graph)
    files["USERGUIDE.md"] = templates.userguide_md(project, plan, graph)
    files["HANDOVER.md"] = templates.handover_md(project, plan, graph)
    files["CHANGELOG.md"] = templates.changelog_md(graph)
    files["LICENSE"] = templates.license_txt()
    files[".env.example"] = templates.env_example()
    files[".gitignore"] = templates.gitignore()

    # plan/
    files["plan/project.yaml"] = yaml_emit.dump(templates.plan_project(project, plan))
    files["plan/msp.yaml"] = yaml_emit.dump(templates.plan_msp(plan))
    files["plan/pvm.yaml"] = yaml_emit.dump(templates.plan_pvm(plan))
    files["plan/risks.yaml"] = yaml_emit.dump(templates.plan_risks(plan))
    files["plan/effort.yaml"] = yaml_emit.dump(templates.plan_effort(plan))
    files["plan/_version.json"] = templates.plan_version_json(
        plan, _SCHEMA_VERSION, _COMPILER_ID, graph.created_at
    )
    for m in plan.milestones:
        files[f"plan/activities/{m.id}.yaml"] = yaml_emit.dump(templates.plan_activities(m))

    # v0.4 — Orchestrierung (Stages/Muster) + Guardrails (Trust-Layer)
    files["orchestration.yaml"] = yaml_emit.dump(templates.orchestration(graph))
    files["guardrails.yaml"] = yaml_emit.dump(templates.guardrails_doc())

    # .claude/
    files[".claude/settings.json"] = templates.settings_json(graph)
    files[".claude/plugins/aegira-harness/plugin.json"] = templates.plugin_json(project, graph)
    for agent in graph.agents:
        files[f".claude/agents/{agent.name}.md"] = templates.agent_md(agent, plan)
    for path, content in templates.skill_files(graph).items():
        files[path] = content
    for path, content in templates.command_files().items():
        files[path] = content
    for path, content in templates.hook_files().items():
        files[path] = content

    # memory/
    files["memory/lead_plan.md"] = templates.lead_plan_md(plan)

    return files


def _kind_for(path: str) -> str:
    if path == "CLAUDE.md":
        return "claude-md"
    if path.startswith("plan/"):
        return "plan"
    if path.startswith(".claude/agents/"):
        return "agent"
    if path.startswith(".claude/skills/"):
        return "skill"
    if path.startswith(".claude/commands/"):
        return "command"
    if path.startswith(".claude/hooks/"):
        return "hook"
    return "doc"


def build_file_map(
    graph: HarnessGraph, plan: Plan, project: Project
) -> tuple[dict[str, str], list[ArtifactRef]]:
    """Komplette Harness-Dateien (Pfad → Inhalt) inkl. `checksums.txt` + Artefakte.

    Geteilte Basis für den **gepackten** Export (`build_zip`) und den **entpackten**
    Export (`GET /harness/files`) — so bleiben Dateien und Hashes bit-identisch,
    und `shasum -c checksums.txt` gilt für Zip wie Ordner gleichermaßen.
    `checksums.txt` listet alle übrigen Dateien (nicht sich selbst).
    """
    files = build_files(graph, plan, project)
    artifacts: list[ArtifactRef] = []
    checksum_lines: list[str] = []
    for path in sorted(files):
        raw = files[path].encode("utf-8")
        digest = hashlib.sha256(raw).hexdigest()
        artifacts.append(
            ArtifactRef(path=path, kind=_kind_for(path), sha256=digest, size_bytes=len(raw))
        )
        checksum_lines.append(f"{digest}  {path}")
    files["checksums.txt"] = "\n".join(checksum_lines) + "\n"
    return files, artifacts


def build_zip(
    graph: HarnessGraph, plan: Plan, project: Project
) -> tuple[bytes, list[ArtifactRef], str]:
    """Baut das signierte Harness-Zip; gibt (Zip-Bytes, Artefakt-Liste, Zip-SHA-256).

    Jede Datei liegt unter `<slug>/…`. `checksums.txt` enthält SHA-256 aller
    Dateien (shasum-Format); der Gesamt-Hash deckt das fertige Zip ab.
    """
    files, artifacts = build_file_map(graph, plan, project)
    root = graph.zip_name.replace(".harness.zip", "")

    buf = io.BytesIO()
    # Deterministisch: feste Reihenfolge + fixe Zeitstempel → stabiler Zip-Hash.
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(files):
            info = zipfile.ZipInfo(f"{root}/{path}")
            info.date_time = (2026, 1, 1, 0, 0, 0)
            info.external_attr = 0o644 << 16
            zf.writestr(info, files[path])

    data = buf.getvalue()
    zip_sha256 = "sha256:" + hashlib.sha256(data).hexdigest()
    return data, artifacts, zip_sha256
