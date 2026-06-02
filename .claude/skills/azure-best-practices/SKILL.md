---
name: azure-best-practices
description: >-
  Verbindliche Best Practices für Azure-native Anwendungen: Infrastructure as
  Code mit Azure Verified Modules (Bicep/Terraform), Security-Baseline,
  Well-Architected-Framework und Auswahl des Compute-Hosts. Nutze diesen Skill
  IMMER, wenn Azure-Ressourcen, Bicep, Terraform, azd, App Service, Container
  Apps, Functions, Key Vault, Managed Identity, RBAC, Networking oder
  Deployment-Pipelines im Spiel sind – auch wenn nicht ausdrücklich nach
  "Best Practices" gefragt wird. Greift bei jedem neuen Azure-Projekt und bei
  jeder Änderung an Azure-Infrastruktur oder -Konfiguration.
---

# Azure Best Practices

Dieser Skill erzwingt einen konsistenten, sicheren Baseline-Stil für jedes
Azure-native Projekt. Ziel: kein Wiedererfinden des Rades, sichere Defaults ab
der ersten Zeile, Ausrichtung am Microsoft Well-Architected Framework (WAF).

## Grundregeln (gelten immer)

1. **IaC vor Klick.** Keine manuelle Ressourcen-Erstellung im Portal. Alles als
   Bicep oder Terraform, versioniert im Repo.
2. **Azure Verified Modules (AVM) zuerst.** Statt eigene Module zu schreiben,
   bevorzugt offizielle AVM-Module nutzen (sichere Defaults out-of-the-box).
   Eigene Module nur, wenn kein passendes AVM existiert. Details:
   `references/bicep-avm-patterns.md`.
3. **Keine Secrets im Code.** Keine Connection Strings, Keys oder Passwörter in
   Repo, Code oder Bicep-Parametern. Managed Identity + Key Vault. Details:
   `references/security-baseline.md`.
4. **WAF-Check vor "fertig".** Vor Abschluss jeder Architektur-Entscheidung die
   fünf Säulen kurz durchgehen: `references/azure-waf.md`.
5. **Bewusste Host-Wahl.** Compute-Host (App Service / Container Apps /
   Functions) nicht aus Gewohnheit, sondern nach Workload wählen:
   `references/app-service-container-apps.md`.

## Arbeitsablauf bei einem neuen Azure-Feature

1. **Workload klären** – Was wird deployt? Web-App, API, Background-Job, Event-
   getrieben? → Host-Wahl (`references/app-service-container-apps.md`).
2. **AVM-Module suchen** – Für jede Ressource prüfen, ob ein AVM-Modul
   existiert (`references/bicep-avm-patterns.md`). Versionen pinnen.
3. **Security-Baseline anwenden** – Managed Identity, Key Vault, RBAC least
   privilege, Private Endpoints, TLS (`references/security-baseline.md`).
4. **WAF-Review** – Reliability, Security, Cost, Operational Excellence,
   Performance kurz gegenchecken (`references/azure-waf.md`).
5. **Deployment** – Über `azd` bzw. CI/CD-Pipeline, nicht manuell.

## Wann welche Referenz lesen

| Aufgabe | Referenz |
|---|---|
| IaC schreiben, Module wählen, Naming | `references/bicep-avm-patterns.md` |
| Auth, Secrets, Netzwerk, RBAC | `references/security-baseline.md` |
| Architektur-Entscheidung absichern | `references/azure-waf.md` |
| Compute-Host auswählen | `references/app-service-container-apps.md` |

Lies nur die Referenz, die zur aktuellen Aufgabe passt – nicht alle auf einmal.

## Projektspezifisches gehört NICHT hierher

Tech-Stack, konkrete Service-Liste, Build/Test/Deploy-Kommandos und
Architektur-Entscheidungen eines konkreten Projekts gehören in die
`CLAUDE.md` im jeweiligen Repo-Root, nicht in diesen wiederverwendbaren Skill.
