---
name: xlsx
description: Erzeugt/bearbeitet .xlsx mit Formeln, Formatierung, Charts. Trigger: Excel/Spreadsheet.
metadata:
  catalog_id: xlsx-sheets_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: output
  agent_ids: [doc-agent, data-agent]
  version: "n/v"
  risk: low
  required_tools: [file_io]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Excel-Tabellen  (`xlsx-sheets_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `xlsx`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzeugt/bearbeitet .xlsx mit Formeln, Formatierung, Charts. Trigger: Excel/Spreadsheet.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: output · Agentenrollen: doc-agent, data-agent
- Risk: low · Skripte: nein
- Tools: file_io · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `xlsx/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/xlsx/SKILL.md` ins Harness-ZIP.
