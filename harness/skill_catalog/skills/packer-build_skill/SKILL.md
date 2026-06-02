---
name: packer
description: Baut Images mit Packer (HashiCorp-Standards). Trigger: Packer/Image-Build.
metadata:
  catalog_id: packer-build_skill
  author: HashiCorp
  source: https://github.com/hashicorp/agent-skills
  trust_tier: world-top
  domain: devops
  agent_ids: [devops-agent]
  version: "n/v"
  risk: medium
  required_tools: [iac, build]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Packer Images  (`packer-build_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `packer`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/hashicorp/agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Baut Images mit Packer (HashiCorp-Standards). Trigger: Packer/Image-Build.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: devops · Agentenrollen: devops-agent
- Risk: medium · Skripte: ja -> Security-Review noetig
- Tools: iac, build · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/hashicorp/agent-skills` (Pfad `packer/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/packer/SKILL.md` ins Harness-ZIP.
