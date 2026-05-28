---
name: validate-plan
description: ZGPM-Konsistenz-Check ohne Run.
args: []
---

# /validate-plan

## Workflow
1. Alle `plan/*.yaml` laden.
2. `zgpm-rules-engine` aufrufen.
3. `pvm-validate` aufrufen.
4. `risk-traffic-light` aufrufen.
5. `plan-evaluator` aufrufen (McK-Check).
6. Konsolidierter Report ins Chat.

## Output-Format
```
═══════════════════════════════════════
Plan-Validierung — <plan_hash>
═══════════════════════════════════════
ZGPM-Regeln:     PASS / FAIL (<n> violations)
PVM-Schema:      PASS / FAIL (<n> errors)
Risiko-Ampel:    konsistent / inkonsistent
McK-MECE:        OK / Lücken
McK-Pyramid:     OK / Hinweise
McK-Hypothesis:  OK / Hinweise
───────────────────────────────────────
GESAMT: PASS / NEEDS_REVISION
```

Bei NEEDS_REVISION: konkrete Findings + Fix-Vorschläge.
