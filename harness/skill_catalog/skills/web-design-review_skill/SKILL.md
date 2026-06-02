---
name: web-design-guidelines
description: Prueft UI-Code gegen 100+ Regeln (a11y/Perf/UX). Trigger: Design-Review/UI-Check.
metadata:
  catalog_id: web-design-review_skill
  author: Vercel
  source: https://vercel.com
  trust_tier: world-top
  domain: design
  agent_ids: [ux-agent, reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [review, read]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Web-Design-Review  (`web-design-review_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `web-design-guidelines`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://vercel.com) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Prueft UI-Code gegen 100+ Regeln (a11y/Perf/UX). Trigger: Design-Review/UI-Check.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: design · Agentenrollen: ux-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: review, read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://vercel.com` (Pfad `web-design-guidelines/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/web-design-guidelines/SKILL.md` ins Harness-ZIP.
