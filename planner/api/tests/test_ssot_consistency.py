"""SSOT-Konsistenz (v0.10) — RACI/Cost/Accountable ⊆ reales Harness-Team.

Regressionsschutz für die RACI/Roster-Divergenz (HANDOVER 2026-06-04): Plan-Layer
(zgpm_composer) und Harness-Team (catalog.defaults_for) leiten ihr Agenten-Roster
seit v0.10 aus EINER Quelle ab. Diese 10 Szenarien decken alle Klassifikations-Zweige
ab und erzwingen die Akzeptanzkriterien AC-1 (Roster-Identität), AC-2 (Accountable
plausibel), AC-3 (Budget-Deckung). Vor dem Fix wären alle 10 rot.
"""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.harness import catalog
from app.planning import zgpm_composer as zc
from app.schemas.project import Project

# (type, subtype) — deckt IT/Non-IT, mit/ohne Subtyp, Concept/Technical ab.
SCENARIOS = [
    ("it", "prototype-mvp"),      # 1 — der Ist-Bug
    ("it", "software-app"),       # 2
    ("it", "data-analytics"),     # 3
    ("it", "integration"),        # 4
    ("non-it", "concept-strategy"),  # 5
    ("non-it", "org-change"),     # 6
    ("non-it", "process-design"), # 7
    ("it", "ai-ml-agentic"),      # 8
    ("it", "automation-rpa"),     # 9
    ("it", None),                 # 10 — „ohne Subtyp"-Zweig
]


def _project(ptype: str, subtype: str | None, idx: int) -> Project:
    return Project(
        id=f"prj_sim_{idx}",
        tenantId="t1",
        owner_user_id="u1",
        title="SSOT-Sim",
        created_at=datetime.now(timezone.utc),
        project_type=ptype,
        project_subtype=subtype,
        project_nature=catalog.nature_for(ptype, subtype),
        target_platform="azure",
        understanding_summary="x",
    )


@pytest.mark.parametrize("ptype,subtype", SCENARIOS)
def test_plan_roster_subset_of_team(ptype: str, subtype: str | None) -> None:
    """AC-1/2/3: alle ausführenden Rollen, RACI-Rollen und Budget-Agenten sind im Team."""
    idx = SCENARIOS.index((ptype, subtype))
    project = _project(ptype, subtype, idx)
    team = catalog.defaults_for(ptype, subtype)
    labels = {a.label for a in team}
    plan = zc.compose(project, version=1, plan_id=f"pl_{idx}", team=team)

    # AC-2: jeder Accountable existiert im Team (keine Geister-Agenten).
    accountables = {r.role for m in plan.milestones for r in m.responsibilities if r.code == "A"}
    assert accountables <= labels, f"Geister-Accountable: {accountables - labels}"

    # AC-1: alle RACI-Rollen ⊆ Team.
    assert set(plan.raci_roles) <= labels, f"RACI-Rolle nicht im Team: {set(plan.raci_roles) - labels}"

    # AC-3: jeder budgetierte Agent existiert; Summe == Summe der festen Katalog-Budgets.
    budgeted = {e.agent for e in plan.token_budget}
    assert budgeted <= labels, f"Budget für Nicht-Team-Agent: {budgeted - labels}"
    expected = sum(a.token_budget for a in team if a.klass != "human" and a.token_budget > 0)
    assert sum(e.tokens_estimated for e in plan.token_budget) == expected


def test_no_ghost_agents_prototype_mvp() -> None:
    """Regression: it/prototype-mvp darf NICHT mehr Research/Security/DevOps als A führen."""
    project = _project("it", "prototype-mvp", 0)
    team = catalog.defaults_for("it", "prototype-mvp")
    plan = zc.compose(project, version=1, plan_id="pl_reg", team=team)
    accountables = {r.role for m in plan.milestones for r in m.responsibilities if r.code == "A"}
    ghosts = {"Research/Analyse-Agent", "Security-Agent", "DevOps/Deploy-Agent"}
    assert not (accountables & ghosts), f"Geister-Agent als Accountable: {accountables & ghosts}"


def test_pmo_canonical_name() -> None:
    """PMO-Drift behoben: kanonischer Name ist „PMO-Orchestrator" (nicht „PMO-Agent")."""
    project = _project("it", "software-app", 1)
    plan = zc.compose(project, version=1, plan_id="pl_pmo")
    assert "PMO-Orchestrator" in plan.raci_roles
    assert "PMO-Agent" not in plan.raci_roles


def test_invariant_blocks_ghost_role() -> None:
    """AP5: eine künstlich eingeschleuste Geister-Rolle MUSS ein hartes Gate-3-`fail` erzeugen."""
    from app.harness import compiler

    project = _project("it", "prototype-mvp", 0)
    plan = zc.compose(project, version=1, plan_id="pl_inv")
    # Drift simulieren: RACI verweist auf einen Agenten, der nicht im Team ist.
    plan.raci_roles = list(plan.raci_roles) + ["Geister-Agent"]
    graph = compiler.compile_graph(project, plan)
    fails = [f for f in graph.findings if f.severity == "fail"]
    assert any(f.rule == "consistency.raci-rolle-ohne-agent" for f in fails), (
        "Invariante hat die Geister-Rolle NICHT als fail erkannt"
    )


def test_clean_compile_has_no_consistency_fail() -> None:
    """Positivfall: ein sauber komponierter Plan erzeugt KEIN Konsistenz-`fail`."""
    from app.harness import compiler

    project = _project("it", "prototype-mvp", 0)
    plan = zc.compose(project, version=1, plan_id="pl_clean")
    graph = compiler.compile_graph(project, plan)
    bad = [f for f in graph.findings if f.rule.startswith("consistency.")]
    assert bad == [], f"Unerwartete Konsistenz-Findings: {[f.message for f in bad]}"


def test_skills_real_and_manifest_matches_disk() -> None:
    """AP7: emittierte Katalog-SKILL.md sind echt/ausführbar; Manifest deckt die Dateien."""
    from app.harness import compiler, templates

    project = _project("it", "prototype-mvp", 0)
    plan = zc.compose(project, version=1, plan_id="pl_sk")
    graph = compiler.compile_graph(project, plan)

    # Keine Skill-Konsistenz-fails (Manifest==Platte hält).
    assert not [f for f in graph.findings if f.rule.startswith("skills.")]

    files = templates.skill_files(graph)
    skill_md = {p: c for p, c in files.items() if p.endswith("SKILL.md")}
    assert skill_md, "keine SKILL.md emittiert"
    for path, content in skill_md.items():
        assert content.startswith("---") and "name:" in content, f"{path}: kein Frontmatter"
        assert "## Vorgehen" in content, f"{path}: kein ausführbarer Body"
        assert "reference-stub" not in content, f"{path}: noch alter Stub"

    # Jeder Manifest-Eintrag hat eine Datei (Manifest ⊆ Platte).
    written_slugs = {p.split("/")[-2] for p in skill_md}
    for c in graph.catalog_skills:
        assert c.slug in written_slugs, f"Manifest-Skill ohne Datei: {c.slug}"


def test_skill_manifest_invariant_blocks_missing_file() -> None:
    """AP7: ein Manifest-Eintrag ohne referenzierte/gefüllte Datei MUSS ein `fail` erzeugen."""
    from app.harness import compiler

    project = _project("it", "prototype-mvp", 0)
    plan = zc.compose(project, version=1, plan_id="pl_skinv")
    graph = compiler.compile_graph(project, plan)
    # Drift simulieren: Skill aus allen Agenten entfernen, aber im Manifest lassen.
    if graph.catalog_skills:
        orphan = graph.catalog_skills[0].slug
        for a in graph.agents:
            a.skills = [s for s in a.skills if s != orphan]
        extra = compiler._skill_consistency_findings(graph.agents, graph.imported_skills, graph.catalog_skills)
        assert any(f.rule == "skills.manifest-ohne-datei" and f.severity == "fail" for f in extra)


def test_composer_team_matches_compiler_source() -> None:
    """SSOT: ohne explizites Team leitet der Composer dasselbe Team ab wie der Compiler."""
    project = _project("it", "prototype-mvp", 0)
    plan = zc.compose(project, version=1, plan_id="pl_ssot")  # kein team= → interne Ableitung
    team_labels = {a.label for a in catalog.defaults_for("it", "prototype-mvp")}
    assert set(plan.raci_roles) <= team_labels
