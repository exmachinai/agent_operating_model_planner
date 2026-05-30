"""Deterministischer ZGPM-Komponist + Reviewer (Schritt 6).

Spec: docs/09_process-flow.md (Schritt 6) + docs/01_zgpm-method.md.

`compose()` simuliert den Orchestrator-Worker-Lauf: der PMO zerlegt in Phasen &
Meilensteine, Worker füllen PVM/Risiken/Aufwände, der Reviewer prüft gegen die
harten ZGPM-Regeln (Evaluator-Optimizer). Alles deterministisch, ohne LLM —
ersetzt wird das später durch den Foundry-Hookup. Die Methodentreue (genau ein
`F`/`L`, mindestens ein `A`, Ampel-Propagation, keine Auto-Grün ohne Risiko-
Eintrag) gilt schon jetzt und wird von `review()` real geprüft.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

from ..schemas.plan import (
    Activity,
    ActivityPatch,
    EvidenceSource,
    Milestone,
    MilestonePatch,
    Phase,
    Plan,
    PlanRevisionRequest,
    ReviewerFinding,
    ReviewerStatus,
    Responsibility,
    Risk,
    RiskAmpel,
    RiskPatch,
    Stream,
    TokenBudgetEntry,
)
from ..schemas.project import Project

# Phasen je Projektart. Meilenstein-Namen stehen im Perfekt (ZGPM-Konvention).
_PHASES: dict[str, list[tuple[str, str]]] = {
    "concept": [
        ("Discovery", "Discovery abgeschlossen"),
        ("Konzeption", "Konzept ausgearbeitet"),
        ("Validierung", "Konzept validiert"),
        ("Freigabe", "Konzept freigegeben"),
    ],
    "technical": [
        ("Discovery", "Discovery abgeschlossen"),
        ("Architektur", "Architektur entworfen"),
        ("Implementierung", "Implementierung fertiggestellt"),
        ("Härtung", "System gehärtet"),
        ("Freigabe", "Release freigegeben"),
    ],
    "hybrid-concept-tech": [
        ("Discovery", "Discovery abgeschlossen"),
        ("Konzeption", "Konzept ausgearbeitet"),
        ("Architektur", "Architektur entworfen"),
        ("Implementierung", "Implementierung fertiggestellt"),
        ("Validierung", "Lösung validiert"),
        ("Freigabe", "Release freigegeben"),
    ],
}

# Ergebnispfade je Projektart (max 2 Buchstaben + Ziffer).
_STREAMS: dict[str, list[Stream]] = {
    "concept": [
        Stream(code="P1", label="Methodik & Personen"),
        Stream(code="O1", label="Organisation"),
        Stream(code="D1", label="Dokumente"),
    ],
    "technical": [
        Stream(code="S1", label="Systeme"),
        Stream(code="D1", label="Daten & Doku"),
        Stream(code="O1", label="Organisation"),
    ],
    "hybrid-concept-tech": [
        Stream(code="P1", label="Methodik & Personen"),
        Stream(code="S1", label="Systeme"),
        Stream(code="O1", label="Organisation"),
        Stream(code="D1", label="Dokumente"),
    ],
}

# Lead-Worker je Projektart (bekommt `A` an den Meilensteinen).
_LEAD_WORKER: dict[str, str] = {
    "concept": "Methodik-Agent",
    "technical": "Architektur-Agent",
    "hybrid-concept-tech": "Architektur-Agent",
}

_ROLES = [
    "Projektleiter (HITL)",
    "PMO-Agent",
    "Architektur-Agent",
    "Methodik-Agent",
    "Risiko-Agent",
    "Fachbereich",
]

_PROJECT_LEAD = "Projektleiter (HITL)"
_PMO = "PMO-Agent"


def _ampel_for(score: int) -> RiskAmpel:
    """Risk-Matrix-Score (Eintritt × Auswirkung, 1–25) -> Ampel."""
    if score >= 15:
        return "rot"
    if score >= 8:
        return "gelb"
    return "gruen"


def _worst(ampeln: list[RiskAmpel]) -> RiskAmpel:
    """Ampel-Propagation nach oben: schlechteste gewinnt."""
    if "rot" in ampeln:
        return "rot"
    if "gelb" in ampeln:
        return "gelb"
    return "gruen"


def _nature(project: Project) -> str:
    # Gate 1 erzwingt project_nature; defensiv auf concept fallen.
    return project.project_nature or "concept"


def _build_milestones(project: Project, anchor: datetime) -> list[Milestone]:
    nature = _nature(project)
    phase_defs = _PHASES[nature]
    streams = _STREAMS[nature]
    lead = _LEAD_WORKER[nature]

    milestones: list[Milestone] = []
    prev_id: str | None = None

    for idx, (phase_name, ms_name) in enumerate(phase_defs):
        phase_id = f"PH{idx + 1:02d}"
        ms_id = f"M{idx + 1:02d}"
        stream = streams[idx % len(streams)]
        planned = anchor + timedelta(days=14 * (idx + 1))
        win_start = anchor + timedelta(days=14 * idx)

        # MRL: ein Risiko je Meilenstein. Eintritt/Auswirkung variieren
        # deterministisch über den Phasenindex; Ampel folgt der Risk-Matrix.
        prob = 2 + (idx % 3)
        impact = 3 + (idx % 2)
        mrl_ampel = _ampel_for(prob * impact)
        mrl = [
            Risk(
                id=f"{ms_id}-R1",
                description=f"Verzögerung oder Qualitätslücke in Phase {phase_name}.",
                probability=prob,
                impact=impact,
                ampel=mrl_ampel,
                mitigation="Frühes HITL-Review am Phasenübergang; Puffer eingeplant.",
            )
        ]

        # PVM Meilenstein: genau ein L (PMO steuert), ein A (Lead-Worker),
        # E beim Projektleiter (Entscheidung häufiger früh & auf MS-Ebene).
        ms_resp = [
            Responsibility(role=_PMO, code="L"),
            Responsibility(role=lead, code="A"),
            Responsibility(role=_PROJECT_LEAD, code="E"),
            Responsibility(role="Risiko-Agent", code="B"),
            Responsibility(role="Fachbereich", code="I"),
        ]

        # Eine Aktivität je Meilenstein. PVM Aktivität: ein F (PMO steuert
        # Fortschritt), ein A (Lead-Worker). Kein E auf Aktivitätsebene.
        activity = Activity(
            id=f"{ms_id}-A1",
            description=f"Arbeitspaket {phase_name} durchführen und Ergebnis sichern.",
            effort_pt=float(3 + 2 * (idx % 3)),
            start=win_start,
            end=planned,
            responsibilities=[
                Responsibility(role=lead, code="A"),
                Responsibility(role=_PMO, code="F"),
                Responsibility(role="Fachbereich", code="V"),
            ],
        )

        milestones.append(
            Milestone(
                id=ms_id,
                name=ms_name,
                phase_id=phase_id,
                stream_code=stream.code,
                planned_date=planned,
                predecessors=[prev_id] if prev_id else [],
                ampel=_worst([r.ampel for r in mrl]),
                responsibilities=ms_resp,
                activities=[activity],
                mrl=mrl,
            )
        )
        prev_id = ms_id

    return milestones


def _build_prl(project: Project) -> list[Risk]:
    prl = [
        Risk(
            id="PRL-1",
            description="ZGPM-Methodik-Konsistenz nicht durchgehend gewahrt.",
            probability=2,
            impact=4,
            ampel=_ampel_for(2 * 4),
            mitigation="Reviewer-Gate prüft PVM-Regeln je Knoten vor Freigabe.",
        ),
        Risk(
            id="PRL-2",
            description="Token-Budget je Agent/Knoten wird im Lauf überschritten.",
            probability=3,
            impact=3,
            ampel=_ampel_for(3 * 3),
            mitigation="Budget-Counter pro Knoten; Stop-Hook bei Überschreitung.",
        ),
    ]
    # Scope-Drift-Risiko sinkt, wenn ein Verständnis-Summary vorliegt (Gate 1).
    if project.understanding_summary:
        prl.append(
            Risk(
                id="PRL-3",
                description="Scope-Drift trotz freigegebenem Verständnis.",
                probability=2,
                impact=2,
                ampel=_ampel_for(2 * 2),
                mitigation="Verständnis ist eingefroren (Gate 1); Änderungen re-versionieren.",
            )
        )
    else:
        prl.append(
            Risk(
                id="PRL-3",
                description="Unscharfes Projektverständnis führt zu Scope-Drift.",
                probability=4,
                impact=3,
                ampel=_ampel_for(4 * 3),
                mitigation="Schärfungs-Interview nachholen, bevor gebaut wird.",
            )
        )
    # Plattform-Lock-in nur relevant, wenn an eine Cloud gebunden.
    if project.target_platform and project.target_platform != "claude-code-only":
        prl.append(
            Risk(
                id="PRL-4",
                description=f"Lock-in an Zielplattform {project.target_platform}.",
                probability=2,
                impact=3,
                ampel=_ampel_for(2 * 3),
                mitigation="Portables Harness-Zip; plattformneutrale Artefakte bevorzugen.",
            )
        )
    return prl


def _build_token_budget(n_milestones: int) -> list[TokenBudgetEntry]:
    """Kosten als Token-Budget je Agent & Knoten (grobe, deterministische Schätzung)."""
    return [
        TokenBudgetEntry(
            agent=_PMO, node="orchestration", tokens_estimated=8000 + 1500 * n_milestones
        ),
        TokenBudgetEntry(
            agent="Architektur-Agent", node="worker", tokens_estimated=2200 * n_milestones
        ),
        TokenBudgetEntry(
            agent="Methodik-Agent", node="worker", tokens_estimated=1800 * n_milestones
        ),
        TokenBudgetEntry(
            agent="Risiko-Agent", node="worker", tokens_estimated=1200 * n_milestones
        ),
        TokenBudgetEntry(
            agent="Reviewer-Agent", node="evaluator", tokens_estimated=2500 * n_milestones
        ),
    ]


def _hashable(plan_fields: dict) -> str:
    """Stabiler Inhalts-Hash über die Plan-Substanz (ohne Meta wie id/created_at)."""
    blob = json.dumps(plan_fields, sort_keys=True, default=str, ensure_ascii=False)
    return "sha256:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()


# --- Reviewer (Evaluator-Optimizer) -------------------------------------------


def _check_pvm(node_label: str, resp: list[Responsibility]) -> list[ReviewerFinding]:
    """Harte PVM-Konsistenzregeln (docs/01): >=1 A, genau ein F/L, e nie allein."""
    findings: list[ReviewerFinding] = []
    codes = [r.code for r in resp]

    if "A" not in codes:
        findings.append(
            ReviewerFinding(
                severity="fail",
                rule="pvm.mindestens-ein-A",
                message=f"{node_label}: kein Verantwortlicher (A).",
            )
        )
    fl = codes.count("F") + codes.count("L")
    if fl != 1:
        findings.append(
            ReviewerFinding(
                severity="fail",
                rule="pvm.genau-ein-F-oder-L",
                message=f"{node_label}: {fl} Fortschritts-Steuernde (F/L), erwartet genau 1.",
            )
        )
    if "e" in codes and "E" not in codes:
        findings.append(
            ReviewerFinding(
                severity="fail",
                rule="pvm.e-nie-allein",
                message=f"{node_label}: 'e' ohne zugehöriges 'E'.",
            )
        )
    return findings


def review(
    milestones: list[Milestone], prl: list[Risk]
) -> tuple[ReviewerStatus, list[ReviewerFinding], int]:
    """Prüft den Plan gegen die harten ZGPM-Regeln. Gibt Status, Befunde, Runden."""
    findings: list[ReviewerFinding] = []

    for ms in milestones:
        findings += _check_pvm(f"Meilenstein {ms.id}", ms.responsibilities)
        for act in ms.activities:
            findings += _check_pvm(f"Aktivität {act.id}", act.responsibilities)
        # Keine Auto-Grün ohne MRL-Eintrag (docs/01).
        if ms.ampel == "gruen" and not ms.mrl:
            findings.append(
                ReviewerFinding(
                    severity="warn",
                    rule="risiko.keine-auto-gruen",
                    message=f"Meilenstein {ms.id}: grüne Ampel ohne MRL-Eintrag.",
                )
            )

    if not prl:
        findings.append(
            ReviewerFinding(
                severity="warn",
                rule="risiko.prl-vorhanden",
                message="Projektrisikoliste (PRL) ist leer.",
            )
        )

    has_fail = any(f.severity == "fail" for f in findings)
    has_warn = any(f.severity == "warn" for f in findings)
    status: ReviewerStatus = (
        "HARD_FAIL" if has_fail else "NEEDS_REVISION" if has_warn else "PASS"
    )
    if not findings:
        findings.append(
            ReviewerFinding(
                severity="info",
                rule="zgpm.konform",
                message="Plan erfüllt PVM-Regeln und Ampel-Propagation.",
            )
        )
    # Der deterministische Komponist baut bereits valide Pläne -> eine Runde.
    return status, findings, 1


def compose(project: Project, version: int, plan_id: str) -> Plan:
    """Erzeugt eine ZGPM-konforme Planversion aus dem (Gate-1-)Verständnis."""
    now = datetime.now(timezone.utc)
    nature = _nature(project)

    phase_defs = _PHASES[nature]
    phases = [
        Phase(id=f"PH{i + 1:02d}", name=name, order=i + 1)
        for i, (name, _) in enumerate(phase_defs)
    ]
    streams = _STREAMS[nature]
    milestones = _build_milestones(project, now)
    prl = _build_prl(project)
    token_budget = _build_token_budget(len(milestones))

    # Eingefrorene Quellen-Nachweise (Schritt 2a) als Evidenz in den Plan ziehen.
    evidence = [
        EvidenceSource(
            id=s.id,
            filename=s.filename,
            fmt=s.fmt,
            origin=s.origin,
            content_sha256=s.content_sha256,
            frozen_at=s.frozen_at,
        )
        for s in project.context_sources
    ]

    overall = _worst([m.ampel for m in milestones] + [r.ampel for r in prl])
    status, findings, rounds = review(milestones, prl)
    if evidence:
        findings.append(
            ReviewerFinding(
                severity="info",
                rule="evidence.quellen-referenziert",
                message=f"{len(evidence)} Quelle(n) als Nachweis referenziert.",
            )
        )

    content = {
        "phases": [p.model_dump(mode="json") for p in phases],
        "streams": [s.model_dump(mode="json") for s in streams],
        "milestones": [m.model_dump(mode="json") for m in milestones],
        "prl": [r.model_dump(mode="json") for r in prl],
        "evidence_sources": [e.model_dump(mode="json") for e in evidence],
        "version": version,
    }
    plan_hash = _hashable(content)

    return Plan(
        id=plan_id,
        projectId=project.id,
        version=version,
        phases=phases,
        streams=streams,
        milestones=milestones,
        prl=prl,
        pvm_roles=_ROLES,
        token_budget=token_budget,
        overall_ampel=overall,
        reviewer_status=status,
        reviewer_findings=findings,
        reviewer_rounds=rounds,
        evidence_sources=evidence,
        plan_hash=plan_hash,
        planausgabedatum=now,
        kontrolliert_durch=project.owner_user_id,
        created_at=now,
    )


# --- Schritt 7: Revision (Inline-Edits -> neue Version) -----------------------


def _apply_risk_patch(risk: Risk, patch: RiskPatch) -> Risk:
    """Wendet einen Risk-Patch an; Ampel wird aus Eintritt × Auswirkung neu abgeleitet."""
    prob = patch.probability if patch.probability is not None else risk.probability
    impact = patch.impact if patch.impact is not None else risk.impact
    return risk.model_copy(
        update={
            "description": patch.description
            if patch.description is not None
            else risk.description,
            "mitigation": patch.mitigation
            if patch.mitigation is not None
            else risk.mitigation,
            "probability": prob,
            "impact": impact,
            "ampel": _ampel_for(prob * impact),
        }
    )


def revise(
    previous: Plan,
    revision: PlanRevisionRequest,
    version: int,
    plan_id: str,
) -> Plan:
    """Erzeugt aus einer Vorgängerversion + Inline-Edits eine neue Planversion.

    Methodentreue bleibt gewahrt: PVM-Struktur, Phasen, Streams und Evidenz werden
    übernommen; Ampeln werden nach den Edits neu propagiert (Risiko -> MRL ->
    Meilenstein -> Projekt) und der Reviewer prüft das Ergebnis erneut. Nichts wird
    überschrieben — die Revision ist eine neue, append-only Version.
    """
    now = datetime.now(timezone.utc)
    ms_patch = {p.id: p for p in revision.milestones}
    act_patch = {p.id: p for p in revision.activities}
    risk_patch = {p.id: p for p in revision.risks}

    # PRL: Risiken auf Projektebene patchen.
    prl = [_apply_risk_patch(r, risk_patch[r.id]) if r.id in risk_patch else r for r in previous.prl]

    milestones: list[Milestone] = []
    for ms in previous.milestones:
        # MRL-Risiken patchen, dann Meilenstein-Ampel aus MRL neu ableiten.
        mrl = [
            _apply_risk_patch(r, risk_patch[r.id]) if r.id in risk_patch else r
            for r in ms.mrl
        ]
        activities = []
        for act in ms.activities:
            if act.id in act_patch:
                ap = act_patch[act.id]
                activities.append(
                    act.model_copy(
                        update={
                            "description": ap.description
                            if ap.description is not None
                            else act.description,
                            "effort_pt": ap.effort_pt
                            if ap.effort_pt is not None
                            else act.effort_pt,
                        }
                    )
                )
            else:
                activities.append(act)

        update: dict = {
            "mrl": mrl,
            "activities": activities,
            "ampel": _worst([r.ampel for r in mrl]) if mrl else ms.ampel,
        }
        if ms.id in ms_patch:
            mp = ms_patch[ms.id]
            if mp.name is not None:
                update["name"] = mp.name
            if mp.planned_date is not None:
                update["planned_date"] = mp.planned_date
        milestones.append(ms.model_copy(update=update))

    overall = _worst([m.ampel for m in milestones] + [r.ampel for r in prl])
    status, findings, _ = review(milestones, prl)
    findings.append(
        ReviewerFinding(
            severity="info",
            rule="review.revision",
            message=f"Revision auf v{version} aus v{previous.version}"
            + (f": {revision.note}" if revision.note else "."),
        )
    )
    if previous.evidence_sources:
        findings.append(
            ReviewerFinding(
                severity="info",
                rule="evidence.quellen-referenziert",
                message=f"{len(previous.evidence_sources)} Quelle(n) als Nachweis referenziert.",
            )
        )

    content = {
        "phases": [p.model_dump(mode="json") for p in previous.phases],
        "streams": [s.model_dump(mode="json") for s in previous.streams],
        "milestones": [m.model_dump(mode="json") for m in milestones],
        "prl": [r.model_dump(mode="json") for r in prl],
        "evidence_sources": [e.model_dump(mode="json") for e in previous.evidence_sources],
        "version": version,
    }
    plan_hash = _hashable(content)

    return Plan(
        id=plan_id,
        projectId=previous.project_id,
        version=version,
        phases=previous.phases,
        streams=previous.streams,
        milestones=milestones,
        prl=prl,
        pvm_roles=previous.pvm_roles,
        token_budget=previous.token_budget,
        overall_ampel=overall,
        reviewer_status=status,
        reviewer_findings=findings,
        reviewer_rounds=previous.reviewer_rounds + 1,
        evidence_sources=previous.evidence_sources,
        plan_hash=plan_hash,
        planausgabedatum=now,
        kontrolliert_durch=previous.kontrolliert_durch,
        created_at=now,
    )
