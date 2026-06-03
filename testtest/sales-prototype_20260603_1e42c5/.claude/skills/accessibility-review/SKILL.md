---
name: accessibility-review
description: accessibility-audit_skill — Auditiert Designs/Seiten gegen WCAG 2.1 AA (Kontrast, Tastatur, Touch-Ziele). Trigger: Accessibility-Prüfung.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Accessibility-Audit  (`accessibility-audit_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `accessibility-review`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:design-plugin) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
accessibility-audit_skill — Auditiert Designs/Seiten gegen WCAG 2.1 AA (Kontrast, Tastatur, Touch-Ziele). Trigger: Accessibility-Prüfung.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domäne: design · Agentenrollen: ux-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: review, read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:design-plugin` (Pfad `accessibility-review/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/accessibility-review/SKILL.md` ins Harness-ZIP.
