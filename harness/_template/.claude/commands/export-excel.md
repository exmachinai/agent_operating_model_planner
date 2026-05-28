---
name: export-excel
description: ZGPM-kompatibler XLS-Export. Nur Datenstruktur, keine PwC-Makros.
args:
  - name: out
    required: false
    description: Output-Pfad. Default exports/aegira_plan_<YYYYMMDD>.xls.
---

# /export-excel

## Workflow
1. `plan/*.yaml` laden.
2. Aus MSP+PVM+Aktivitäten ein xlsx erzeugen — Sheets: MSP, PVM, je ein Aktivitäten-Sheet, Pivot.
3. Schreiben nach `exports/<filename>`.
4. Hinweis im Chat: "Datei in xls-Format gespeichert. Original-PwC-Makros sind NICHT enthalten."

## Verbot
- PwC-Branding einbauen.
- "ZGPM™" oder Marken-Suggestion in Cells.
