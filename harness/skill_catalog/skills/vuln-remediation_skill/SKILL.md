---
name: snyk
description: 7-Phasen Vuln-Remediation (Scan->Fix->Validate->PR). Trigger: Schwachstelle/Dependency-Fix.
metadata:
  catalog_id: vuln-remediation_skill
  author: Snyk
  source: https://snyk.io/articles/top-claude-skills-developers/
  trust_tier: world-top
  domain: security
  agent_ids: [security-agent]
  version: "n/v"
  risk: high
  required_tools: [scan, pr]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Vuln-Remediation  (`vuln-remediation_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `snyk`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://snyk.io/articles/top-claude-skills-developers/) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
7-Phasen Vuln-Remediation (Scan->Fix->Validate->PR). Trigger: Schwachstelle/Dependency-Fix.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: security · Agentenrollen: security-agent
- Risk: high · Skripte: ja -> Security-Review noetig
- Tools: scan, pr · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://snyk.io/articles/top-claude-skills-developers/` (Pfad `snyk/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/snyk/SKILL.md` ins Harness-ZIP.
