---
name: mcp-builder
description: mcp-builder_skill — Baut hochwertige MCP-Server (Python/TypeScript) zur Integration externer Dienste. Trigger: MCP-Server/Tool-Integration entwickeln.
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
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# MCP-Server bauen  (`mcp-builder_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `mcp-builder`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
mcp-builder_skill — Baut hochwertige MCP-Server (Python/TypeScript) zur Integration externer Dienste. Trigger: MCP-Server/Tool-Integration entwickeln.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: engineering · Agentenrollen: integration-agent, architecture-agent
- Risk: low · Skripte: nein
- Tools: code · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `mcp-builder/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/mcp-builder/SKILL.md` ins Harness-ZIP.
