---
name: webapp-testing
description: Verifiziert Web-Apps real im Browser (Login, JS-Fehler, Timing). Trigger: E2E/Browser-Test.
metadata:
  catalog_id: webapp-testing_skill
  author: Anthropic
  source: https://github.com/anthropics/skills
  trust_tier: anthropic-vetted
  domain: engineering
  agent_ids: [implementation-agent, test-agent]
  version: "n/v"
  risk: medium
  required_tools: [browser]
  required_mcps: [playwright]
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Web-App End-to-End testen  (`webapp-testing_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `webapp-testing`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Verifiziert Web-Apps real im Browser (Login, JS-Fehler, Timing). Trigger: E2E/Browser-Test.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domaene: engineering · Agentenrollen: implementation-agent, test-agent
- Risk: medium · Skripte: ja -> Security-Review noetig
- Tools: browser · MCPs: playwright

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `webapp-testing/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/webapp-testing/SKILL.md` ins Harness-ZIP.
