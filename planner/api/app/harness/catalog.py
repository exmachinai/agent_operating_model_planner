"""Subagent-Katalog (v0.4, docs/11) — Weltklasse-Agentenvorlagen.

Grounded in Anthropic („Building Effective Agents", Multi-Agent Research,
Custom Subagents, Finance Agents) + OpenAI „A Practical Guide to Building
Agents". Jede Vorlage ist ein **fokussierter Subagent** (single responsibility)
mit Modell-Tier, least-privilege Tools (Typ + Risk-Rating) und Delegations-
Trigger. High-Risk-Tools triggern HITL (Trust-Layer).

Modell-Tiering (Default): Orchestrator = Opus, Worker/Evaluator = Sonnet,
breite/leichte Recherche = Haiku.
"""

from __future__ import annotations

from ..schemas.harness import CatalogAgent, ToolSpec

# Stabile Modell-Aliasse für den Export (Claude Code / Cowork).
OPUS = "claude-opus-4-8"
SONNET = "claude-sonnet-4-6"
HAIKU = "claude-haiku-4-5"


def _t(name: str, type_: str = "data", risk: str = "low", irreversible: bool = False) -> ToolSpec:
    return ToolSpec(name=name, type=type_, risk=risk, irreversible=irreversible)  # type: ignore[arg-type]


# Subtyp-Gruppen für die Vorbelegung.
_IT_ALL = [
    "software-app", "ai-ml-agentic", "data-analytics", "cloud-infra",
    "integration", "cybersecurity", "prototype-mvp", "automation-rpa",
]
_NONIT_ALL = [
    "concept-strategy", "compliance-governance", "org-change", "process-design",
    "enablement", "market-research", "documentation-audit", "procurement-vendor",
]

# --- Der Katalog -------------------------------------------------------------

_CATALOG: list[CatalogAgent] = [
    # === Steuerung ===========================================================
    CatalogAgent(
        id="pmo-orchestrator", label="PMO-Orchestrator", klass="control",
        kind="orchestrator", model=OPUS,
        description="Zerlegt das Vorhaben, delegiert an Spezialisten (Manager-Pattern) und synthetisiert die Ergebnisse; wacht über Budget und Gates.",
        mission="Plan in Teilaufgaben zerlegen, an die passenden Worker delegieren, Ergebnisse zu einem kohärenten Ganzen synthetisieren und das Token-/Zeitbudget überwachen.",
        responsibility="Orchestrierung & Synthese (eine Quelle der Wahrheit).",
        skills=["plan-sync", "budget-guard", "synthesis"],
        tools=[_t("read_plan", "data", "low"), _t("delegate_subagent", "orchestration", "medium"), _t("write_summary", "action", "low")],
        applies=["it", "non-it"], subtypes=_IT_ALL + _NONIT_ALL,
    ),
    CatalogAgent(
        id="router-triage", label="Router/Triage-Agent", klass="control",
        kind="router", model=SONNET,
        description="Klassifiziert eingehende Aufgaben und übergibt (Handoff) an den richtigen Spezialisten — für Decentralized/Handoff-Orchestrierung.",
        mission="Eingaben klassifizieren und an den passenden Spezialagenten übergeben; bei Unsicherheit an HITL eskalieren.",
        responsibility="Routing/Triage (Handoff).",
        skills=["classify", "dispatch"],
        tools=[_t("classify_intent", "data", "low"), _t("handoff", "orchestration", "medium")],
        applies=["it", "non-it"], subtypes=[],
    ),
    # === IT-Worker ===========================================================
    CatalogAgent(
        id="architecture-agent", label="Architektur-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="Entwirft System-/Lösungsarchitektur, Schnittstellen und Technologie-Entscheidungen mit Trade-offs.",
        mission="Tragfähige Architektur entwerfen (Komponenten, Schnittstellen, ADRs) und Trade-offs explizit machen.",
        responsibility="System-/Lösungsarchitektur.",
        skills=["system-design", "adr"],
        tools=[_t("read_context", "data", "low"), _t("write_doc", "action", "low")],
        applies=["it"], subtypes=["software-app", "ai-ml-agentic", "cloud-infra", "integration", "prototype-mvp"],
    ),
    CatalogAgent(
        id="data-agent", label="Daten-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="Datenmodell, Pipelines, Lineage und Datenqualität.",
        mission="Datenmodell und Pipelines entwerfen; Lineage und Qualität sicherstellen.",
        responsibility="Daten & Pipelines.",
        skills=["data-lineage", "data-quality"],
        tools=[_t("query_schema", "data", "low"), _t("write_pipeline_spec", "action", "low")],
        applies=["it"], subtypes=["data-analytics", "ai-ml-agentic", "integration"],
    ),
    CatalogAgent(
        id="security-agent", label="Security-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="Threat-Modeling, IAM, Secrets, Härtung; markiert Hochrisiko-Aktionen.",
        mission="Threat-Model erstellen, IAM/Secrets/Härtung prüfen; Hochrisiko-Funde zur HITL-Freigabe markieren.",
        responsibility="Sicherheit & Threat-Modeling.",
        skills=["threat-model", "iam-review"],
        tools=[_t("scan_config", "data", "low"), _t("flag_high_risk", "action", "high")],
        applies=["it"], subtypes=["cybersecurity", "cloud-infra", "software-app", "integration"],
    ),
    CatalogAgent(
        id="integration-agent", label="Integrations-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="API-Verträge, Schnittstellen, Idempotenz und Fehlersemantik.",
        mission="API-Verträge und Integrationsschnittstellen definieren (Idempotenz, Fehler, Versionierung).",
        responsibility="Integration & API-Verträge.",
        skills=["api-contract"],
        tools=[_t("read_openapi", "data", "low"), _t("write_contract", "action", "low")],
        applies=["it"], subtypes=["integration", "software-app", "automation-rpa"],
    ),
    CatalogAgent(
        id="devops-agent", label="DevOps/Deploy-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="CI/CD, IaC, Deploy-Pfade; Deploys sind Hochrisiko-Aktionen (HITL).",
        mission="CI/CD und IaC entwerfen; Deploy-Pfade definieren. Produktiv-Deploys als Hochrisiko an HITL.",
        responsibility="CI/CD & Deployment.",
        skills=["ci-cd", "iac"],
        tools=[_t("read_repo", "data", "low"), _t("trigger_deploy", "action", "high", irreversible=True)],
        applies=["it"], subtypes=["cloud-infra", "software-app", "automation-rpa"],
    ),
    CatalogAgent(
        id="implementation-agent", label="Implementierungs-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="Setzt Features inkrementell um und verifiziert End-to-End (nie fertig ohne Test).",
        mission="Features in kleinen Schritten implementieren und jeweils End-to-End verifizieren, bevor als fertig markiert wird.",
        responsibility="Implementierung mit Verifikation.",
        skills=["code", "e2e-verify"],
        tools=[_t("edit_files", "action", "medium"), _t("run_tests", "action", "low")],
        applies=["it"], subtypes=["software-app", "ai-ml-agentic", "prototype-mvp", "automation-rpa"],
    ),
    CatalogAgent(
        id="ux-agent", label="UX/Design-Agent", klass="worker-it",
        kind="worker", model=SONNET,
        description="UX-Flows, Wireframes, visuelle Konsistenz und Accessibility.",
        mission="UX-Flows und Screens entwerfen; visuelle Konsistenz und Accessibility prüfen.",
        responsibility="UX & Design.",
        skills=["ux-review", "a11y"],
        tools=[_t("read_brand", "data", "low"), _t("write_spec", "action", "low")],
        applies=["it"], subtypes=["prototype-mvp", "software-app"],
    ),
    # === Konzept-Worker (Non-IT / beide) =====================================
    CatalogAgent(
        id="methodology-agent", label="Methodik-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="Sichert ZGPM-Methodentreue (MECE, Pyramid, Hypothesen, PVM).",
        mission="Plan/Arbeit gegen ZGPM + McKinsey-Prinzipien prüfen (MECE, Pyramid, Hypothesen, PVM-Konsistenz).",
        responsibility="Methodik & ZGPM-Treue.",
        skills=["zgpm-validate", "mece"],
        tools=[_t("read_plan", "data", "low"), _t("write_findings", "action", "low")],
        applies=["it", "non-it"], subtypes=_IT_ALL + _NONIT_ALL,
    ),
    CatalogAgent(
        id="compliance-agent", label="Compliance-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="AIMS (ISO 42001 × CMMI) und EU-AI-Act-Konformität; Audit-Evidenz.",
        mission="Vorhaben gegen AIMS (ISO 42001) und EU-AI-Act prüfen; Nachweise/Evidenz für Audit-Readiness sammeln.",
        responsibility="Compliance & Governance (AIMS/EU-AI-Act).",
        skills=["aims-42001", "eu-ai-act", "evidence"],
        tools=[_t("read_context", "data", "low"), _t("write_evidence", "action", "low")],
        applies=["it", "non-it"], subtypes=["compliance-governance", "ai-ml-agentic", "documentation-audit", "cybersecurity"],
    ),
    CatalogAgent(
        id="risk-agent", label="Risiko-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="Risiken identifizieren, P×A-Scoring (Ampel) und Mitigationen.",
        mission="Risiken erfassen, mit Eintritt×Auswirkung scoren (Ampel), Mitigationen vorschlagen.",
        responsibility="Risiko-Management.",
        skills=["risk-traffic-light"],
        tools=[_t("read_plan", "data", "low"), _t("write_risks", "action", "low")],
        applies=["it", "non-it"], subtypes=_IT_ALL + _NONIT_ALL,
    ),
    CatalogAgent(
        id="research-agent", label="Research/Analyse-Agent", klass="worker-concept",
        kind="worker", model=HAIKU,
        description="Breite Recherche/Quellenarbeit mit Zitaten — leicht & parallelisierbar (Haiku).",
        mission="Breit recherchieren, Quellen sichten und mit Zitaten verdichten; Start breit, dann schmal.",
        responsibility="Recherche & Quellensynthese.",
        skills=["source-citation", "synthesis"],
        tools=[_t("web_search", "data", "low"), _t("read_doc", "data", "low")],
        applies=["non-it", "it"], subtypes=["market-research", "concept-strategy", "documentation-audit"],
    ),
    CatalogAgent(
        id="process-agent", label="Prozess-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="Prozess-Mapping, Operating-Model, Soll/Ist und Engpässe.",
        mission="Prozesse modellieren (Soll/Ist), Operating-Model und Engpässe sichtbar machen.",
        responsibility="Prozessdesign & Operating-Model.",
        skills=["process-map"],
        tools=[_t("read_context", "data", "low"), _t("write_process", "action", "low")],
        applies=["non-it"], subtypes=["process-design", "org-change", "procurement-vendor"],
    ),
    CatalogAgent(
        id="change-agent", label="Change/Org-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="Stakeholder-Map, Change-Story, Adoption und Enablement.",
        mission="Stakeholder mappen, Change-Story und Adoptionsmaßnahmen entwerfen.",
        responsibility="Change- & Organisationsmanagement.",
        skills=["stakeholder-map", "adoption"],
        tools=[_t("read_context", "data", "low"), _t("write_plan", "action", "low")],
        applies=["non-it"], subtypes=["org-change", "enablement", "concept-strategy"],
    ),
    CatalogAgent(
        id="doc-agent", label="Doku-Agent", klass="worker-concept",
        kind="worker", model=SONNET,
        description="Strukturierte Dokumentation, Handover und Audit-Pakete.",
        mission="Klar strukturierte Doku, Handover und Audit-Pakete erstellen.",
        responsibility="Dokumentation.",
        skills=["doc-structure"],
        tools=[_t("read_artifacts", "data", "low"), _t("write_doc", "action", "low")],
        applies=["it", "non-it"], subtypes=["documentation-audit", "compliance-governance", "enablement"],
    ),
    # === Qualität (Evaluator-Optimizer / Voting) =============================
    CatalogAgent(
        id="reviewer-agent", label="Reviewer/QA-Agent", klass="quality",
        kind="evaluator", model=SONNET,
        description="Bewertet Worker-Ergebnisse gegen Kriterien und gibt Feedback (Evaluator-Optimizer-Schleife).",
        mission="Ergebnisse gegen klare Kriterien bewerten, Mängel benennen, Verbesserung anstoßen (Schleife) — PASS/NEEDS_REVISION/FAIL.",
        responsibility="Qualitätsbewertung (Evaluator).",
        skills=["pvm-validate", "rubric-eval"],
        tools=[_t("read_output", "data", "low"), _t("write_verdict", "action", "low")],
        applies=["it", "non-it"], subtypes=_IT_ALL + _NONIT_ALL,
    ),
    CatalogAgent(
        id="test-agent", label="Test-Agent (E2E)", klass="quality",
        kind="evaluator", model=SONNET,
        description="Verifiziert Funktion End-to-End wie ein echter Nutzer (Browser/Tools), nie nur Unit.",
        mission="Funktionen End-to-End verifizieren (wie ein Nutzer), Beweise sichern; erst dann als fertig markieren.",
        responsibility="End-to-End-Verifikation.",
        skills=["test-plan", "e2e-verify"],
        tools=[_t("run_e2e", "action", "medium"), _t("capture_evidence", "data", "low")],
        applies=["it"], subtypes=["software-app", "ai-ml-agentic", "prototype-mvp", "automation-rpa"],
    ),
    CatalogAgent(
        id="redteam-agent", label="Red-Team/Critic-Agent", klass="quality",
        kind="evaluator", model=SONNET,
        description="Adversariale Prüfung: versucht, Annahmen und Ergebnisse zu widerlegen (Voting/Diversität).",
        mission="Annahmen und Ergebnisse adversarial angreifen; Schwachstellen/Bias aufdecken, bevor freigegeben wird.",
        responsibility="Adversariale Prüfung.",
        skills=["adversarial-review"],
        tools=[_t("read_output", "data", "low"), _t("write_critique", "action", "low")],
        applies=["it", "non-it"], subtypes=["ai-ml-agentic", "cybersecurity", "compliance-governance"],
    ),
    # === Mensch ==============================================================
    CatalogAgent(
        id="hitl-projektleiter", label="Projektleiter (HITL)", klass="human",
        kind="hitl", model="human",
        description="Menschlicher Checkpoint an Gates, High-Risk-Aktionen und roten Risiken.",
        mission="An Meilenstein-Gates, High-Risk-Tools und roten Risiken bewusst freigeben oder eskalieren.",
        responsibility="Human-in-the-Loop-Freigaben.",
        skills=[],
        tools=[],
        applies=["it", "non-it"], subtypes=_IT_ALL + _NONIT_ALL,
    ),
]

# --- Guardrails (Trust-Layer, Export guardrails.yaml) ------------------------

GUARDRAILS: list[dict] = [
    {"id": "relevance", "label": "Relevanz-Classifier", "kind": "llm",
     "desc": "Flaggt off-topic Anfragen außerhalb des Projektscopes."},
    {"id": "safety", "label": "Safety-/Jailbreak-Classifier", "kind": "llm",
     "desc": "Erkennt Prompt-Injection/Jailbreak-Versuche."},
    {"id": "pii", "label": "PII-Filter", "kind": "rule+llm",
     "desc": "Verhindert unnötige Preisgabe personenbezogener Daten."},
    {"id": "moderation", "label": "Moderation", "kind": "llm",
     "desc": "Flaggt schädliche/unangemessene Inhalte."},
    {"id": "tool-risk", "label": "Tool-Risk-Safeguard", "kind": "policy",
     "desc": "High-Risk-Tools (Schreiben/irreversibel/Finanz) pausieren für HITL."},
    {"id": "output-validation", "label": "Output-Validation", "kind": "rule+llm",
     "desc": "Markenkonforme, schema-valide Ausgaben (keine 100%-Claims)."},
]


# --- Helfer ------------------------------------------------------------------

def list_catalog() -> list[CatalogAgent]:
    """Vollständiger Katalog (für die Define-Agent-UI)."""
    return list(_CATALOG)


def by_id(agent_id: str) -> CatalogAgent | None:
    return next((a for a in _CATALOG if a.id == agent_id), None)


def tool_specs() -> dict[str, ToolSpec]:
    """Alle bekannten Tool-Specs (Name → Spec) aus dem Katalog, dedupliziert.

    Quelle der Risk-/Irreversibilitäts-Klassifikation (v0.9, C2). Agenten tragen nur
    Tool-Namen; hierüber wird die Klassifikation für HITL-Gates rekonstruiert.
    """
    specs: dict[str, ToolSpec] = {}
    for a in _CATALOG:
        for t in a.tools:
            specs.setdefault(t.name, t)
    return specs


def irreversible_tool_names() -> set[str]:
    """Namen aller als irreversibel markierten Tools (erzwingen Pflicht-HITL)."""
    return {n for n, t in tool_specs().items() if t.irreversible}


def high_risk_tool_names() -> set[str]:
    """Namen aller High-Risk-Tools (Schreiben/Finanz/PII) — `ask`-Kandidaten."""
    return {n for n, t in tool_specs().items() if t.risk == "high"}


def defaults_for(project_type: str | None, project_subtype: str | None) -> list[CatalogAgent]:
    """Vorbelegte Agenten je Projekttyp/Subtyp (Manager + passende Spezialisten + QA + HITL).

    Immer dabei: PMO-Orchestrator, Reviewer/QA, Projektleiter (HITL). Dazu die
    zum Subtyp passenden Spezialisten (oder die klassenweite Auswahl je type).
    """
    ptype = project_type or "non-it"
    chosen: list[CatalogAgent] = []
    for a in _CATALOG:
        always = a.id in ("pmo-orchestrator", "reviewer-agent", "hitl-projektleiter")
        if always:
            chosen.append(a)
            continue
        # Router/Triage ist opt-in (Handoff-Alternative zum Manager-Orchestrator).
        if a.kind == "router":
            continue
        if ptype not in a.applies:
            continue
        if project_subtype and a.subtypes and project_subtype not in a.subtypes:
            continue
        # Ohne Subtyp: nur die „beide/immer"-nahen Konzept-/Methodik-Agenten + Risiko.
        if not project_subtype and a.id not in (
            "methodology-agent", "risk-agent", "compliance-agent", "doc-agent",
        ):
            continue
        chosen.append(a)
    # Dedupe unter Beibehaltung der Reihenfolge.
    seen: set[str] = set()
    out: list[CatalogAgent] = []
    for a in chosen:
        if a.id not in seen:
            seen.add(a.id)
            out.append(a)
    return out
