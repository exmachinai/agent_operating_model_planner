---
name: frontend-design
description: ux-design_skill — Entwirft Frontend-/UI-Designs als Code mit klarer Hierarchie. Trigger: UI/Frontend gestalten.
metadata:
  catalog_id: ux-design_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: design
  agent_ids: [ux-agent]
  version: "n/v"
  risk: low
  required_tools: [code, design]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Frontend-Design  (`ux-design_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `frontend-design`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
ux-design_skill — Entwirft Frontend-/UI-Designs als Code mit klarer Hierarchie. Trigger: UI/Frontend gestalten.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: design · Agentenrollen: ux-agent
- Risk: low · Skripte: nein
- Tools: code, design · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `frontend-design/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/frontend-design/SKILL.md` ins Harness-ZIP.
