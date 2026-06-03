---
name: brand-guidelines
description: brand-guidelines_skill — Wendet Markenfarben und Typografie konsistent auf Artefakte an. Trigger: Corporate-Design/Branding.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Markenrichtlinien anwenden  (`brand-guidelines_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `brand-guidelines`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
brand-guidelines_skill — Wendet Markenfarben und Typografie konsistent auf Artefakte an. Trigger: Corporate-Design/Branding.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: output · Agentenrollen: doc-agent, ux-agent
- Risk: low · Skripte: nein
- Tools: doc · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `brand-guidelines/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/brand-guidelines/SKILL.md` ins Harness-ZIP.
