---
name: theme-factory
description: theme-factory_skill — Erzeugt konsistente Design-Themes/Tokens. Trigger: Theme/Designsystem aufbauen.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Theme-Factory  (`theme-factory_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `theme-factory`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
theme-factory_skill — Erzeugt konsistente Design-Themes/Tokens. Trigger: Theme/Designsystem aufbauen.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: design · Agentenrollen: ux-agent
- Risk: low · Skripte: nein
- Tools: style · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `theme-factory/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/theme-factory/SKILL.md` ins Harness-ZIP.
