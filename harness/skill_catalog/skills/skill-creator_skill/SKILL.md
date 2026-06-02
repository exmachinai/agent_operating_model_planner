---
name: skill-creator
description: Erstellt/optimiert Skills, misst Performance. Trigger: neuen Skill bauen.
metadata:
  catalog_id: skill-creator_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: methodology
  agent_ids: [pmo-orchestrator]
  version: "n/v"
  risk: low
  required_tools: [file_io]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Skill-Creator  (`skill-creator_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `skill-creator`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erstellt/optimiert Skills, misst Performance. Trigger: neuen Skill bauen.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: methodology · Agentenrollen: pmo-orchestrator
- Risk: low · Skripte: ja -> Security-Review noetig
- Tools: file_io · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `skill-creator/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/skill-creator/SKILL.md` ins Harness-ZIP.
