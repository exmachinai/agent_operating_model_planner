---
name: changelog-generator
description: Erzeugt Changelog aus Commits/PRs. Trigger: Changelog/Release-Notes.
metadata:
  catalog_id: changelog-gen_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: output
  agent_ids: [doc-agent, implementation-agent]
  version: "n/v"
  risk: low
  required_tools: [file_io]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Changelog erzeugen  (`changelog-gen_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `changelog-generator`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzeugt Changelog aus Commits/PRs. Trigger: Changelog/Release-Notes.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: output · Agentenrollen: doc-agent, implementation-agent
- Risk: low · Skripte: nein
- Tools: file_io · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `changelog-generator/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/changelog-generator/SKILL.md` ins Harness-ZIP.
