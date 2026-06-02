---
name: pr-description-writer
description: Erzeugt PR-Beschreibungen aus Diffs. Trigger: Pull-Request/Merge-Request.
metadata:
  catalog_id: pr-description_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: engineering
  agent_ids: [implementation-agent, reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [scm]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# PR-Beschreibung schreiben  (`pr-description_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `pr-description-writer`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzeugt PR-Beschreibungen aus Diffs. Trigger: Pull-Request/Merge-Request.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: engineering · Agentenrollen: implementation-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: scm · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `pr-description-writer/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/pr-description-writer/SKILL.md` ins Harness-ZIP.
