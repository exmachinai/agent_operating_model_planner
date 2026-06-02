---
name: accessibility-review
description: WCAG-2.1-AA-Audit (Kontrast, Tastatur, Touch-Targets). Trigger: a11y/Barrierefreiheit.
metadata:
  catalog_id: accessibility-audit_skill
  author: AEGIRA-Stack
  source: internal:design-plugin
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

# Accessibility-Audit  (`accessibility-audit_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `accessibility-review`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:design-plugin) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
WCAG-2.1-AA-Audit (Kontrast, Tastatur, Touch-Targets). Trigger: a11y/Barrierefreiheit.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: design · Agentenrollen: ux-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: review, read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:design-plugin` (Pfad `accessibility-review/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/accessibility-review/SKILL.md` ins Harness-ZIP.
