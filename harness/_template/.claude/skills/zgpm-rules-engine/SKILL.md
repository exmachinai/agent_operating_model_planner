---
name: zgpm-rules-engine
description: Prüft ZGPM-Konsistenz-Regeln (≥1 A je MS, genau 1 F/L, "e" nie ohne "E"). Trigger wenn `plan/pvm.yaml` validiert wird (durch reviewer-agent, architecture-agent, /validate-plan).
---

# ZGPM Rules Engine Skill

## Regeln (bindend, aus docs/01_zgpm-method.md)
- **R1**: Pro Meilenstein/Aktivität ≥1 `A`.
- **R2**: Pro Meilenstein/Aktivität genau ein `F` oder `L`.
- **R3**: `e` nie ohne `E` in derselben Meilenstein-Reihe.

## Verhalten
1. Lade `plan/msp.yaml` und `plan/pvm.yaml` (und Aktivitäten falls vorhanden).
2. Pro Meilenstein:
   - Zähle `A` (R1).
   - Zähle `F` und `L` (R2).
   - Wenn `e` vorkommt: prüfe ob `E` in derselben Reihe (R3).
3. Pro Aktivität (in `plan/activities/<MID>.yaml`):
   - Gleiches Set R1+R2.
4. Output:
   - Bei OK: "PASS — alle ZGPM-Regeln erfüllt."
   - Bei Violations: pro Eintrag MS-ID + verletzte Regel + Fix-Vorschlag.

## Output-Schema
```yaml
status: PASS | FAIL
violations:
  - meilenstein: M03
    rule: R1
    detail: "Kein A zugeordnet."
    suggested_fix: "Setze R02 (milestone-executor-agent) als A."
```

## Edge-Cases
- MS ohne Aktivitäten: R1+R2 nur auf MS-Ebene.
- Ressource ohne Rolle: Warnung, kein FAIL.
- Inkonsistente IDs zwischen msp.yaml und pvm.yaml: hartes FAIL mit Hinweis auf ID-Mismatch.

## Verbot
- Stillen PASS bei unklarer Konsistenz.
- Selbst korrigieren — nur prüfen, Fix-Vorschläge geben.
