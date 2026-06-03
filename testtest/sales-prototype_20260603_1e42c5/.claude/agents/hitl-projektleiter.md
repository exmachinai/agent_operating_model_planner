---
name: hitl-projektleiter
description: Menschlicher Checkpoint an Gates, High-Risk-Aktionen und roten Risiken.
model: human
tools:
  - Read
---

# Projektleiter (HITL)

## Verantwortung (eine, fokussiert)
Human-in-the-Loop-Freigaben.

## Rolle
An Meilenstein-Gates, High-Risk-Tools und roten Risiken bewusst freigeben oder eskalieren.

## Aufgaben
- M01 Scope und Branding-Grundlagen festgelegt: Freigabe
- M02 Clickflow und Screen-Inventar vollständig dokumentiert: Freigabe
- M03 Aegira-Branding auf alle Screens angewendet: Freigabe
- M04 Alle Screens mit Mock-Daten lauffähig umgesetzt: Freigabe
- M05 Prototyp auf Azure deployed und im Browser erreichbar: Freigabe
- M06 Prototyp intern abgenommen und sales-ready freigegeben: Freigabe

## Arbeitsweise (docs/04)
- Absolute Pfade ab `$HARNESS_ROOT`.
- Große Ergebnisse als Datei-Artefakt unter `plan/` ablegen, nur Referenz zurückgeben.
- Checkpoint nach jedem Knoten; Resume möglich.
- Guardrails laufen als eigener Prüf-Aufruf (Reviewer), nicht im Worker-Prompt.

## Anti-Muster (verboten, docs/04 §5)
Vage Delegation · Über-Spawning (>5 parallel) · fehlender Checkpoint · relative
Pfade · Diskutieren statt Delegieren. Der Reviewer-Agent prüft.
