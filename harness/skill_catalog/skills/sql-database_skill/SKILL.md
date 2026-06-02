---
name: sql-queries
description: Korrektes, performantes SQL ueber Dialekte; Schema/Migration. Trigger: SQL/DB-Query.
metadata:
  catalog_id: sql-database_skill
  author: AEGIRA-Stack/Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: world-top
  domain: data
  agent_ids: [data-agent]
  version: "n/v"
  risk: medium
  required_tools: [db_query]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# SQL & Datenbank  (`sql-database_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `sql-queries`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Korrektes, performantes SQL ueber Dialekte; Schema/Migration. Trigger: SQL/DB-Query.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: data · Agentenrollen: data-agent
- Risk: medium · Skripte: nein
- Tools: db_query · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `sql-queries/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/sql-queries/SKILL.md` ins Harness-ZIP.
