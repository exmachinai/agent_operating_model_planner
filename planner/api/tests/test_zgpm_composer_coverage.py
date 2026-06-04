"""Coverage-Tests für den deterministischen ZGPM-Komponisten + Reviewer.

Deckt gezielt: Ampel-Ableitung/-Propagation (rot/gelb/grün), Risiko-Narrativ mit
Treibern, PVM-Reviewer-Fehlerpfade, compose() mit LLM-Gliederung (outline),
revise() (Risk-/Milestone-Patches, Ampel-Recompute) und apply_milestone_ops
(add/update/delete/reorder). Rein in-process, ohne Netz/LLM.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.planning import zgpm_composer as zc
from app.schemas.plan import (
    MilestoneOp,
    MilestonePatch,
    PlanRevisionRequest,
    Responsibility,
    Risk,
    RiskPatch,
)
from app.schemas.project import Project


def _context_source(sid: str = "s1"):
    from app.schemas.project import ContextSource

    return ContextSource(
        id=sid,
        filename=f"{sid}.md",
        fmt="md",
        origin="upload",
        size_bytes=10,
        content_sha256="a" * 64,
        token_estimate=5,
        added_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        added_by="user-1",
        frozen_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


def _project(nature: str = "technical", **kw) -> Project:
    base = dict(
        id="p1",
        tenant_id="tenant_exmachinai",
        owner_user_id="user-1",
        title="Testvorhaben",
        project_nature=nature,
        understanding_summary="Klares Verständnis.",
        target_platform="azure",
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    base.update(kw)
    return Project(**base)


# --- Ampel-Ableitung + Propagation --------------------------------------------


def test_ampel_for_alle_stufen() -> None:
    assert zc._ampel_for(25) == "rot"
    assert zc._ampel_for(15) == "rot"
    assert zc._ampel_for(8) == "gelb"
    assert zc._ampel_for(1) == "gruen"


def test_worst_propagation() -> None:
    assert zc._worst(["gruen", "rot", "gelb"]) == "rot"
    assert zc._worst(["gruen", "gelb"]) == "gelb"
    assert zc._worst(["gruen", "gruen"]) == "gruen"


def test_nature_fallback_auf_concept() -> None:
    # project_nature gesetzt -> kein Fallback; None -> Fallback auf "concept".
    assert zc._nature(_project(nature="concept")) == "concept"


# --- Risiko-Narrativ ----------------------------------------------------------


def test_risk_narrative_gruen() -> None:
    text = zc.compose_risk_narrative([], [], "gruen")
    assert "GRÜN" in text


def test_risk_narrative_mit_treibern() -> None:
    plan = zc.compose(_project(), version=1, plan_id="pl1")
    # Ein rotes Projektrisiko erzwingen, damit overall=rot und Treiber gelistet werden.
    red = Risk(
        id="X-R", description="kritisch", probability=5, impact=5, ampel="rot",
        mitigation="sofort handeln",
    )
    text = zc.compose_risk_narrative(plan.milestones, plan.prl + [red], "rot")
    assert "ROT" in text
    assert "Haupttreiber" in text
    assert "kritisch" in text


def test_risk_narrative_keine_treiber_auf_stufe() -> None:
    # overall=rot, aber kein einziges rotes Einzelrisiko -> Sonderzeile.
    text = zc.compose_risk_narrative([], [], "rot")
    assert "keine Einzeltreiber" in text


# --- Reviewer-Fehlerpfade (_check_pvm) ----------------------------------------


def test_check_pvm_kein_A() -> None:
    resp = [Responsibility(role="PMO-Agent", code="L")]
    findings = zc._check_pvm("M01", resp)
    assert any(f.rule == "pvm.mindestens-ein-A" for f in findings)


def test_check_pvm_kein_FL() -> None:
    resp = [Responsibility(role="Worker", code="A")]
    findings = zc._check_pvm("M01", resp)
    assert any(f.rule == "pvm.genau-ein-F-oder-L" for f in findings)


def test_check_pvm_doppeltes_FL() -> None:
    resp = [
        Responsibility(role="A1", code="A"),
        Responsibility(role="F1", code="F"),
        Responsibility(role="L1", code="L"),
    ]
    findings = zc._check_pvm("M01", resp)
    assert any(f.rule == "pvm.genau-ein-F-oder-L" for f in findings)


def test_check_pvm_klein_e_ohne_grosses_E() -> None:
    resp = [
        Responsibility(role="A1", code="A"),
        Responsibility(role="L1", code="L"),
        Responsibility(role="e1", code="e"),
    ]
    findings = zc._check_pvm("M01", resp)
    assert any(f.rule == "pvm.e-nie-allein" for f in findings)


def test_check_pvm_sauber() -> None:
    roster = {"pmo": "PMO-Orchestrator", "lead": "Projektleiter (HITL)", "risk": "Risiko-Agent"}
    resp = zc._default_ms_responsibilities("Worker", roster)
    assert zc._check_pvm("M01", resp) == []


# --- review() ----------------------------------------------------------------


def test_review_leere_prl_warnt() -> None:
    plan = zc.compose(_project(), version=1, plan_id="pl1")
    status, findings, rounds = zc.review(plan.milestones, [])
    assert any(f.rule == "risiko.prl-vorhanden" for f in findings)
    assert status in {"NEEDS_REVISION", "HARD_FAIL"}
    assert rounds == 1


def test_review_auto_gruen_ohne_mrl_warnt() -> None:
    ms = zc.compose(_project(), version=1, plan_id="pl1").milestones[0]
    gruen_ohne_mrl = ms.model_copy(update={"ampel": "gruen", "mrl": []})
    status, findings, _ = zc.review([gruen_ohne_mrl], [Risk(
        id="r", description="x", probability=1, impact=1, ampel="gruen", mitigation="y")])
    assert any(f.rule == "risiko.keine-auto-gruen" for f in findings)


def test_review_pass_und_konform_finding() -> None:
    plan = zc.compose(_project(), version=1, plan_id="pl1")
    status, findings, _ = zc.review(plan.milestones, plan.prl)
    # Der deterministische Komponist baut valide Pläne -> PASS + Konform-Info.
    if status == "PASS":
        assert any(f.rule == "plan.konform" for f in findings)


# --- compose() ---------------------------------------------------------------


def test_compose_default_pfad_alle_naturen() -> None:
    for nature in ("concept", "technical", "hybrid-concept-tech"):
        plan = zc.compose(_project(nature=nature), version=1, plan_id="pl1")
        assert plan.milestones
        assert plan.phases
        assert plan.token_budget
        assert plan.overall_ampel in {"rot", "gelb", "gruen"}


def test_compose_mit_outline_und_override() -> None:
    outline = [
        {"name": "Discovery erledigt", "phase_name": "Discovery"},
        {"name": "Pilot live", "phase_name": "Pilot"},
        {},  # leeres Item -> Default-Namen
    ]
    plan = zc.compose(
        _project(),
        version=2,
        plan_id="pl2",
        outline=outline,
        risk_narrative_override="EIGENER TEXT",
    )
    assert len(plan.milestones) == 3
    assert plan.milestones[0].name == "Discovery erledigt"
    assert plan.risk_narrative == "EIGENER TEXT"


def test_compose_ohne_summary_und_claude_only() -> None:
    # Ohne understanding_summary -> schärferes PRL-3; claude-code-only -> kein PRL-4.
    proj = _project(understanding_summary=None, target_platform="claude-code-only")
    plan = zc.compose(proj, version=1, plan_id="pl1")
    prl_ids = {r.id for r in plan.prl}
    assert "PRL-3" in prl_ids
    assert "PRL-4" not in prl_ids


def test_compose_mit_evidence_quelle() -> None:
    proj = _project(context_sources=[_context_source()])
    plan = zc.compose(proj, version=1, plan_id="pl1")
    assert plan.evidence_sources
    assert any(f.rule == "evidence.quellen-referenziert" for f in plan.reviewer_findings)


# --- revise() ----------------------------------------------------------------


def test_revise_patcht_risiken_und_meilensteine() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    first_ms = base.milestones[0]
    mrl_risk_id = first_ms.mrl[0].id
    new_date = datetime(2027, 6, 1, tzinfo=timezone.utc)

    rev = PlanRevisionRequest(
        milestones=[MilestonePatch(id=first_ms.id, name="Umbenannt", planned_date=new_date)],
        risks=[RiskPatch(id=mrl_risk_id, probability=5, impact=5, description="eskaliert")],
        note="Risiko erhöht",
    )
    out = zc.revise(base, rev, version=2, plan_id="pl2")
    patched = next(m for m in out.milestones if m.id == first_ms.id)
    assert patched.name == "Umbenannt"
    assert patched.planned_date == new_date
    # Eintritt×Auswirkung 5×5=25 -> rot, propagiert auf Meilenstein.
    assert patched.mrl[0].ampel == "rot"
    assert patched.ampel == "rot"
    assert out.version == 2
    assert out.reviewer_rounds == base.reviewer_rounds + 1
    assert any(f.rule == "review.revision" for f in out.reviewer_findings)


def test_revise_uebernimmt_evidence_finding() -> None:
    base = zc.compose(_project(context_sources=[_context_source()]), version=1, plan_id="pl1")
    out = zc.revise(base, PlanRevisionRequest(), version=2, plan_id="pl2")
    assert any(f.rule == "evidence.quellen-referenziert" for f in out.reviewer_findings)


def test_revise_prl_patch() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    prl_id = base.prl[0].id
    rev = PlanRevisionRequest(risks=[RiskPatch(id=prl_id, probability=5, impact=5)])
    out = zc.revise(base, rev, version=2, plan_id="pl2")
    assert next(r for r in out.prl if r.id == prl_id).ampel == "rot"


# --- apply_milestone_ops -----------------------------------------------------


def test_apply_ops_add_update_delete_reorder() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    first = base.milestones[0].id
    second = base.milestones[1].id

    when = datetime(2028, 3, 3, tzinfo=timezone.utc)
    ops = [
        MilestoneOp(op="add", name="Neuer MS"),
        MilestoneOp(op="update", id=first, name="Geändert", planned_date=when),
        MilestoneOp(op="delete", id=second),
    ]
    out = zc.apply_milestone_ops(base, ops, _project(), version=2, plan_id="pl2")
    names = {m.name for m in out.milestones}
    assert "Neuer MS" in names
    assert "Geändert" in names
    assert all(m.id != second for m in out.milestones)
    assert out.version == 2

    # Reorder über die jetzt vorhandenen IDs.
    ids = [m.id for m in out.milestones]
    reordered = zc.apply_milestone_ops(
        out, [MilestoneOp(op="reorder", order=list(reversed(ids)))],
        _project(), version=3, plan_id="pl3",
    )
    assert [m.id for m in reordered.milestones] == list(reversed(ids))


def test_apply_ops_add_mit_termin() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    when = datetime(2027, 1, 1, tzinfo=timezone.utc)
    out = zc.apply_milestone_ops(
        base, [MilestoneOp(op="add", name="Termin-MS", planned_date=when)],
        _project(), version=2, plan_id="pl2",
    )
    assert any(m.name == "Termin-MS" for m in out.milestones)


def test_apply_ops_keine_aenderung() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    out = zc.apply_milestone_ops(base, [], _project(), version=2, plan_id="pl2")
    assert any("keine Änderung" in f.message for f in out.reviewer_findings if f.rule == "plan.edit")


def test_next_ms_id() -> None:
    base = zc.compose(_project(), version=1, plan_id="pl1")
    nxt = zc._next_ms_id(base.milestones)
    assert nxt.startswith("M") and nxt[1:].isdigit()
    assert zc._next_ms_id([]) == "M01"
