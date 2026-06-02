---
name: code-review
description: Prueft Diffs auf Security/Performance/Korrektheit per Checkliste. Trigger: Code-Review/Merge.
metadata:
  catalog_id: code-review_skill
  author: reputable Vendor/Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: world-top
  domain: engineering
  agent_ids: [reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [read, diff]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Code-Review  (`code-review_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `code-review`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Prueft Diffs auf Security/Performance/Korrektheit per Checkliste. Trigger: Code-Review/Merge.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: engineering · Agentenrollen: reviewer-agent
- Risk: low · Skripte: nein
- Tools: read, diff · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `code-review/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/code-review/SKILL.md` ins Harness-ZIP.
