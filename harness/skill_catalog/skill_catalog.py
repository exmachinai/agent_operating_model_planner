"""Kuratierter Skill-Katalog (v0.7-Seed) — world-class, extern gevettet.

Self-contained Registry analog zu harness/catalog.py (Agentenkatalog).
KEINE AEGIRA-eigenen Methoden-Skills (separater aegira-certified-Strang).
Eindeutige Bezeichnung je Skill = catalog_id (Konvention "<funktion>_skill").
Inhalte werden zur Build-Zeit aus `source` hydriert (Lizenz + sha256).
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict


@dataclass(frozen=True)
class CatalogSkill:
    catalog_id: str            # eindeutige Bezeichnung, ^[a-z0-9-]+_skill$
    slug: str                  # Upstream-Ordnername/Frontmatter name (Standard, kein "_")
    title: str
    author: str
    source: str
    trust_tier: str            # anthropic-vetted | world-top | community | experimental
    domain: str
    agent_ids: tuple[str, ...]
    version: str = "n/v"
    risk: str = "low"
    required_tools: tuple[str, ...] = ()
    required_mcps: tuple[str, ...] = ()
    has_scripts: bool = False
    license: str = "see-source"


_PRESELECT = {"anthropic-vetted", "world-top"}

_CATALOG: list[CatalogSkill] = [
    CatalogSkill("docx-export_skill", "docx", "Word-Dokumente erstellen/bearbeiten", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('doc-agent',), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("pptx-export_skill", "pptx", "Praesentationen erstellen", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('doc-agent',), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("pdf-toolkit_skill", "pdf", "PDF verarbeiten", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('doc-agent',), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("xlsx-sheets_skill", "xlsx", "Excel-Tabellen", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('doc-agent', 'data-agent'), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("brand-guidelines_skill", "brand-guidelines", "Markenrichtlinien anwenden", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('doc-agent', 'ux-agent'), "n/v", "low", ('doc',), (), False),
    CatalogSkill("canvas-design_skill", "canvas-design", "Visuelles Design (PNG/PDF)", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "output", ('ux-agent', 'doc-agent'), "n/v", "low", ('image', 'pdf'), (), True),
    CatalogSkill("readme-gen_skill", "readme-generator", "README erzeugen", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "output", ('doc-agent', 'implementation-agent'), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("changelog-gen_skill", "changelog-generator", "Changelog erzeugen", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "output", ('doc-agent', 'implementation-agent'), "n/v", "low", ('file_io',), (), False),
    CatalogSkill("webapp-testing_skill", "webapp-testing", "Web-App End-to-End testen", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "engineering", ('implementation-agent', 'test-agent'), "n/v", "medium", ('browser',), ('playwright',), True),
    CatalogSkill("mcp-builder_skill", "mcp-builder", "MCP-Server bauen", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "engineering", ('integration-agent', 'architecture-agent'), "n/v", "low", ('code',), (), False),
    CatalogSkill("git-commit_skill", "git-commit-writer", "Commit-Messages schreiben", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering", ('implementation-agent',), "n/v", "low", ('git',), (), False),
    CatalogSkill("pr-description_skill", "pr-description-writer", "PR-Beschreibung schreiben", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering", ('implementation-agent', 'reviewer-agent'), "n/v", "low", ('scm',), (), False),
    CatalogSkill("env-doctor_skill", "env-doctor", "Umgebung diagnostizieren", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering", ('implementation-agent', 'devops-agent'), "n/v", "medium", ('shell', 'read'), (), True),
    CatalogSkill("terraform-iac_skill", "terraform", "Terraform IaC", "HashiCorp", "https://github.com/hashicorp/agent-skills", "world-top", "devops", ('devops-agent',), "n/v", "high", ('iac',), (), True),
    CatalogSkill("packer-build_skill", "packer", "Packer Images", "HashiCorp", "https://github.com/hashicorp/agent-skills", "world-top", "devops", ('devops-agent',), "n/v", "medium", ('iac', 'build'), (), True),
    CatalogSkill("terraform-grounding_skill", "terrashark", "Terraform-Grounding", "LukasNiessen", "https://github.com/LukasNiessen/terrashark", "community", "devops", ('devops-agent', 'architecture-agent'), "n/v", "medium", ('iac',), (), True),
    CatalogSkill("sql-database_skill", "sql-queries", "SQL & Datenbank", "AEGIRA-Stack/Community", "https://github.com/VoltAgent/awesome-agent-skills", "world-top", "data", ('data-agent',), "n/v", "medium", ('db_query',), (), False),
    CatalogSkill("orm-migration_skill", "orm-migration", "ORM & Migration", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "data", ('data-agent',), "n/v", "medium", ('code', 'migration'), (), True),
    CatalogSkill("data-viz_skill", "create-viz", "Daten visualisieren", "AEGIRA-Stack", "internal:data-plugin", "world-top", "data", ('data-agent', 'research-agent'), "n/v", "low", ('code', 'plot'), (), True),
    CatalogSkill("data-analyze_skill", "analyze", "Daten analysieren", "AEGIRA-Stack", "internal:data-plugin", "world-top", "data", ('data-agent', 'research-agent'), "n/v", "low", ('query', 'analysis'), (), False),
    CatalogSkill("security-audit_skill", "trailofbits-suite", "Security-Audit/SAST", "Trail of Bits", "https://github.com/trailofbits/skills", "world-top", "security", ('security-agent', 'redteam-agent'), "n/v", "medium", ('scan', 'read'), (), True),
    CatalogSkill("vuln-remediation_skill", "snyk", "Vuln-Remediation", "Snyk", "https://snyk.io/articles/top-claude-skills-developers/", "world-top", "security", ('security-agent',), "n/v", "high", ('scan', 'pr'), (), True),
    CatalogSkill("pentest-autonomous_skill", "shannon", "Autonomes Pentesting", "Community/Forschung", "https://github.com/VoltAgent/awesome-agent-skills", "experimental", "security", ('redteam-agent',), "n/v", "high", ('exploit',), (), True),
    CatalogSkill("ux-design_skill", "frontend-design", "Frontend-Design", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "design", ('ux-agent',), "n/v", "low", ('code', 'design'), (), False),
    CatalogSkill("web-design-review_skill", "web-design-guidelines", "Web-Design-Review", "Vercel", "https://vercel.com", "world-top", "design", ('ux-agent', 'reviewer-agent'), "n/v", "low", ('review', 'read'), (), False),
    CatalogSkill("theme-factory_skill", "theme-factory", "Theme-Factory", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "design", ('ux-agent',), "n/v", "low", ('style',), (), False),
    CatalogSkill("accessibility-audit_skill", "accessibility-review", "Accessibility-Audit", "AEGIRA-Stack", "internal:design-plugin", "world-top", "design", ('ux-agent', 'reviewer-agent'), "n/v", "low", ('review', 'read'), (), False),
    CatalogSkill("code-review_skill", "code-review", "Code-Review", "reputable Vendor/Community", "https://github.com/VoltAgent/awesome-agent-skills", "world-top", "engineering", ('reviewer-agent',), "n/v", "low", ('read', 'diff'), (), False),
    CatalogSkill("tdd-enforcement_skill", "superpowers-tdd", "TDD-Enforcement", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "engineering", ('test-agent', 'implementation-agent'), "n/v", "low", ('test', 'code'), (), False),
    CatalogSkill("deep-research_skill", "deep-research", "Deep Research", "Anthropic-nah", "https://github.com/anthropics/skills", "world-top", "research", ('research-agent',), "n/v", "low", ('web_search',), (), False),
    CatalogSkill("prompting_skill", "prompting-best-practices", "Prompt-Engineering", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "methodology", ('pmo-orchestrator', 'methodology-agent'), "n/v", "low", ('doc',), (), False),
    CatalogSkill("skill-creator_skill", "skill-creator", "Skill-Creator", "Anthropic", "https://github.com/anthropics/skills", "anthropic-vetted", "methodology", ('pmo-orchestrator',), "n/v", "low", ('file_io',), (), True),
    CatalogSkill("prd-authoring_skill", "prd-creation", "PRD-Authoring", "Community", "https://github.com/VoltAgent/awesome-agent-skills", "community", "methodology", ('pmo-orchestrator', 'change-agent'), "n/v", "low", ('doc',), (), False),
]


def list_catalog() -> list[CatalogSkill]:
    return list(_CATALOG)


def by_id(catalog_id: str) -> CatalogSkill | None:
    return next((s for s in _CATALOG if s.catalog_id == catalog_id), None)


def skills_for_agents(agent_ids: list[str]) -> list[CatalogSkill]:
    """Skills, die fuer mind. eine der erkannten Agentenrollen empfohlen sind."""
    want = set(agent_ids)
    out = [s for s in _CATALOG if want & set(s.agent_ids)]
    # vorselektierte (vetted/world-top) zuerst
    return sorted(out, key=lambda s: (s.trust_tier not in _PRESELECT, s.catalog_id))


def preselected(agent_ids: list[str]) -> list[CatalogSkill]:
    return [s for s in skills_for_agents(agent_ids) if s.trust_tier in _PRESELECT]


if __name__ == "__main__":
    print(f"{len(_CATALOG)} Skills im Katalog")
    for s in _CATALOG:
        print(f"  {s.catalog_id:28s} {s.trust_tier:16s} {s.domain}")
