---
name: docx
description: Erzeugt und bearbeitet .docx (TOC, Tabellen, Kopf-/Fusszeilen). Trigger: Word/.docx-Deliverable.
metadata:
  catalog_id: docx-export_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: output
  agent_ids: [doc-agent]
  version: "n/v"
  risk: low
  required_tools: [file_io]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Word-Dokumente erstellen/bearbeiten  (`docx-export_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `docx`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erzeugt und bearbeitet .docx (TOC, Tabellen, Kopf-/Fusszeilen). Trigger: Word/.docx-Deliverable.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: output · Agentenrollen: doc-agent
- Risk: low · Skripte: nein
- Tools: file_io · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `docx/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/docx/SKILL.md` ins Harness-ZIP.
