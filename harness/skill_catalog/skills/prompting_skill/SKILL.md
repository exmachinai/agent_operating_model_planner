---
name: prompting-best-practices
description: Best Practices fuer System-/Tool-Prompts. Trigger: Prompt schreiben/optimieren.
metadata:
  catalog_id: prompting_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: methodology
  agent_ids: [pmo-orchestrator, methodology-agent]
  version: "n/v"
  risk: low
  required_tools: [doc]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Prompt-Engineering  (`prompting_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `prompting-best-practices`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Best Practices fuer System-/Tool-Prompts. Trigger: Prompt schreiben/optimieren.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: methodology · Agentenrollen: pmo-orchestrator, methodology-agent
- Risk: low · Skripte: nein
- Tools: doc · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `prompting-best-practices/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/prompting-best-practices/SKILL.md` ins Harness-ZIP.
