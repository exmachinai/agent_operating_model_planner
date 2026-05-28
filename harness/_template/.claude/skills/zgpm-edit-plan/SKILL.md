---
name: zgpm-edit-plan
description: Sicheres Editieren des Plan-YAML — Validierung beim Speichern. Trigger bei manuellen Plan-Änderungen durch HITL-PM oder durch /validate-plan.
---

# ZGPM Edit Plan Skill

## Workflow
1. Backup anlegen (`cp -r plan plan.bak.<timestamp>`).
2. Edit-Vorschlag entgegennehmen.
3. Edit in YAML-Diff auflösen.
4. Validierung durch zgpm-rules-engine + pvm-validate.
5. Bei PASS: Edit anwenden, plan_hash neu berechnen, planausgabedatum aktualisieren.
6. Bei FAIL: Edit zurückweisen, Diff anzeigen, Fix-Vorschläge.

## Versionierung
Bei jeder Speicherung:
- `plan/_version.json::plan_hash` neu (SHA-256 über alle plan/-Dateien).
- `plan/_version.json::planausgabedatum` auf jetzt.
- `plan/_version.json::kontrolliert_durch` auf aktuellen User.

## Verbot
- Edits ohne Validierung speichern.
- _version.json überspringen.
- Backup auslassen.
