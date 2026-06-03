---
name: web-design-guidelines
description: web-design-review_skill — Prüft Web-UIs gegen 100+ Design-/A11y-/Performance-Regeln. Trigger: Web-Design-Review.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Web-Design-Review  (`web-design-review_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `web-design-guidelines`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://vercel.com) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
web-design-review_skill — Prüft Web-UIs gegen 100+ Design-/A11y-/Performance-Regeln. Trigger: Web-Design-Review.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domäne: design · Agentenrollen: ux-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: review, read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://vercel.com` (Pfad `web-design-guidelines/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/web-design-guidelines/SKILL.md` ins Harness-ZIP.
