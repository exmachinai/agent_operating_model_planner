---
name: create-viz
description: Publikationsreife Charts (matplotlib/plotly). Trigger: Diagramm/Visualisierung.
metadata:
  catalog_id: data-viz_skill
  author: AEGIRA-Stack
  source: internal:data-plugin
  trust_tier: world-top
  domain: data
  agent_ids: [data-agent, research-agent]
  version: "n/v"
  risk: low
  required_tools: [code, plot]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Daten visualisieren  (`data-viz_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `create-viz`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:data-plugin) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Publikationsreife Charts (matplotlib/plotly). Trigger: Diagramm/Visualisierung.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: data · Agentenrollen: data-agent, research-agent
- Risk: low · Skripte: ja -> Security-Review noetig
- Tools: code, plot · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:data-plugin` (Pfad `create-viz/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/create-viz/SKILL.md` ins Harness-ZIP.
