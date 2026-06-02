---
name: prd-creation
description: Erstellt Product-Requirements-Dokumente vor Design/Code. Trigger: PRD/Anforderungen.
metadata:
  catalog_id: prd-authoring_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: methodology
  agent_ids: [pmo-orchestrator, change-agent]
  version: "n/v"
  risk: low
  required_tools: [doc]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# PRD-Authoring  (`prd-authoring_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `prd-creation`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erstellt Product-Requirements-Dokumente vor Design/Code. Trigger: PRD/Anforderungen.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: methodology · Agentenrollen: pmo-orchestrator, change-agent
- Risk: low · Skripte: nein
- Tools: doc · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `prd-creation/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/prd-creation/SKILL.md` ins Harness-ZIP.
