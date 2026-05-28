---
name: skill-template
description: Generator-Skill — erzeugt SKILL.md-Stubs für neue Skills. Trigger durch skill-mapping-agent wenn benötigter Skill fehlt.
---

# Skill-Template Generator

## Verwendung
Aufruf:
```
skill:skill-template
  name: openapi-design
  description: "Entwirft OpenAPI 3.1 Spec aus User Stories."
  category: technical | concept | methodology
  trigger_condition: "Wenn eine API-Spec angefordert wird, oder API-First-Design erwähnt wird."
```

Output: neue Datei `.claude/skills/openapi-design/SKILL.md` mit Struktur:

```markdown
---
name: openapi-design
description: <eng gefasst, präzise Trigger>
---

# OpenAPI Design Skill

## Zweck
<2 Sätze max>

## Workflow
1. ...
2. ...

## Output-Format
<Schema>

## Edge-Cases
<3–5 Fälle>

## Verbot
<3–5 No-Gos>
```

## Regeln
- Description-Länge: max 220 Zeichen, präziser Trigger.
- KEINE breiten Triggers wie "API-related" — eng halten (Anti-Pattern A24).
- Skill-Name: kebab-case, max 30 Zeichen.
- Genau ein Skill pro Datei.

## Verbot
- Eigenmächtig Code in Stubs schreiben.
- Description-Strings >220 Zeichen.
