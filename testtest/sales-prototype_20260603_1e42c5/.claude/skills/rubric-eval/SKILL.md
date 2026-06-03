---
name: rubric-eval
description: rubric-eval_skill — Bewertet Ergebnisse gegen klare Kriterien (Evaluator-Optimizer): PASS / NEEDS_REVISION / FAIL. Trigger: QA-Bewertung.
metadata:
  catalog_id: rubric-eval_skill
  author: exmachinAI
  source: internal:aegira
  trust_tier: aegira-certified
  domain: engineering
  agent_ids: [reviewer-agent]
  version: "n/v"
  risk: low
  required_tools: [read]
  required_mcps: [—]
  has_scripts: false
  license: see-source
  catalog_status: reference-stub
---

# Rubrik-Bewertung  (`rubric-eval_skill`)

> **AEGIRA-Katalog-Referenz.** Kuratierte Karte für den Skill `rubric-eval`. Der
> vollständige, ausführbare Inhalt wird zur **Build-Zeit** aus der Quelle hydriert
> (internal:aegira) — inkl. Lizenzprüfung und `content_sha256`. Dieser Stub enthält
> bewusst **keinen** Fremd-Originalinhalt (IP/Lizenz), sondern Trigger-Beschreibung
> und Herkunft.

## Zweck
rubric-eval_skill — Bewertet Ergebnisse gegen klare Kriterien (Evaluator-Optimizer): PASS / NEEDS_REVISION / FAIL. Trigger: QA-Bewertung.

## Klassifizierung
- Trust-Tier: **aegira-certified**  (vorselektiert)
- Domäne: engineering · Agentenrollen: reviewer-agent
- Risk: low · Skripte: nein
- Tools: read · MCPs: —

## Build-Zeit-Hydration
1. Quelle abrufen: `internal:aegira` (Pfad `rubric-eval/SKILL.md`).
2. Frontmatter `name`/`description` validieren; Lizenz prüfen.
3. `content_sha256` berechnen und ins `_manifest.json` schreiben.
4. Inhalt unverändert nach `.claude/skills/rubric-eval/SKILL.md` ins Harness-ZIP.
