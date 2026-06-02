---
name: env-doctor
description: Prueft Runtime/Deps/Env/Ports systematisch. Trigger: Umgebungsfehler/Setup-Diagnose.
metadata:
  catalog_id: env-doctor_skill
  author: Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: community
  domain: engineering
  agent_ids: [implementation-agent, devops-agent]
  version: "n/v"
  risk: medium
  required_tools: [shell, read]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Umgebung diagnostizieren  (`env-doctor_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `env-doctor`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Prueft Runtime/Deps/Env/Ports systematisch. Trigger: Umgebungsfehler/Setup-Diagnose.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: engineering · Agentenrollen: implementation-agent, devops-agent
- Risk: medium · Skripte: ja -> Security-Review noetig
- Tools: shell, read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `env-doctor/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/env-doctor/SKILL.md` ins Harness-ZIP.
