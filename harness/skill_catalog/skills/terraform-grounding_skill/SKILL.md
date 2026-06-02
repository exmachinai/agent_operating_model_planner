---
name: terrashark
description: Erdet Terraform-Code, reduziert Halluzinationen. Trigger: modulare/sichere IaC.
metadata:
  catalog_id: terraform-grounding_skill
  author: LukasNiessen
  source: https://github.com/LukasNiessen/terrashark
  trust_tier: community
  domain: devops
  agent_ids: [devops-agent, architecture-agent]
  version: "n/v"
  risk: medium
  required_tools: [iac]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Terraform-Grounding  (`terraform-grounding_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `terrashark`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/LukasNiessen/terrashark) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Erdet Terraform-Code, reduziert Halluzinationen. Trigger: modulare/sichere IaC.

## Klassifizierung
- Trust-Tier: **community**  (nur nach Security-Gate / HITL)
- Domaene: devops · Agentenrollen: devops-agent, architecture-agent
- Risk: medium · Skripte: ja -> Security-Review noetig
- Tools: iac · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/LukasNiessen/terrashark` (Pfad `terrashark/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/terrashark/SKILL.md` ins Harness-ZIP.
