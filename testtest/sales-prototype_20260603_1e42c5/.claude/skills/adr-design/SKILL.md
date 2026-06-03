---
name: adr-design
description: adr-design_skill — Entwirft System-/Lösungsarchitektur und dokumentiert Entscheidungen als ADR mit Trade-offs. Trigger: Architektur/ADR.
metadata:
  catalog_id: adr-design_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: engineering
  agent_ids: [architecture-agent]
  version: "n/v"
  risk: low
  required_tools: [read, write]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Architektur & ADR  (`adr-design_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `adr-design`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
adr-design_skill — Entwirft System-/Lösungsarchitektur und dokumentiert Entscheidungen als ADR mit Trade-offs. Trigger: Architektur/ADR.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: engineering · Agentenrollen: architecture-agent
- Risk: low · Skripte: nein
- Tools: read, write · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `adr-design/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/adr-design/SKILL.md` ins Harness-ZIP.
