---
name: platform-discovery
description: Pflicht-Discovery-Skill — fragt Projekt-Natur (concept/technical/hybrid) und bei technical/hybrid die Zielplattform (azure/aws/gcp/on-prem/hybrid-cloud/multi-cloud/claude-code-only). Trigger beim ersten Aufruf des PMO-Agent oder bei /run-harness wenn `plan/project.yaml` noch keine `target_platform` enthält.
---

# Platform Discovery Skill

## Zweck
Vor jeder Plan-Erzeugung Pflicht-Klärung: Projekt-Natur + technische Zielplattform.

## Workflow

**Schritt 1 — Projekt-Natur erfragen:**

Frage den HITL-PM:

> "Bevor wir mit der Planung starten — drei Multiple-Choice-Antworten:
> A) Konzept-/Strategie-/Methodik-/Doku-Projekt (kein Software-Deployment)
> B) Technisches Projekt (Software/Infrastruktur)
> C) Hybrid (Konzept + PoC)
> Welches passt?"

**Schritt 2 — bei B oder C: Zielplattform erfragen:**

> "Welche technische Zielplattform?
> 1. Azure
> 2. AWS
> 3. GCP
> 4. On-Prem (Kubernetes)
> 5. Hybrid-Cloud (mehrere)
> 6. Multi-Cloud (≥2 Hyperscaler)
> 7. Claude Code only — der Harness IST die Plattform
> Wenn unsicher: weiß-nicht — wir klären später."

**Schritt 3 — Persistieren:**

Schreibe nach `plan/project.yaml`:
```yaml
project_nature: concept | technical | hybrid-concept-tech
target_platform: azure | aws | gcp | on-prem | hybrid-cloud | multi-cloud | claude-code-only | null
discovery_timestamp: "<ISO 8601>"
discovery_quelle: "HITL-PM (via /run-harness initial setup)"
```

**Schritt 4 — Folge-Implikationen kommunizieren:**

Bei `concept`:
> "Skills werden auf Methodik/Doku reduziert. Risk-Agent fokussiert auf Stakeholder/Methodik/Quellen-Risiken. Kein Cloud-MCP wird verbunden."

Bei `azure`:
> "Default-Region: Sweden Central / West Europe. Cloud-MCPs: azure-mcp + azure-foundry-mcp. Compliance-Default: EU-Datenresidenz."

Bei `multi-cloud`:
> "Hinweis: Multi-Cloud erhöht Compliance-Komplexität. Reviewer-Agent prüft besonders streng."

## Edge-Cases
- "Weiß nicht" beim Projekt-Natur → STOP, eskalieren. Plan kann nicht ohne diese Info beginnen.
- "Weiß nicht" bei Zielplattform → `target_platform: null` setzen, später erneut fragen.
- Mehrfach-Auswahl → unzulässig; wenn unklar, hybride Variante wählen.

## Verbot
- Plattform implizit aus Tool-Call ableiten (Anti-Pattern, siehe docs/04 §5a).
- Plattform-Wahl überspringen.
