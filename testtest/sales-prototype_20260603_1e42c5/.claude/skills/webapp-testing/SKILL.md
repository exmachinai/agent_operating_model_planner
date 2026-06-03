---
name: webapp-testing
description: webapp-testing_skill — Testet Web-Apps End-to-End im echten Browser (Playwright). Trigger: E2E-Verifikation einer Web-UI.
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

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `webapp-testing`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/anthropics/skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
webapp-testing_skill — Testet Web-Apps End-to-End im echten Browser (Playwright). Trigger: E2E-Verifikation einer Web-UI.

## Klassifizierung
- Trust-Tier: **anthropic-vetted**  (vorselektiert)
- Domäne: engineering · Agentenrollen: implementation-agent, test-agent
- Risk: medium · Skripte: ja
- Tools: browser · MCPs: playwright

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/anthropics/skills` (Pfad `webapp-testing/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/webapp-testing/SKILL.md` ins Harness-ZIP.
