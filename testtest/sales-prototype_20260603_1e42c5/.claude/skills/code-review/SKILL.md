---
name: code-review
description: code-review_skill — Reviewt Code-Änderungen auf Korrektheit, Sicherheit und Performance. Trigger: PR/Diff-Review.
metadata:
  catalog_id: code-review_skill
  author: reputable Vendor/Community
  source: https://github.com/VoltAgent/awesome-agent-skills
  trust_tier: world-top
  domain: engineering
  agent_ids: [reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [read, diff]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Code-Review  (`code-review_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `code-review`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/VoltAgent/awesome-agent-skills) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
code-review_skill — Reviewt Code-Änderungen auf Korrektheit, Sicherheit und Performance. Trigger: PR/Diff-Review.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domäne: engineering · Agentenrollen: reviewer-agent
- Risk: low · Skripte: nein
- Tools: read, diff · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/VoltAgent/awesome-agent-skills` (Pfad `code-review/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/code-review/SKILL.md` ins Harness-ZIP.
