---
name: skill-creator
description: skill-creator_skill — Erstellt, bearbeitet und optimiert Skills (inkl. Eval). Trigger: Skill bauen/verbessern.
metadata:
  catalog_id: skill-creator_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: methodology
  agent_ids: [pmo-orchestrator]
  version: "n/v"
  risk: low
  required_tools: [file_io]
  required_mcps: [—]
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Skill-Creator  (`skill-creator_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `skill-creator`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
skill-creator_skill — Erstellt, bearbeitet und optimiert Skills (inkl. Eval). Trigger: Skill bauen/verbessern.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: methodology · Agentenrollen: pmo-orchestrator
- Risk: low · Skripte: ja
- Tools: file_io · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `skill-creator/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/skill-creator/SKILL.md` ins Harness-ZIP.
