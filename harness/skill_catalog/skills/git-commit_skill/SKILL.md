---
name: git-commit-writer
description: Strukturierte Commit-Messages. Trigger: git commit/Konventionen.
metadata:
  catalog_id: git-commit_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: engineering
  agent_ids: [implementation-agent]
  version: "n/v"
  risk: low
  required_tools: [git]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Commit-Messages schreiben  (`git-commit_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `git-commit-writer`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Strukturierte Commit-Messages. Trigger: git commit/Konventionen.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: engineering · Agentenrollen: implementation-agent
- Risk: low · Skripte: nein
- Tools: git · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `git-commit-writer/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/git-commit-writer/SKILL.md` ins Harness-ZIP.
