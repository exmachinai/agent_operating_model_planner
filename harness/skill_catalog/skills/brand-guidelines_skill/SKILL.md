---
name: brand-guidelines
description: Wendet Marken-Farben/Typografie auf Artefakte an. Trigger: Markenstil/Design-Standard.
metadata:
  catalog_id: brand-guidelines_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: output
  agent_ids: [doc-agent, ux-agent]
  version: "n/v"
  risk: low
  required_tools: [doc]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Markenrichtlinien anwenden  (`brand-guidelines_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `brand-guidelines`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Wendet Marken-Farben/Typografie auf Artefakte an. Trigger: Markenstil/Design-Standard.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: output · Agentenrollen: doc-agent, ux-agent
- Risk: low · Skripte: nein
- Tools: doc · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `brand-guidelines/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/brand-guidelines/SKILL.md` ins Harness-ZIP.
