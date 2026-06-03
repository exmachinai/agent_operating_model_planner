---
name: prompting-best-practices
description: prompting_skill — Best Practices für Prompt-Engineering mit aktuellen Claude-Modellen. Trigger: Prompt schreiben/optimieren.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Prompt-Engineering  (`prompting_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `prompting-best-practices`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
prompting_skill — Best Practices für Prompt-Engineering mit aktuellen Claude-Modellen. Trigger: Prompt schreiben/optimieren.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: methodology · Agentenrollen: pmo-orchestrator, methodology-agent
- Risk: low · Skripte: nein
- Tools: doc · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `prompting-best-practices/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/prompting-best-practices/SKILL.md` ins Harness-ZIP.
