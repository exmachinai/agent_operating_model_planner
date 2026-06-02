---
name: orm-migration
description: ORM-spezifisch (Prisma/SQLAlchemy/Drizzle), Migrationen. Trigger: ORM/Schema-Migration.
metadata:
  catalog_id: orm-migration_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: data
  agent_ids: [data-agent]
  version: "n/v"
  risk: medium
  required_tools: [code, migration]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# ORM & Migration  (`orm-migration_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `orm-migration`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
ORM-spezifisch (Prisma/SQLAlchemy/Drizzle), Migrationen. Trigger: ORM/Schema-Migration.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: data · Agentenrollen: data-agent
- Risk: medium · Skripte: ja -> Security-Review noetig
- Tools: code, migration · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `orm-migration/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/orm-migration/SKILL.md` ins Harness-ZIP.
