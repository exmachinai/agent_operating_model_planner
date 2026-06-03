---
name: zgpm-plan
description: zgpm-plan_skill — Komponiert und prüft ZGPM-Pläne (Phasen, Meilensteine, PVM, Konsistenzregeln: ≥1 A, genau 1 F/L, 'e' nie allein). Trigger: Plan strukturieren/validieren.
metadata:
  catalog_id: zgpm-plan_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: methodology
  agent_ids: [pmo-orchestrator, methodology-agent]
  version: "n/v"
  risk: low
  required_tools: [read, write]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# ZGPM-Plan komponieren  (`zgpm-plan_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `zgpm-plan`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
zgpm-plan_skill — Komponiert und prüft ZGPM-Pläne (Phasen, Meilensteine, PVM, Konsistenzregeln: ≥1 A, genau 1 F/L, 'e' nie allein). Trigger: Plan strukturieren/validieren.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: methodology · Agentenrollen: pmo-orchestrator, methodology-agent
- Risk: low · Skripte: nein
- Tools: read, write · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `zgpm-plan/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/zgpm-plan/SKILL.md` ins Harness-ZIP.
