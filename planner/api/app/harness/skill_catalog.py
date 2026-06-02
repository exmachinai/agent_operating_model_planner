"""Kuratierter Skill-Katalog (v0.7) — world-class, extern gevettet.

Self-contained Registry analog zu `harness/catalog.py` (Agentenkatalog). Seed
und Klassifizierung folgen `docs/16_skill-catalog-seed.md` (33 Skills). KEINE
AEGIRA-eigenen Methoden-Skills (separater `aegira-certified`-Strang).

Trust-Modell (docs/15 §4): `anthropic-vetted`/`world-top` werden vorselektiert,
`community`/`experimental` sind sichtbar, aber nie Default und durchlaufen das
Security-Gate. Trust-Tier ist eine *Einstufung*, keine Garantie (Eckpfeiler).

Inhalte werden zur Build-Zeit als **Katalog-Referenz-Stub** hydriert (`render_stub`)
inkl. `content_sha256`; kein Fremd-Originalinhalt (IP/Lizenz, docs/16 §0).
`project_types`/`subtypes` werden deterministisch aus den referenzierten
Agentenrollen (`catalog.by_id`) abgeleitet — eine Quelle der Wahrheit.
"""

from __future__ import annotations

import hashlib

from ..schemas.harness import CatalogSkill, SkillTrustTier
from . import catalog

# --- Seed-Daten (docs/16 §3) -------------------------------------------------
# (catalog_id, slug, title, description, author, source, trust_tier, domain,
#  agent_ids, risk, required_tools, required_mcps, has_scripts)
_SEED: list[tuple] = [
    # 3.1 Output & Dokumente
    ("docx-export_skill", "docx", "Word-Dokumente erstellen/bearbeiten",
     "Erzeugt und bearbeitet Word-Dokumente (.docx) mit TOC, Tabellen, Kopf-/Fußzeilen. Trigger: Word/.docx-Deliverable.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("doc-agent",), "low", ("file_io",), (), False),
    ("pptx-export_skill", "pptx", "Präsentationen erstellen",
     "Erstellt und bearbeitet PowerPoint-Präsentationen (.pptx) inkl. Layouts und Sprechernotizen. Trigger: Deck/Folien/Präsentation.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("doc-agent",), "low", ("file_io",), (), False),
    ("pdf-toolkit_skill", "pdf", "PDF verarbeiten",
     "Liest, erzeugt, splittet, merged und füllt PDF-Dateien (inkl. OCR). Trigger: PDF verarbeiten oder erzeugen.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("doc-agent",), "low", ("file_io",), (), False),
    ("xlsx-sheets_skill", "xlsx", "Excel-Tabellen",
     "Liest und schreibt Excel-/CSV-Tabellen inkl. Formeln, Formatierung und Charts. Trigger: Tabellen-Deliverable.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("doc-agent", "data-agent"), "low", ("file_io",), (), False),
    ("brand-guidelines_skill", "brand-guidelines", "Markenrichtlinien anwenden",
     "Wendet Markenfarben und Typografie konsistent auf Artefakte an. Trigger: Corporate-Design/Branding.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("doc-agent", "ux-agent"), "low", ("doc",), (), False),
    ("canvas-design_skill", "canvas-design", "Visuelles Design (PNG/PDF)",
     "Erstellt visuelles Design als PNG/PDF (Poster, Grafiken, Layouts). Trigger: statisches Design-Artefakt.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output",
     ("ux-agent", "doc-agent"), "low", ("image", "pdf"), (), True),
    ("readme-gen_skill", "readme-generator", "README erzeugen",
     "Erzeugt strukturierte, vollständige README-Dateien aus dem Projektkontext. Trigger: Projekt-README erstellen.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "output",
     ("doc-agent", "implementation-agent"), "low", ("file_io",), (), False),
    ("changelog-gen_skill", "changelog-generator", "Changelog erzeugen",
     "Erzeugt Changelogs/Release-Notes aus Commit- und Release-Historie. Trigger: Release-Notes/Changelog.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "output",
     ("doc-agent", "implementation-agent"), "low", ("file_io",), (), False),
    # 3.2 Implementierung & Git-Workflow
    ("webapp-testing_skill", "webapp-testing", "Web-App End-to-End testen",
     "Testet Web-Apps End-to-End im echten Browser (Playwright). Trigger: E2E-Verifikation einer Web-UI.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "engineering",
     ("implementation-agent", "test-agent"), "medium", ("browser",), ("playwright",), True),
    ("mcp-builder_skill", "mcp-builder", "MCP-Server bauen",
     "Baut hochwertige MCP-Server (Python/TypeScript) zur Integration externer Dienste. Trigger: MCP-Server/Tool-Integration entwickeln.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "engineering",
     ("integration-agent", "architecture-agent"), "low", ("code",), (), False),
    ("git-commit_skill", "git-commit-writer", "Commit-Messages schreiben",
     "Schreibt klare, konventionskonforme Commit-Messages. Trigger: Commit verfassen.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering",
     ("implementation-agent",), "low", ("git",), (), False),
    ("pr-description_skill", "pr-description-writer", "PR-Beschreibung schreiben",
     "Verfasst aussagekräftige Pull-Request-Beschreibungen aus dem Diff. Trigger: PR eröffnen/beschreiben.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering",
     ("implementation-agent", "reviewer-agent"), "low", ("scm",), (), False),
    ("env-doctor_skill", "env-doctor", "Umgebung diagnostizieren",
     "Diagnostiziert und repariert lokale Entwicklungsumgebungen. Trigger: Setup-/Umgebungsfehler.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering",
     ("implementation-agent", "devops-agent"), "medium", ("shell", "read"), (), True),
    # 3.3 Architektur, DevOps & IaC
    ("terraform-iac_skill", "terraform", "Terraform IaC",
     "Schreibt und prüft Terraform-Infrastructure-as-Code. Trigger: Infrastruktur als Code (Terraform). Deploy = HITL.",
     "HashiCorp", "https://github.com/hashicorp/agent-skills", "world-top", "devops",
     ("devops-agent",), "high", ("iac",), (), True),
    ("packer-build_skill", "packer", "Packer Images",
     "Baut reproduzierbare Maschinen-/Container-Images mit Packer. Trigger: Image-Build-Pipeline.",
     "HashiCorp", "https://github.com/hashicorp/agent-skills", "world-top", "devops",
     ("devops-agent",), "medium", ("iac", "build"), (), True),
    ("terraform-grounding_skill", "terrashark", "Terraform-Grounding",
     "Erdet Terraform-Vorschläge gegen reale Provider-Schemata (gegen Halluzination). Trigger: Terraform-Validierung.",
     "LukasNiessen", "https://github.com/LukasNiessen/terrashark", "community", "devops",
     ("devops-agent", "architecture-agent"), "medium", ("iac",), (), True),
    # 3.4 Data
    ("sql-database_skill", "sql-queries", "SQL & Datenbank",
     "Schreibt performante SQL über gängige Dialekte (Snowflake, BigQuery, Postgres …). Trigger: Datenbankabfrage/Analyse-SQL.",
     "AEGIRA-Stack/Community", "https://github.com/VoltAgent/awesome-agent-skills", "world-top", "data",
     ("data-agent",), "medium", ("db_query",), (), False),
    ("orm-migration_skill", "orm-migration", "ORM & Migration",
     "Erzeugt ORM-Modelle und versionierte Datenbank-Migrationen. Trigger: Schema-Migration.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "data",
     ("data-agent",), "medium", ("code", "migration"), (), True),
    ("data-viz_skill", "create-viz", "Daten visualisieren",
     "Erstellt publikationsreife Visualisierungen mit Python (matplotlib/plotly). Trigger: Diagramm/Chart aus Daten.",
     "AEGIRA-Stack", "internal:data-plugin", "world-top", "data",
     ("data-agent", "research-agent"), "low", ("code", "plot"), (), True),
    ("data-analyze_skill", "analyze", "Daten analysieren",
     "Profiliert und analysiert Datensätze (Shape, Qualität, Muster, Treiber). Trigger: Datenfrage/explorative Analyse.",
     "AEGIRA-Stack", "internal:data-plugin", "world-top", "data",
     ("data-agent", "research-agent"), "low", ("query", "analysis"), (), False),
    # 3.5 Security & Red-Team
    ("security-audit_skill", "trailofbits-suite", "Security-Audit/SAST",
     "Führt statische Sicherheitsanalysen/Audits durch (Gold-Standard SAST). Trigger: Security-Review von Code/Config.",
     "Trail of Bits", "https://github.com/trailofbits/skills", "world-top", "security",
     ("security-agent", "redteam-agent"), "medium", ("scan", "read"), (), True),
    ("vuln-remediation_skill", "snyk", "Vuln-Remediation",
     "Findet und behebt bekannte Schwachstellen in Dependencies (optional via PR). Trigger: Vuln-Scan/Remediation.",
     "Snyk", "https://snyk.io/articles/top-claude-skills-developers/", "world-top", "security",
     ("security-agent",), "high", ("scan", "pr"), (), True),
    ("pentest-autonomous_skill", "shannon", "Autonomes Pentesting",
     "Autonomes Pentesting inkl. Exploit-Ausführung. Trigger: offensive Sicherheitsprüfung. HITL-Pflicht.",
     "Community/Forschung", "https://github.com/VoltAgent/awesome-agent-skills", "experimental", "security",
     ("redteam-agent",), "high", ("exploit",), (), True),
    # 3.6 UX/Design
    ("ux-design_skill", "frontend-design", "Frontend-Design",
     "Entwirft Frontend-/UI-Designs als Code mit klarer Hierarchie. Trigger: UI/Frontend gestalten.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "design",
     ("ux-agent",), "low", ("code", "design"), (), False),
    ("web-design-review_skill", "web-design-guidelines", "Web-Design-Review",
     "Prüft Web-UIs gegen 100+ Design-/A11y-/Performance-Regeln. Trigger: Web-Design-Review.",
     "Vercel", "https://vercel.com", "world-top", "design",
     ("ux-agent", "reviewer-agent"), "low", ("review", "read"), (), False),
    ("theme-factory_skill", "theme-factory", "Theme-Factory",
     "Erzeugt konsistente Design-Themes/Tokens. Trigger: Theme/Designsystem aufbauen.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "design",
     ("ux-agent",), "low", ("style",), (), False),
    ("accessibility-audit_skill", "accessibility-review", "Accessibility-Audit",
     "Auditiert Designs/Seiten gegen WCAG 2.1 AA (Kontrast, Tastatur, Touch-Ziele). Trigger: Accessibility-Prüfung.",
     "AEGIRA-Stack", "internal:design-plugin", "world-top", "design",
     ("ux-agent", "reviewer-agent"), "low", ("review", "read"), (), False),
    # 3.7 Test/QA
    ("code-review_skill", "code-review", "Code-Review",
     "Reviewt Code-Änderungen auf Korrektheit, Sicherheit und Performance. Trigger: PR/Diff-Review.",
     "reputable Vendor/Community", "https://github.com/VoltAgent/awesome-agent-skills", "world-top", "engineering",
     ("reviewer-agent",), "low", ("read", "diff"), (), False),
    ("tdd-enforcement_skill", "superpowers-tdd", "TDD-Enforcement",
     "Erzwingt test-getriebene Entwicklung (rot-grün-refactor). Trigger: TDD-Workflow.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering",
     ("test-agent", "implementation-agent"), "low", ("test", "code"), (), False),
    # 3.8 Research, Prompting & PM
    ("deep-research_skill", "deep-research", "Deep Research",
     "Tiefe, mehrquellige, faktengeprüfte Recherche mit Zitaten (Fan-out + Verifikation). Trigger: Recherche-Report.",
     "Anthropic-nah", "https://github.com/anthropics/skills", "world-top", "research",
     ("research-agent",), "low", ("web_search",), (), False),
    ("prompting_skill", "prompting-best-practices", "Prompt-Engineering",
     "Best Practices für Prompt-Engineering mit aktuellen Claude-Modellen. Trigger: Prompt schreiben/optimieren.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "methodology",
     ("pmo-orchestrator", "methodology-agent"), "low", ("doc",), (), False),
    ("skill-creator_skill", "skill-creator", "Skill-Creator",
     "Erstellt, bearbeitet und optimiert Skills (inkl. Eval). Trigger: Skill bauen/verbessern.",
     "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "methodology",
     ("pmo-orchestrator",), "low", ("file_io",), (), True),
    ("prd-authoring_skill", "prd-creation", "PRD-Authoring",
     "Verfasst strukturierte Product-Requirement-Dokumente. Trigger: PRD/Anforderungsdokument.",
     "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "methodology",
     ("pmo-orchestrator", "change-agent"), "low", ("doc",), (), False),

    # === AEGIRA-eigene Methoden-/Konzept-Skills (aegira-certified) ===========
    # Intern geprüft, funktionsfähig. Ersetzen die früheren Platzhalter-Tags, damit
    # JEDE Agentenrolle echte, freigegebene Skills trägt (keine Fakes mehr).
    ("zgpm-plan_skill", "zgpm-plan", "ZGPM-Plan komponieren",
     "Komponiert und prüft ZGPM-Pläne (Phasen, Meilensteine, PVM, Konsistenzregeln: ≥1 A, genau 1 F/L, 'e' nie allein). Trigger: Plan strukturieren/validieren.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("pmo-orchestrator", "methodology-agent"), "low", ("read", "write"), (), False),
    ("pvm-validate_skill", "pvm-validate", "PVM-Matrix validieren",
     "Validiert die Personen-Verantwortungs-Matrix gegen die ZGPM-Konsistenzregeln. Trigger: PVM/Rollenmatrix prüfen.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("methodology-agent", "reviewer-agent"), "low", ("read",), (), False),
    ("mece-check_skill", "mece-check", "MECE-/Pyramid-Prüfung",
     "Prüft Struktur auf MECE-Konformität und Pyramid-Logik (McKinsey-Prinzipien). Trigger: Gliederung/Argumentation schärfen.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("methodology-agent",), "low", ("read",), (), False),
    ("risk-traffic-light_skill", "risk-traffic-light", "Risiko-Ampel (E×A)",
     "Leitet die Risiko-Ampel aus Eintritt × Auswirkung ab und schlägt Mitigationen vor (grün<8 · gelb 8–14 · rot≥15). Trigger: Risiken scoren.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("risk-agent",), "low", ("read", "write"), (), False),
    ("aims-compliance_skill", "aims-compliance", "AIMS-Konformität (ISO 42001)",
     "Prüft das Vorhaben gegen AIMS (ISO 42001 × CMMI) und sammelt Audit-Evidenz. Trigger: Compliance/Governance-Nachweis.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("compliance-agent",), "low", ("read", "write"), (), False),
    ("eu-ai-act_skill", "eu-ai-act", "EU-AI-Act-Konformität",
     "Bewertet Risikoklasse und Pflichten nach EU AI Act (Forcing Event 02.12.2027). Trigger: EU-AI-Act-Check.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("compliance-agent",), "low", ("read",), (), False),
    ("adr-design_skill", "adr-design", "Architektur & ADR",
     "Entwirft System-/Lösungsarchitektur und dokumentiert Entscheidungen als ADR mit Trade-offs. Trigger: Architektur/ADR.",
     "exmachinAI", "internal:aegira", "aegira-certified", "engineering",
     ("architecture-agent",), "low", ("read", "write"), (), False),
    ("api-contract_skill", "api-contract", "API-Verträge",
     "Definiert API-Verträge/Schnittstellen (Idempotenz, Fehler, Versionierung). Trigger: Integrationsschnittstelle.",
     "exmachinAI", "internal:aegira", "aegira-certified", "engineering",
     ("integration-agent",), "low", ("read", "write"), (), False),
    ("threat-model_skill", "threat-model", "Threat-Modeling",
     "Erstellt ein Threat-Model (STRIDE), prüft IAM/Secrets/Härtung, markiert Hochrisiko zur HITL-Freigabe. Trigger: Sicherheitsanalyse.",
     "exmachinAI", "internal:aegira", "aegira-certified", "security",
     ("security-agent",), "medium", ("read",), (), False),
    ("data-lineage_skill", "data-lineage", "Datenmodell & Lineage",
     "Entwirft Datenmodell/Pipelines und sichert Lineage + Datenqualität. Trigger: Datenarchitektur/Qualität.",
     "exmachinAI", "internal:aegira", "aegira-certified", "data",
     ("data-agent",), "low", ("read", "write"), (), False),
    ("process-map_skill", "process-map", "Prozess-Mapping",
     "Modelliert Soll/Ist-Prozesse, Operating-Model und Engpässe. Trigger: Prozessdesign.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("process-agent",), "low", ("read", "write"), (), False),
    ("stakeholder-map_skill", "stakeholder-map", "Stakeholder & Change",
     "Mappt Stakeholder, entwirft Change-Story und Adoptionsmaßnahmen. Trigger: Change-/Org-Management.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("change-agent",), "low", ("read", "write"), (), False),
    ("rubric-eval_skill", "rubric-eval", "Rubrik-Bewertung",
     "Bewertet Ergebnisse gegen klare Kriterien (Evaluator-Optimizer): PASS / NEEDS_REVISION / FAIL. Trigger: QA-Bewertung.",
     "exmachinAI", "internal:aegira", "aegira-certified", "engineering",
     ("reviewer-agent",), "low", ("read",), (), False),
    ("test-plan_skill", "test-plan", "Testplan & E2E",
     "Erstellt Testpläne und verifiziert End-to-End wie ein echter Nutzer, sichert Beweise. Trigger: Test/QA.",
     "exmachinAI", "internal:aegira", "aegira-certified", "engineering",
     ("test-agent",), "low", ("read", "write"), (), False),
    ("adversarial-review_skill", "adversarial-review", "Adversariale Prüfung",
     "Greift Annahmen und Ergebnisse adversarial an (Red-Team), deckt Schwachstellen/Bias vor Freigabe auf. Trigger: kritische Gegenprobe.",
     "exmachinAI", "internal:aegira", "aegira-certified", "security",
     ("redteam-agent",), "low", ("read",), (), False),
    ("intent-routing_skill", "intent-routing", "Intent-Routing (Handoff)",
     "Klassifiziert eingehende Aufgaben und übergibt an den passenden Spezialisten; eskaliert bei Unsicherheit an HITL. Trigger: Triage/Routing.",
     "exmachinAI", "internal:aegira", "aegira-certified", "methodology",
     ("router-triage",), "low", ("read",), (), False),
]


def _derive_scope(agent_ids: tuple[str, ...]) -> tuple[list[str], list[str]]:
    """Leitet project_types/subtypes aus den referenzierten Agentenrollen ab.

    Eine Quelle der Wahrheit: die `applies`/`subtypes` des Agentenkatalogs. So
    bleibt die Skill-Klassifizierung konsistent mit `catalog.defaults_for`.
    """
    types: list[str] = []
    subs: list[str] = []
    for aid in agent_ids:
        agent = catalog.by_id(aid)
        if agent is None:
            continue
        for t in agent.applies:
            if t not in types:
                types.append(t)
        for s in agent.subtypes:
            if s not in subs:
                subs.append(s)
    return types, subs


def _build(seed: tuple) -> CatalogSkill:
    (catalog_id, slug, title, description, author, source, trust, domain,
     agent_ids, risk, tools, mcps, has_scripts) = seed
    types, subs = _derive_scope(agent_ids)
    # Kürzel (catalog_id) MUSS in der Beschreibung auffindbar sein → voranstellen.
    described = f"{catalog_id} — {description}" if not description.startswith(catalog_id) else description
    return CatalogSkill(
        catalog_id=catalog_id,
        slug=slug,
        title=title,
        description=described,
        author=author,
        source=source,
        trust_tier=SkillTrustTier(trust),
        license="see-source",
        domain=domain,
        project_types=types,
        subtypes=subs,
        agent_ids=list(agent_ids),
        version="n/v",
        required_tools=list(tools),
        required_mcps=list(mcps),
        risk=risk,
        has_scripts=has_scripts,
    )


_CATALOG: list[CatalogSkill] = [_build(s) for s in _SEED]


# --- Öffentliche API ---------------------------------------------------------


def list_catalog() -> list[CatalogSkill]:
    """Vollständiger Katalog (für die Picker-UI / GET /v1/skills)."""
    return [s.model_copy(deep=True) for s in _CATALOG]


def by_id(catalog_id: str) -> CatalogSkill | None:
    return next((s.model_copy(deep=True) for s in _CATALOG if s.catalog_id == catalog_id), None)


def default_released(skill: CatalogSkill) -> bool:
    """Standard-Freigabe ohne Admin-Eingriff: anthropic-vetted/aegira-certified/world-top.
    community/experimental erscheinen erst nach expliziter Admin-Freigabe."""
    return skill.preselected


def _sort_key(s: CatalogSkill) -> tuple:
    # Vorselektierte (vetted/world-top) zuerst, dann alphabetisch nach catalog_id.
    return (not s.preselected, s.catalog_id)


def skills_for_agents(agent_ids: list[str]) -> list[CatalogSkill]:
    """Skills, die für mindestens eine der erkannten Agentenrollen empfohlen sind."""
    want = set(agent_ids)
    out = [s.model_copy(deep=True) for s in _CATALOG if want & set(s.agent_ids)]
    return sorted(out, key=_sort_key)


def preselected(agent_ids: list[str]) -> list[CatalogSkill]:
    """Nur vorselektierbare Empfehlungen (anthropic-vetted/aegira-certified/world-top)."""
    return [s for s in skills_for_agents(agent_ids) if s.preselected]


def offered(agent_ids: list[str]) -> list[CatalogSkill]:
    """Sichtbar, aber nie vorselektiert (community/experimental) — Security-Gate."""
    return [s for s in skills_for_agents(agent_ids) if not s.preselected]


def render_stub(skill: CatalogSkill) -> str:
    """Erzeugt die SKILL.md-Katalog-Referenz (Build-Zeit-Hydration, docs/15 §4.5).

    Enthält bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern gültiges
    Frontmatter (`name`/`description`), die Klassifizierung und die Herkunft. So
    funktioniert der Skill als referenzierte, auditierbare Karte; der vollständige
    ausführbare Inhalt wird beim Aufsetzen aus `source` gezogen.
    """
    tools = ", ".join(skill.required_tools) or "—"
    mcps = ", ".join(skill.required_mcps) or "—"
    agents = ", ".join(skill.agent_ids) or "—"
    pre = "vorselektiert" if skill.preselected else "Security-Gate (HITL)"
    return f"""---
name: {skill.slug}
description: {skill.description}
metadata:
  catalog_id: {skill.catalog_id}
  author: {skill.author}
  source: {skill.source}
  trust_tier: {skill.trust_tier.value}
  domain: {skill.domain}
  agent_ids: [{agents}]
  version: "{skill.version}"
  risk: {skill.risk}
  required_tools: [{tools}]
  required_mcps: [{mcps}]
  has_scripts: {str(skill.has_scripts).lower()}
  license: {skill.license or "see-source"}
  catalog_status: reference-stub
---

# {skill.title}  (`{skill.catalog_id}`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `{skill.slug}`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> ({skill.source}) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
{skill.description}

## Klassifizierung
- Trust-Tier: **{skill.trust_tier.value}**  ({pre})
- Domäne: {skill.domain} · Agentenrollen: {agents}
- Risk: {skill.risk} · Skripte: {"ja" if skill.has_scripts else "nein"}
- Tools: {tools} · MCPs: {mcps}

## Build-Zeit-Hydration
1. Quelle abrufen: `{skill.source}` (Pfad `{skill.slug}/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/{skill.slug}/SKILL.md` ins Harness-ZIP.
"""


def hydrate(skill: CatalogSkill) -> CatalogSkill:
    """Setzt `content` (Referenz-Stub) + `content_sha256` (Build-Zeit-Integrität)."""
    content = render_stub(skill)
    sha = "sha256:" + hashlib.sha256(content.encode("utf-8")).hexdigest()
    return skill.model_copy(update={"content": content, "content_sha256": sha})
