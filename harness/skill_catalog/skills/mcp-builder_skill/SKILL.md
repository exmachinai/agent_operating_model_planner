---
name: mcp-builder
description: Erstellt MCP-Server (FastMCP/TS-SDK). Trigger: MCP-Server/externe API-Integration.
metadata:
  catalog_id: mcp-builder_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: engineering
  agent_ids: [integration-agent, architecture-agent]
  version: "n/v"
  risk: low
  required_tools: [code]
  required_mcps: []
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# MCP-Server bauen  (`mcp-builder_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `mcp-builder`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erstellt MCP-Server (FastMCP/TS-SDK). Trigger: MCP-Server/externe API-Integration.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: engineering · Agentenrollen: integration-agent, architecture-agent
- Risk: low · Skripte: nein
- Tools: code · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `mcp-builder/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/mcp-builder/SKILL.md` ins Harness-ZIP.
