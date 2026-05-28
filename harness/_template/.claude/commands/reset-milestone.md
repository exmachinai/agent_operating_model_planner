---
name: reset-milestone
description: Setzt einen Meilenstein zurück. Verlorene Approvals werden dokumentiert.
args:
  - name: milestone_id
    required: true
    description: MS-ID, z.B. M03.
---

# /reset-milestone

## Workflow
1. Bestätigung anfragen ("Reset M03 löscht 2 Approvals und 14 Tool-Calls. Sicher?").
2. State unter `.harness/<run-id>/state.json` updaten: MS auf "offen" setzen.
3. Activities-State zurücksetzen.
4. Approval-Log markieren als "reset_by_user_at_<timestamp>".
5. Beim nächsten /run-harness: MS wird erneut betreten.

## Verbot
- Ganze Run-ID löschen (das macht /reset-run nicht /reset-milestone).
- Vorgänger-MS zurücksetzen (alle Nachfolger müssten auch zurück).
