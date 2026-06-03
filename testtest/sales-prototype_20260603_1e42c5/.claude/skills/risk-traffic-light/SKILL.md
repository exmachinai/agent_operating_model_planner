---
name: risk-traffic-light
description: risk-traffic-light_skill — Leitet die Risiko-Ampel aus Eintritt × Auswirkung ab und schlägt Mitigationen vor (grün<8 · gelb 8–14 · rot≥15). Trigger: Risiken scoren.
metadata:
  catalog_id: risk-traffic-light_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: methodology
  agent_ids: [risk-agent]
  version: "n/v"
  risk: low
  required_tools: [read, write]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Risiko-Ampel (E×A)  (`risk-traffic-light_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `risk-traffic-light`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
risk-traffic-light_skill — Leitet die Risiko-Ampel aus Eintritt × Auswirkung ab und schlägt Mitigationen vor (grün<8 · gelb 8–14 · rot≥15). Trigger: Risiken scoren.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: methodology · Agentenrollen: risk-agent
- Risk: low · Skripte: nein
- Tools: read, write · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `risk-traffic-light/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/risk-traffic-light/SKILL.md` ins Harness-ZIP.
