---
name: superpowers-tdd
description: Erzwingt Test-zuerst-Disziplin und Edge-Case-Abdeckung. Trigger: TDD/Test-Strategie.
metadata:
  catalog_id: tdd-enforcement_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: engineering
  agent_ids: [test-agent, implementation-agent]
  version: "n/v"
  risk: low
  required_tools: [test, code]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# TDD-Enforcement  (`tdd-enforcement_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `superpowers-tdd`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzwingt Test-zuerst-Disziplin und Edge-Case-Abdeckung. Trigger: TDD/Test-Strategie.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: engineering · Agentenrollen: test-agent, implementation-agent
- Risk: low · Skripte: nein
- Tools: test, code · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `superpowers-tdd/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/superpowers-tdd/SKILL.md` ins Harness-ZIP.
