---
name: plan-evaluator
description: McKinsey-MECE/Pyramid/Hypothesis-Check eines Plans. Trigger durch reviewer-agent und methodology-guard-agent.
---

# Plan Evaluator Skill

## Prüfungen

**MECE (Mutually Exclusive, Collectively Exhaustive):**
1. Phasen-Overlap: zwei Phasen beschreiben dasselbe?
2. Phasen-Lücke: zwischen den Phasen entstehen unbehandelte Bereiche?
3. Ergebnispfade orthogonal: kein MS gehört eindeutig zu mehreren?

**Pyramid Principle:**
1. Beginnt jeder MS-Text mit dem Ergebnis (Verb im Perfekt)?
2. Sind die zugehörigen Aktivitäten Begründungen, die das MS-Ergebnis tragen?
3. Folgt die Aktivitäten-Reihenfolge dem "Antwort zuerst"-Prinzip?

**Hypothesis-driven:**
1. Jede Aktivität testet eine Hypothese (impliziert oder explizit)?
2. Jeder MS beantwortet eine konkrete Projekt-Frage?

## Output
```yaml
status: PASS | NEEDS_REVISION
mece_findings: [...]
pyramid_findings: [...]
hypothesis_findings: [...]
```

## Verbot
- Stillen PASS ohne MECE-Check.
- Eigenmächtige Umstrukturierung.
