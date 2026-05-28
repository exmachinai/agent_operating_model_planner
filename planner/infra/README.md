# Infrastructure — Bicep

> Azure-Infrastruktur für die AEGIRA Planner App. Domain `aegira.ai`. Vollständige Spec: `docs/06_azure-configuration-guide.md`.

## Struktur

```
infra/
├── main.bicep                 # entry-point (subscription scope), erzeugt 3 RGs
├── modules/
│   ├── networking.bicep       # VNet 10.50.0.0/16, 4 Subnets, NSGs
│   ├── keyvault.bicep         # KV Premium, 2 CMK-Keys, RBAC, Private Endpoint
│   ├── cosmos.bicep           # Cosmos Account, 4 Container, CMK, Multi-Region, PE
│   ├── storage.bicep          # Storage Account RA-GRS, 5 Container, CMK, Lifecycle, PE
│   ├── containerAppsEnv.bicep # Container Apps Environment (Zone-redundant)
│   ├── containerApp.bicep     # Parameterized: Backend-API + Frontend
│   ├── frontDoor.bicep        # Front Door Premium + WAF + Custom Domains
│   └── observability.bicep    # Log Analytics + App Insights
└── parameters/
    └── prod.bicepparam        # Prod-Parameter (Domain aegira.ai)
```

## Was noch nicht hier ist (siehe `docs/06`)

- `foundry.bicep` — AI Foundry Workspace + Modell-Deployments. Wird **separat** provisioniert wegen Quota-Genehmigung.
- `functions.bicep` — Functions Premium-Plan. Folgt in v0.2, sobald die ersten Worker (`harness-compiler`, `plan-validator`, `export-excel`, `notification`) gebraucht werden.
- `dnsZone.bicep` — DNS-Zone für `aegira.ai`. Existiert bereits außerhalb des Stacks.
- `identity.bicep` — User-Assigned MI. Wird via `az identity create` einmalig provisioniert (Lifecycle ≠ Stack).
- `appInsights.bicep` ist in `observability.bicep` integriert.

## Prerequisites (einmalig, außerhalb dieses Templates)

```bash
# 1. Azure-CLI eingeloggt mit Owner-Berechtigung
az login --tenant <TENANT_ID>
az account set --subscription <SUB_ID>

# 2. User-Assigned Managed Identity
az group create -n aegira-shared-prod -l swedencentral
az identity create -g aegira-shared-prod -n umi-aegira-planner-prod
export USER_MI_ID=$(az identity show -g aegira-shared-prod -n umi-aegira-planner-prod --query id -o tsv)

# 3. Entra-Tenant + App-Registrierung
# Siehe docs/06 §4
export ENTRA_TENANT_ID=$(az account show --query tenantId -o tsv)
export ENTRA_APP_ID=<planner-app-id>  # vom App-Registration-Schritt

# 4. Container Registry mit Images (Backend + Frontend)
export BACKEND_API_IMAGE=acr-aegira.azurecr.io/planner-api:v0.1.0
export FRONTEND_IMAGE=acr-aegira.azurecr.io/planner-frontend:v0.1.0
```

## What-If (Trockenlauf)

Pflicht vor jedem Prod-Deploy:

```bash
az deployment sub what-if \
  --location swedencentral \
  --template-file main.bicep \
  --parameters parameters/prod.bicepparam
```

## Deploy

```bash
az deployment sub create \
  --location swedencentral \
  --template-file main.bicep \
  --parameters parameters/prod.bicepparam \
  --name aegira-planner-prod-$(date +%Y%m%d%H%M)
```

## Outputs (nach Deploy)

```bash
az deployment sub show -n <deployment-name> --query properties.outputs
```

Wichtigste Outputs:

- `appPublicUrl` — `https://zgpm.aegira.ai`
- `apiPublicUrl` — `https://api.zgpm.aegira.ai`
- `frontDoorDnsTarget` — der CNAME-Target für DNS-Zone
- `cosmosEndpoint`, `storageAccountName`, `keyVaultUri`

## DNS-Records (nach erstem Deploy)

DNS für `aegira.ai` liegt bei **Bytecamp** (nicht Azure DNS). Vollständige Klick-Anleitung incl. Validation-Tokens, CAA und Koexistenz mit `aims.aegira.ai`: **`docs/08_dns-bytecamp-setup.md`**.

Kurzfassung — vier Records bei Bytecamp anlegen:

| Type | Host | Wert | TTL |
|---|---|---|---|
| `CNAME` | `zgpm` | `<fd-endpoint>.azurefd.net.` | 3600 |
| `CNAME` | `api.zgpm` | `<fd-endpoint>.azurefd.net.` | 3600 |
| `TXT` | `_dnsauth.zgpm` | `<validation-token-frontend>` | 3600 |
| `TXT` | `_dnsauth.api.zgpm` | `<validation-token-api>` | 3600 |

Werte aus `az deployment sub show` (`frontDoorDnsTarget`) und `az afd custom-domain show ... --query validationProperties.validationToken`.

**Wichtig:** App ist **öffentlich zugänglich**, der Lock-Screen (`docs/06 §14`) ist die Sicherheitsgrenze nach Erst-Auth. Keine VPN- oder IP-Allowlist nötig — die WAF und der Geo-Filter im `frontDoor.bicep` machen optionales Hardening, schränken aber keine legitime Nutzung ein.

## Lizenz

Apache-2.0. © 2026 exmachinAI GmbH.
