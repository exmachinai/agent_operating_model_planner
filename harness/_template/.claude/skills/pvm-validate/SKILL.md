---
name: pvm-validate
description: PVM-Schema-Validator — prüft Struktur (Pflichtfelder, ID-Konsistenz, ZGPM-Code-Gültigkeit). Trigger durch reviewer-agent und architecture-agent nach PVM-Update.
---

# PVM-Validate Skill

## Prüfungen
1. **Schema**:
   - `ressourcen` ist Liste mit `id`, `name`, `typ`.
   - `matrix` ist Dict {MS-ID → {Ressourcen-ID → ZGPM-Code}}.
2. **ID-Konsistenz**:
   - Jede MS-ID in `matrix` existiert in `plan/msp.yaml::meilensteine[].id`.
   - Jede Ressourcen-ID in `matrix` existiert in `ressourcen[].id`.
3. **Code-Gültigkeit**: nur `A`, `B`, `E`, `e`, `F`, `L`, `I`, `V`.

## Output
```yaml
status: PASS | FAIL
errors:
  - field: matrix.M03.R99
    issue: "Ressourcen-ID R99 nicht in ressourcen-Liste."
warnings:
  - field: ressourcen.R04
    issue: "Ressource definiert, aber in keinem Meilenstein verwendet."
```

## Verbot
- Code-Variationen wie "a" oder "ee" tolerieren.
- Implicit-IDs erfinden.
