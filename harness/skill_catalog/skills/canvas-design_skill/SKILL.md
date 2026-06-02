---
name: canvas-design
description: Originale Poster/Designs in .png/.pdf. Trigger: Poster/Art/Design-Stueck.
metadata:
  catalog_id: canvas-design_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: output
  agent_ids: [ux-agent, doc-agent]
  version: "n/v"
  risk: low
  required_tools: [image, pdf]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Visuelles Design (PNG/PDF)  (`canvas-design_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `canvas-design`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Originale Poster/Designs in .png/.pdf. Trigger: Poster/Art/Design-Stueck.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: output · Agentenrollen: ux-agent, doc-agent
- Risk: low · Skripte: ja -> Security-Review noetig
- Tools: image, pdf · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `canvas-design/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/canvas-design/SKILL.md` ins Harness-ZIP.
