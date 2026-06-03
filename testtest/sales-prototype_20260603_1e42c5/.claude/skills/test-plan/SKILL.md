---
name: test-plan
description: test-plan_skill — Erstellt Testpläne und verifiziert End-to-End wie ein echter Nutzer, sichert Beweise. Trigger: Test/QA.
metadata:
  catalog_id: test-plan_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: engineering
  agent_ids: [test-agent]
  version: "n/v"
  risk: low
  required_tools: [read, write]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Testplan & E2E  (`test-plan_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `test-plan`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
test-plan_skill — Erstellt Testpläne und verifiziert End-to-End wie ein echter Nutzer, sichert Beweise. Trigger: Test/QA.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: engineering · Agentenrollen: test-agent
- Risk: low · Skripte: nein
- Tools: read, write · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `test-plan/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/test-plan/SKILL.md` ins Harness-ZIP.
