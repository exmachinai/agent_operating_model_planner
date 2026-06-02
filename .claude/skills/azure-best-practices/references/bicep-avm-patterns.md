# Bicep & Azure Verified Modules (AVM) – Patterns

## Grundsatz

Vor dem Schreiben eines eigenen Moduls prüfen, ob ein **Azure Verified Module
(AVM)** existiert. AVM sind Microsofts offizielle, versionierte, getestete
IaC-Module für Bicep und Terraform mit Well-Architected-Defaults (z. B. private
Endpoints und TLS bereits vorkonfiguriert). Registry: Microsoft Container
Registry (Bicep) bzw. Terraform Registry.

## Zwei AVM-Modultypen

- **Resource Modules** – eine einzelne Azure-Ressource mit sicheren Defaults,
  z. B. `avm/res/storage/storage-account`, `avm/res/key-vault/vault`.
- **Pattern Modules** – mehrere Ressourcen zu einem gängigen Architektur-
  Baustein kombiniert (z. B. eine komplette Landing Zone oder AI-Plattform).
  Bestehen meist aus Resource Modules.

Eigene **private Module** dürfen AVM Resource Modules als Bausteine
referenzieren – das ist der empfohlene Weg für firmenspezifische Patterns.

## Versionen immer pinnen

```bicep
module storage 'br/public:avm/res/storage/storage-account:0.14.3' = {
  name: 'storageDeploy'
  params: {
    name: storageAccountName
    // sichere Defaults greifen automatisch; nur Abweichungen explizit setzen
  }
}
```

- **Nie** `:latest` oder ungepinnte Versionen verwenden – brüche reproduzierbar
  halten.
- Versionen bewusst und getestet anheben, nicht automatisch.

## Naming & Struktur

- Konsistente Namenskonvention, z. B.
  `{resourceType}-{workload}-{env}-{region}-{instance}`
  (Beispiel: `kv-orders-prod-weu-01`). An eine feste Konvention halten, im
  Projekt-`CLAUDE.md` dokumentieren.
- Globale Eindeutigkeit beachten (Storage Account, Key Vault Namen) – ggf.
  Suffix aus `uniqueString()`.
- Empfohlene Repo-Struktur:

```
infra/
  main.bicep            # Einstiegspunkt, orchestriert Module
  main.bicepparam       # Parameter pro Umgebung
  modules/              # eigene private Module (referenzieren AVM)
azure.yaml              # azd-Konfiguration
```

## Bicep-Hygiene

- `main.bicep` schlank halten, Logik in Module auslagern.
- Parameter mit `@description()` und sinnvollen Defaults dokumentieren.
- Bekannte Bicep-Grenze beachten: kompilierte Templates max. ~4 MB – bei sehr
  großen Deployments modular aufteilen.
- `what-if` vor jedem Deploy ausführen, um Drift/Überraschungen zu sehen.

## Deployment über azd

- `azure.yaml` definiert Services und Infrastruktur für `azd up`.
- AVM ist mit `azd` und der Bicep-Registry integriert – Module direkt
  referenzierbar.
- Deployment über Pipeline (GitHub Actions / Azure DevOps) statt lokal `azd up`
  in Produktion.
