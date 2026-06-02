---
name: terraform
description: Terraform nach HashiCorp-Best-Practices. Deploy=Hochrisiko/HITL. Trigger: Terraform/IaC.
metadata:
  catalog_id: terraform-iac_skill
  author: HashiCorp
  source: https://github.com/hashicorp/agent-skills
  trust_tier: world-top
  domain: devops
  agent_ids: [devops-agent]
  version: "n/v"
  risk: high
  required_tools: [iac]
  required_mcps: []
  has_scripts: true
  license: see-source
  catalog_status: reference-stub
---

# Terraform IaC  (`terraform-iac_skill`)

> **AEGIRA-Katalog-Referenz.** Dies ist die kuratierte Katalog-Karte fuer den Skill `terraform`.
> Der **vollstaendige, ausfuehrbare Inhalt** wird zur **Build-Zeit** aus der Quelle hydriert
> (https://github.com/hashicorp/agent-skills) — inklusive Lizenzpruefung und `content_sha256`. Dieser Stub enthaelt bewusst
> **keinen** fremden Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung + Herkunft.

## Zweck
Terraform nach HashiCorp-Best-Practices. Deploy=Hochrisiko/HITL. Trigger: Terraform/IaC.

## Klassifizierung
- Trust-Tier: **world-top**  (vorselektiert)
- Domaene: devops · Agentenrollen: devops-agent
- Risk: high · Skripte: ja -> Security-Review noetig
- Tools: iac · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `https://github.com/hashicorp/agent-skills` (Pfad `terraform/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz pruefen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unveraendert nach `.claude/skills/terraform/SKILL.md` ins Harness-ZIP.
