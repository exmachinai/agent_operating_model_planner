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

# v0.4.1 — Ausführender Spezialist JE PHASE (bekommt `A`). Vorher lief die gesamte
# Ausführung auf einen einzigen Lead-Agenten → die Auslastungs-Kachel konnte
# strukturell nur einen Balken zeigen. Jetzt verteilt sich `A` über den Plan, damit
# das Operating Model real mehr-agentig ist und Engpässe sichtbar werden. Labels
# stammen 1:1 aus dem v0.4-Agentenkatalog (harness/catalog.py). Reihenfolge =
# Phasenreihenfolge in _PHASES.
_PHASE_AGENTS: dict[str, list[str]] = {
    "concept": [
        "Research/Analyse-Agent",  # Discovery
        "Methodik-Agent",          # Konzeption
        "Reviewer/QA-Agent",       # Validierung
        "Doku-Agent",              # Freigabe
    ],
    "technical": [
        "Research/Analyse-Agent",  # Discovery
        "Architektur-Agent",       # Architektur
        "Implementierungs-Agent",  # Implementierung
        "Security-Agent",          # Härtung
        "DevOps/Deploy-Agent",     # Freigabe
    ],
    "hybrid-concept-tech": [
        "Research/Analyse-Agent",  # Discovery
        "Methodik-Agent",          # Konzeption
        "Architektur-Agent",       # Architektur
        "Implementierungs-Agent",  # Implementierung
        "Reviewer/QA-Agent",       # Validierung
        "DevOps/Deploy-Agent",     # Freigabe
    ],
}

_PROJECT_LEAD = "Projektleiter (HITL)"
_PMO = "PMO-Agent"


def _phase_agents_unique(nature: str) -> list[str]:
    """Ausführende Phasen-Spezialisten, dedupliziert in Phasenreihenfolge."""
    seen: list[str] = []
    for a in _PHASE_AGENTS[nature]:
        if a not in seen:
            seen.append(a)
    return seen


def _roles_for(nature: str) -> list[str]:
    """PVM-Rollen-Reihenfolge für die Matrix: HITL + PMO, dann die ausführenden
    Phasen-Spezialisten, dann Querschnittsrollen (Risiko, Fachbereich)."""
    return [_PROJECT_LEAD, _PMO, *_phase_agents_unique(nature), "Risiko-Agent", "Fachbereich"]


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


def _default_outline(project: Project) -> list[dict]:
    """Deterministische Gliederung (Meilenstein-Namen + Phasenname).

    Quelle für den regelbasierten Pfad und Fallback, wenn der LLM-Planner keine
    Gliederung liefert. v0.6 — keine Aktivitätstexte mehr: der Plan endet auf
    Meilenstein-Ebene, die konkrete Arbeit übernehmen die Agenten autonom."""
    nature = _nature(project)
    return [
        {"name": ms_name, "phase_name": phase_name}
        for phase_name, ms_name in _PHASES[nature]
    ]


def _build_milestones_from_outline(
    project: Project, anchor: datetime, outline: list[dict]
) -> list[Milestone]:
    """Baut regelkonforme Meilensteine aus einer Gliederung (Namen + Phasen).

    PVM, MRL, Termine und Streams werden hier deterministisch ergänzt — egal ob die
    Gliederung vom LLM-Planner oder aus `_default_outline` stammt. v0.6 — keine
    Aktivitäten mehr: der Plan endet auf Meilenstein-Ebene."""
    nature = _nature(project)
    streams = _STREAMS[nature]
    phase_agents = _PHASE_AGENTS[nature]

    milestones: list[Milestone] = []
    prev_id: str | None = None

    for idx, item in enumerate(outline):
        ms_name = item.get("name") or f"Meilenstein {idx + 1}"
        phase_name = item.get("phase_name") or ms_name
        phase_id = f"PH{idx + 1:02d}"
        ms_id = f"M{idx + 1:02d}"
        stream = streams[idx % len(streams)]
        # v0.4.1 — ausführender Spezialist dieser Phase (bekommt `A`).
        lead = phase_agents[idx % len(phase_agents)]
        planned = anchor + timedelta(days=14 * (idx + 1))

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
        ms_resp = _default_ms_responsibilities(lead)

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
                mrl=mrl,
            )
        )
        prev_id = ms_id

    return milestones


def _build_milestones(project: Project, anchor: datetime) -> list[Milestone]:
    """Regelbasierter Standardweg: Meilensteine aus der Default-Gliederung."""
    return _build_milestones_from_outline(project, anchor, _default_outline(project))


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


def _build_token_budget(nature: str, n_milestones: int) -> list[TokenBudgetEntry]:
    """Kosten als Token-Budget je Agent & Knoten (grobe, deterministische Schätzung).

    Ein Worker-Eintrag je ausführendem Phasen-Spezialisten (v0.4.1), plus
    Orchestrierung (PMO), Risiko-Querschnitt und Evaluator (Reviewer/QA)."""
    entries = [
        TokenBudgetEntry(
            agent=_PMO, node="orchestration", tokens_estimated=8000 + 1500 * n_milestones
        )
    ]
    agents = _phase_agents_unique(nature)
    entries += [
        TokenBudgetEntry(agent=a, node="worker", tokens_estimated=2000 * n_milestones)
        for a in agents
    ]
    entries.append(
        TokenBudgetEntry(
            agent="Risiko-Agent", node="worker", tokens_estimated=1200 * n_milestones
        )
    )
    # Reviewer/QA nur als eigenen Evaluator-Knoten führen, wenn er nicht schon als
    # ausführender Phasen-Agent gelistet ist (sonst Doppel-Eintrag im Budget).
    if "Reviewer/QA-Agent" not in agents:
        entries.append(
            TokenBudgetEntry(
                agent="Reviewer/QA-Agent", node="evaluator", tokens_estimated=2500 * n_milestones
            )
        )
    return entries


def _hashable(plan_fields: dict) -> str:
    """Stabiler Inhalts-Hash über die Plan-Substanz (ohne Meta wie id/created_at)."""
    blob = json.dumps(plan_fields, sort_keys=True, default=str, ensure_ascii=False)
    return "sha256:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()


# --- Qualitatives Gesamtrisiko (Klartext, nicht nur „worst-of") --------------

_AMPEL_WORD = {"rot": "ROT", "gelb": "GELB", "gruen": "GRÜN"}


def compose_risk_narrative(milestones: list[Milestone], prl: list[Risk], overall: RiskAmpel) -> str:
    """Deterministische, laienverständliche Gesamtrisiko-Begründung.

    Erklärt nicht nur die Methode (schlechteste Einzelampel bestimmt das Gesamtbild),
    sondern benennt die konkreten Treiber-Risiken auf der aktuellen Ampelstufe samt
    Maßnahme — so wird das Gesamtrisiko qualitativ greifbar. Im LLM-Pfad wird dieser
    Text durch eine reichere Fassung ersetzt (llm_planner.compose_risk_narrative)."""
    drivers: list[tuple[str, Risk]] = []
    for ms in milestones:
        for r in ms.mrl:
            if r.ampel == overall:
                drivers.append((f"{ms.name}", r))
    for r in prl:
        if r.ampel == overall:
            drivers.append(("Projektrisiko", r))

    word = _AMPEL_WORD.get(overall, overall.upper())
    if overall == "gruen":
        return (
            f"Das Gesamtrisiko steht auf {word}. Es sind aktuell keine roten oder gelben "
            "Treiber erkennbar; die geplanten Maßnahmen je Meilenstein halten die Risiken "
            "klein. Das Gesamtbild folgt der schlechtesten Einzelampel — hier ist das grün."
        )

    lead = (
        f"Das Gesamtrisiko steht auf {word}, weil das Gesamtbild der schlechtesten "
        "Einzelampel folgt. Haupttreiber:"
    )
    if not drivers:
        return lead + " (keine Einzeltreiber auf dieser Stufe gefunden)."

    bullets = []
    for source, r in drivers[:4]:
        bullets.append(
            f"• {source}: {r.description} "
            f"(Eintritt {r.probability}×Auswirkung {r.impact}). "
            f"Gegenmaßnahme: {r.mitigation}"
        )
    tail = (
        " Werden diese Treiber wirksam gemildert, sinkt das Gesamtrisiko entsprechend."
    )
    return lead + "\n" + "\n".join(bullets) + tail


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


def compose(
    project: Project,
    version: int,
    plan_id: str,
    *,
    outline: list[dict] | None = None,
    risk_narrative_override: str | None = None,
) -> Plan:
    """Erzeugt eine ZGPM-konforme Planversion aus dem (Gate-1-)Verständnis.

    `outline` (optional, vom LLM-Planner) ersetzt die Default-Gliederung durch
    projektspezifische Meilenstein-Namen + Aktivitätstexte; PVM/Risiken/Termine
    werden weiterhin regelkonform ergänzt. `risk_narrative_override` setzt eine
    LLM-Fassung des Gesamtrisiko-Texts; sonst greift die deterministische."""
    now = datetime.now(timezone.utc)
    nature = _nature(project)

    if outline:
        milestones = _build_milestones_from_outline(project, now, outline)
        phases = [
            Phase(
                id=m.phase_id,
                name=(outline[i].get("phase_name") or m.name) if i < len(outline) else m.name,
                order=i + 1,
            )
            for i, m in enumerate(milestones)
        ]
    else:
        phase_defs = _PHASES[nature]
        phases = [
            Phase(id=f"PH{i + 1:02d}", name=name, order=i + 1)
            for i, (name, _) in enumerate(phase_defs)
        ]
        milestones = _build_milestones(project, now)
    streams = _STREAMS[nature]
    prl = _build_prl(project)
    token_budget = _build_token_budget(nature, len(milestones))

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
    risk_narrative = risk_narrative_override or compose_risk_narrative(milestones, prl, overall)
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
        pvm_roles=_roles_for(nature),
        token_budget=token_budget,
        overall_ampel=overall,
        reviewer_status=status,
        reviewer_findings=findings,
        reviewer_rounds=rounds,
        risk_narrative=risk_narrative,
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

        update: dict = {
            "mrl": mrl,
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
    risk_narrative = compose_risk_narrative(milestones, prl, overall)
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
        risk_narrative=risk_narrative,
        evidence_sources=previous.evidence_sources,
        plan_hash=plan_hash,
        planausgabedatum=now,
        kontrolliert_durch=previous.kontrolliert_durch,
        created_at=now,
    )


# --- Schritt 6a: geführte Edit-Operationen + Recompute -----------------------
# Der Anwender bearbeitet vorgeschlagene Meilensteine (umbenennen, löschen,
# hinzufügen, sortieren). PVM-Struktur und Risiken bleiben den ZGPM-Regeln
# vorbehalten: hinzugefügte Knoten erhalten regelkonforme Default-PVM, und nach
# jeder Operation werden Gantt-Termine, Token-Budget, Ampel-Propagation und das
# Risiko-Narrativ neu abgeleitet (`recompute`). Append-only: jede Op erzeugt
# eine neue Version.

from ..schemas.plan import MilestoneOp  # noqa: E402  (zyklusfrei, am Ende)


def _default_ms_responsibilities(lead: str) -> list[Responsibility]:
    """Regelkonforme PVM für einen Meilenstein (genau ein L, ein A)."""
    return [
        Responsibility(role=_PMO, code="L"),
        Responsibility(role=lead, code="A"),
        Responsibility(role=_PROJECT_LEAD, code="E"),
        Responsibility(role="Risiko-Agent", code="B"),
        Responsibility(role="Fachbereich", code="I"),
    ]


def _next_ms_id(milestones: list[Milestone]) -> str:
    nums = [int(m.id[1:]) for m in milestones if m.id[1:].isdigit()]
    return f"M{(max(nums) + 1) if nums else 1:02d}"


def _regen_gantt(milestones: list[Milestone], anchor: datetime) -> list[Milestone]:
    """Leitet Termine + Vorgänger neu aus der Meilenstein-Reihenfolge ab.

    Jeder Meilenstein bekommt ein 14-Tage-Fenster in Reihenfolge. So bleibt das
    Gantt nach jeder Edit-Op konsistent (kein verwaister Termin)."""
    rebuilt: list[Milestone] = []
    prev_id: str | None = None
    for idx, ms in enumerate(milestones):
        planned = anchor + timedelta(days=14 * (idx + 1))
        rebuilt.append(
            ms.model_copy(
                update={
                    "planned_date": planned,
                    "predecessors": [prev_id] if prev_id else [],
                }
            )
        )
        prev_id = ms.id
    return rebuilt


def _rebuild_plan(
    previous: Plan,
    milestones: list[Milestone],
    project: Project,
    version: int,
    plan_id: str,
    note: str,
) -> Plan:
    """Baut aus revidierten Meilensteinen eine neue Planversion (Recompute).

    Recompute = Gantt-Termine neu, Token-Budget neu (je Meilenstein-Zahl), Ampel-
    Propagation neu, Risiko-Narrativ neu, Reviewer erneut. PRL/Phasen/Streams/
    Evidenz bleiben. Append-only."""
    now = datetime.now(timezone.utc)
    nature = _nature(project)
    milestones = _regen_gantt(milestones, now)
    prl = previous.prl
    token_budget = _build_token_budget(nature, len(milestones))

    overall = _worst([m.ampel for m in milestones] + [r.ampel for r in prl])
    risk_narrative = compose_risk_narrative(milestones, prl, overall)
    status, findings, _ = review(milestones, prl)
    findings.append(
        ReviewerFinding(
            severity="info", rule="plan.edit", message=note,
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
        token_budget=token_budget,
        overall_ampel=overall,
        reviewer_status=status,
        reviewer_findings=findings,
        reviewer_rounds=previous.reviewer_rounds + 1,
        risk_narrative=risk_narrative,
        evidence_sources=previous.evidence_sources,
        plan_hash=plan_hash,
        planausgabedatum=now,
        kontrolliert_durch=previous.kontrolliert_durch,
        created_at=now,
    )


def apply_milestone_ops(
    previous: Plan, ops: list[MilestoneOp], project: Project, version: int, plan_id: str
) -> Plan:
    """Wendet Meilenstein-Operationen an (add/update/delete/reorder) → neue Version."""
    milestones = list(previous.milestones)
    nature = _nature(project)
    phase_agents = _phase_agents_unique(nature)
    notes: list[str] = []

    for op in ops:
        if op.op == "add":
            new_id = _next_ms_id(milestones)
            idx = len(milestones)
            lead = phase_agents[idx % len(phase_agents)] if phase_agents else _PMO
            phase = previous.phases[min(idx, len(previous.phases) - 1)] if previous.phases else None
            stream = previous.streams[idx % len(previous.streams)] if previous.streams else None
            prob, impact = 3, 3
            mrl = [
                Risk(
                    id=f"{new_id}-R1",
                    description=f"Risiko für „{op.name or new_id}“ noch zu schärfen.",
                    probability=prob,
                    impact=impact,
                    ampel=_ampel_for(prob * impact),
                    mitigation="Beim Review konkretisieren; HITL-Abnahme am Übergang.",
                )
            ]
            milestones.append(
                Milestone(
                    id=new_id,
                    name=op.name or f"Neuer Meilenstein {new_id}",
                    phase_id=phase.id if phase else "PH01",
                    stream_code=stream.code if stream else "P1",
                    planned_date=op.planned_date or datetime.now(timezone.utc),
                    predecessors=[],
                    ampel=_worst([r.ampel for r in mrl]),
                    responsibilities=_default_ms_responsibilities(lead),
                    mrl=mrl,
                )
            )
            notes.append(f"Meilenstein {new_id} hinzugefügt")
        elif op.op == "update" and op.id:
            for i, ms in enumerate(milestones):
                if ms.id == op.id:
                    upd: dict = {}
                    if op.name is not None:
                        upd["name"] = op.name
                    if op.planned_date is not None:
                        upd["planned_date"] = op.planned_date
                    milestones[i] = ms.model_copy(update=upd)
                    notes.append(f"Meilenstein {op.id} geändert")
                    break
        elif op.op == "delete" and op.id:
            milestones = [m for m in milestones if m.id != op.id]
            notes.append(f"Meilenstein {op.id} gelöscht")
        elif op.op == "reorder" and op.order:
            by_id = {m.id: m for m in milestones}
            milestones = [by_id[i] for i in op.order if i in by_id]
            # nicht genannte Meilensteine hinten anhängen (defensiv)
            milestones += [m for m in by_id.values() if m.id not in op.order]
            notes.append("Meilensteine neu sortiert")

    note = "Meilenstein-Bearbeitung (6a): " + ("; ".join(notes) if notes else "keine Änderung")
    return _rebuild_plan(previous, milestones, project, version, plan_id, note)
