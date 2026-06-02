---
name: analyze
description: Datenfragen von Lookup bis Vollanalyse. Trigger: Datenanalyse/Metrik/Trend.
metadata:
  catalog_id: data-analyze_skill
  author: AEGIRA-Stack
  source: internal:data-plugin
  trust_tier: world-top
  domain: data
  agent_ids: [data-agent, research-agent]
  version: "n/v"
  risk: low
  required_tools: [query, analysis]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Daten analysieren  (`data-analyze_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `analyze`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:data-plugin) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Datenfragen von Lookup bis Vollanalyse. Trigger: Datenanalyse/Metrik/Trend.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: data · Agentenrollen: data-agent, research-agent
- Risk: low · Skripte: nein
- Tools: query, analysis · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:data-plugin` (Pfad `analyze/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/analyze/SKILL.md` ins Harness-ZIP.
