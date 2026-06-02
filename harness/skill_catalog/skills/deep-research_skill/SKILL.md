---
name: deep-research
description: Fan-out-Recherche + adversariale Verifikation + zitierter Report. Trigger: tiefe Recherche.
metadata:
  catalog_id: deep-research_skill
  author: Anthropic-nah
  source: https://github.com/anthropics/skills
  trust_tier: world-top
  domain: research
  agent_ids: [research-agent]
  version: "n/v"
  risk: low
  required_tools: [web_search]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Deep Research  (`deep-research_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `deep-research`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Fan-out-Recherche + adversariale Verifikation + zitierter Report. Trigger: tiefe Recherche.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: research · Agentenrollen: research-agent
- Risk: low · Skripte: nein
- Tools: web_search · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `deep-research/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/deep-research/SKILL.md` ins Harness-ZIP.
