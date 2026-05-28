---
name: risk-traffic-light
description: Risiko-Ampel-Berechnung und Propagation. Trigger durch risk-agent und reviewer-agent.
---

# Risk Traffic Light Skill

## Logik
**Pro Risiko-Eintrag:**

| Wahrscheinlichkeit | Auswirkung | Ampel |
|---|---|---|
| hoch | hoch | rot |
| hoch | mittel | rot |
| mittel | hoch | rot |
| hoch | niedrig | gelb |
| mittel | mittel | gelb |
| niedrig | hoch | gelb |
| mittel | niedrig | gruen |
| niedrig | mittel | gruen |
| niedrig | niedrig | gruen |

Mit Mitigation: Ampel kann eine Stufe runter (rot → gelb, gelb → grün). Voraussetzung: Mitigation ist konkret und implementierbar.

## Propagation
1. Pro MS: höchste Ampelfarbe aller zugeordneten Risiken (aus betroffene_meilensteine) = MS-Ampel.
2. Gesamtprojekt-Ampel: höchste MS-Ampel des Projekts.

## Output
Schreibt zurück in `plan/risks.yaml::projektrisikoliste[].ampel` und in `plan/msp.yaml::meilensteine[].risiko`.

## Verbot
- Automatisches Downgrade von rot → grün ohne konkrete Mitigation.
- Rosa Sonderfarben oder Subkategorien.
