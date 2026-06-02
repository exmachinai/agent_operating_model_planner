---
name: theme-factory
description: Erzeugt konsistente Themes/Design-Tokens. Trigger: Theme/Farbschema.
metadata:
  catalog_id: theme-factory_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: design
  agent_ids: [ux-agent]
  version: "n/v"
  risk: low
  required_tools: [style]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Theme-Factory  (`theme-factory_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `theme-factory`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzeugt konsistente Themes/Design-Tokens. Trigger: Theme/Farbschema.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: design · Agentenrollen: ux-agent
- Risk: low · Skripte: nein
- Tools: style · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `theme-factory/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/theme-factory/SKILL.md` ins Harness-ZIP.
