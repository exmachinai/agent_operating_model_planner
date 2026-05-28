---
name: explain
description: In-App-Hilfe zu Konzepten, Commands, Agenten, Skills oder Hooks. Pflicht-Hilfefunktion.
args:
  - name: topic
    required: false
    description: Was erklärt werden soll (z.B. "PVM", "/run-harness", "pmo-agent", "platform-discovery", "constitution-guard"). Wenn leer: Hilfe-Übersicht.
---

# /explain

## Workflow
1. Wenn `topic` leer: Übersichts-Menü zeigen.
2. Wenn `topic` ein ZGPM-Begriff (MSP/PVM/MS/Aktivität/Phase/Ergebnispfad/A/B/E/L/F/I/V): aus `docs/01_zgpm-method.md` zitieren.
3. Wenn `topic` ein Slash-Command: aus `.claude/commands/<topic>.md` extrahieren.
4. Wenn `topic` ein Agent: aus `.claude/agents/<topic>.md` extrahieren.
5. Wenn `topic` ein Skill: aus `.claude/skills/<topic>/SKILL.md` extrahieren.
6. Wenn `topic` ein Hook: aus `.claude/hooks/**/<topic>.json` mit menschenlesbarer Erklärung.
7. Wenn nichts passt: Fuzzy-Match anbieten ("Meintest du 'pmo-agent'?").

## Output-Stil
Kurz, konkret, Beispiel zeigen. Bei Konzepten: Sprache des HITL-PM verwenden (aus `.env::HITL_LANG`).

## Verbot
- Erklärungen ohne Quelle (alle Aussagen müssen auf docs/ oder .claude/ rückführbar sein).
- 100%-Garantien.
