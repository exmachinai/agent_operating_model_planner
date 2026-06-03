---
name: pvm-validate
description: pvm-validate_skill — Validiert die Personen-Verantwortungs-Matrix gegen die ZGPM-Konsistenzregeln. Trigger: PVM/Rollenmatrix prüfen.
metadata:
  catalog_id: pvm-validate_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: methodology
  agent_ids: [methodology-agent, reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [read]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# PVM-Matrix validieren  (`pvm-validate_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `pvm-validate`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
pvm-validate_skill — Validiert die Personen-Verantwortungs-Matrix gegen die ZGPM-Konsistenzregeln. Trigger: PVM/Rollenmatrix prüfen.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: methodology · Agentenrollen: methodology-agent, reviewer-agent
- Risk: low · Skripte: nein
- Tools: read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `pvm-validate/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/pvm-validate/SKILL.md` ins Harness-ZIP.
