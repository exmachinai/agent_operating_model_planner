---
name: canvas-design
description: canvas-design_skill — Erstellt visuelles Design als PNG/PDF (Poster, Grafiken, Layouts). Trigger: statisches Design-Artefakt.
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
  required_mcps: [—]
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Visuelles Design (PNG/PDF)  (`canvas-design_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `canvas-design`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
canvas-design_skill — Erstellt visuelles Design als PNG/PDF (Poster, Grafiken, Layouts). Trigger: statisches Design-Artefakt.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: output · Agentenrollen: ux-agent, doc-agent
- Risk: low · Skripte: ja
- Tools: image, pdf · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `canvas-design/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/canvas-design/SKILL.md` ins Harness-ZIP.
