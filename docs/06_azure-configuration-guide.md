# 06 — Azure-Konfigurations-Guide · Planner App (aegira.ai)

> **Zielpublikum:** Azure-Admin / DevOps-Engineer mit Erfahrung in Container Apps, Entra ID und Bicep.
> **Status: BINDEND** für jedes neue Deployment.
> **Hauptdomäne:** `aegira.ai` — verwaltet bei exmachinAI GmbH.

---

## 1. Voraussetzungen

| Voraussetzung | Detail |
|---|---|
| Azure-Subscription | Pay-As-You-Go oder Enterprise Agreement. EA empfohlen für Reserved-Instance-Rabatte. |
| Azure-Tenant | Eigener exmachinAI-Tenant mit Entra ID Premium P1 oder höher. |
| Berechtigungen | Subscription-Owner (für Initial-Setup), danach Contributor genügt. |
| Domain | `aegira.ai` registriert + DNS-Verwaltung verfügbar (Empfehlung: Azure DNS). |
| Azure CLI | ≥ 2.65, eingeloggt: `az login --tenant exmachinai.onmicrosoft.com`. |
| Bicep CLI | ≥ 0.30 (`az bicep install`). |
| GitHub-Org | `github.com/exmachinai` mit GitHub Actions enabled. |
| Foundry-Zugang | Anthropic-Modelle Claude Sonnet 4.6 in Azure AI Foundry, EU-Region freigeschaltet. |

---

## 2. Domain- und DNS-Strategie

### 2.1 Domain-Hierarchie

| Subdomain | Zweck | Service |
|---|---|---|
| `aegira.ai` | Marketing-Website, Redirect zu `www.aegira.ai` | Statisch (Azure Static Web Apps oder Vercel) |
| `www.aegira.ai` | Marketing-Website (canonical) | Static Web Apps |
| **`zgpm.aegira.ai`** | **Planner-App-Frontend** | Container Apps Ingress |
| `api.zgpm.aegira.ai` | Planner-App-Backend-API | Container Apps Ingress |
| `auth.aegira.ai` | Entra-ID-Custom-Domain | Entra ID (B2C optional) |
| `docs.aegira.ai` | Öffentliche Doku, Status | Static Web Apps |
| `status.aegira.ai` | Status-Page | Statuspage.io oder eigene Page |
| `cdn.aegira.ai` | Statische Assets, Harness-Zip-Downloads | Storage + Front Door |
| `mcp.aegira.ai` | MCP-Marketplace (späte Phase) | Container Apps |

### 2.2 DNS-Records (Azure DNS Zone)

```
NS    @                      ns1-XX.azure-dns.com.
SOA   @                      ns1-XX.azure-dns.com. msnhst.microsoft.com. ...

# Apex + www
A     @                      <Front Door VIP>
CNAME www                    aegira-fd.azurefd.net.
TXT   @                      "v=spf1 -all"
TXT   _dmarc                 "v=DMARC1; p=reject; rua=mailto:dmarc@aegira.ai"

# Planner App
CNAME app                    aegira-planner-fd.azurefd.net.
CNAME api                    aegira-planner-api.<region>.azurecontainerapps.io.

# Auth
CNAME auth                   exmachinai.b2clogin.com.

# Doku + Status + CDN
CNAME docs                   aegira-docs.azurestaticapps.net.
CNAME status                 aegira-status.statuspage.io.
CNAME cdn                    aegira-cdn-fd.azurefd.net.

# Mail
MX    @                      10 aspmx.l.google.com.
MX    @                      20 alt1.aspmx.l.google.com.

# Verification Records
TXT   @                      "ms=<azure-domain-verification-token>"
TXT   _validation            "<Entra-domain-validation>"
```

### 2.3 SSL/TLS

- **Front-Door-managed Certificates** für alle Subdomains. Automatische Erneuerung.
- TLS 1.2 minimum, TLS 1.3 bevorzugt.
- HSTS aktiv mit `max-age=31536000; includeSubDomains; preload`.
- HTTPS-Redirect auf Front-Door-Ebene.

---

## 3. Resource-Group- und Region-Strategie

### 3.1 Resource Groups

```
rg-aegira-shared-prod         # Shared: KeyVault, Front Door, DNS
rg-aegira-planner-prod        # Planner App: Container Apps, Functions, Cosmos, Storage
rg-aegira-foundry-prod        # AI Foundry Deployments
rg-aegira-observability-prod  # App Insights, Log Analytics
rg-aegira-planner-staging     # Spiegelung für Staging
rg-aegira-planner-dev         # Dev-Sandbox
```

### 3.2 Regionen

- **Primary:** Sweden Central — niedrige Latenz für DE-Kunden, EU-Datenresidenz.
- **Secondary (DR):** West Europe — Failover.
- **Foundry:** Sweden Central (Sonnet 4.6 verfügbar; Stand Mai 2026).

---

## 4. Identity-Setup (Entra ID)

### 4.1 Tenant-Konfiguration

```bash
az login --tenant exmachinai.onmicrosoft.com
TENANT_ID=$(az account show --query tenantId -o tsv)
```

Aktivieren:
- **Premium P1** (Conditional Access).
- **MFA** für alle Admin-Rollen (Pflicht).
- **Identity Protection** (User-Risk- und Sign-in-Risk-Policies).

### 4.2 Custom Domain `auth.aegira.ai`

```bash
az ad domain create --domain "auth.aegira.ai"
# Verification-TXT-Record dem User vorlegen → DNS-Zone hinzufügen
az ad domain verify --domain "auth.aegira.ai"
```

### 4.3 App-Registrierung für Planner

```bash
az ad app create \
  --display-name "AEGIRA Planner App" \
  --sign-in-audience AzureADMultipleOrgs \
  --web-redirect-uris "https://zgpm.aegira.ai/auth/callback" \
  --required-resource-accesses '@manifest.json'

PLANNER_APP_ID=$(az ad app list --display-name "AEGIRA Planner App" --query "[0].appId" -o tsv)
az ad sp create --id "$PLANNER_APP_ID"
```

### 4.4 Custom Roles (RBAC)

In `infra/identity/custom-roles/`:

```json
{
  "Name": "aegira.planner.hitl_pm",
  "Description": "HITL-Projektleiter — vollumfänglicher Plan-Zugriff plus Constitution-Override",
  "Actions": [],
  "DataActions": [
    "Microsoft.DocumentDB/databaseAccounts/.../read",
    "Microsoft.DocumentDB/databaseAccounts/.../write"
  ],
  "AssignableScopes": ["/subscriptions/<SUB_ID>"]
}
```

Vier weitere Custom Roles: `viewer`, `author`, `reviewer`, `tenant_admin` (siehe `docs/02_architecture-option-b.md` §6).

### 4.5 Conditional-Access-Policies

| Policy | Bedingung | Aktion |
|---|---|---|
| CA-1 Admin-MFA | Rolle `tenant_admin` | MFA erzwingen |
| CA-2 HITL-PM-MFA | Rolle `hitl_pm` | MFA jedes 7-Tage-Window |
| CA-3 Country-Block | Login aus Country außerhalb EU+UK+CH | Block (Sperre) |
| CA-4 Risky-Sign-in | User-Risk: high | MFA + Passwort-Reset |
| CA-5 Compliant-Device | Tenant-Admin-Aktionen | Nur Compliant-Device |

---

## 5. Networking

### 5.1 Virtual Network

```bash
az network vnet create \
  --resource-group rg-aegira-planner-prod \
  --name vnet-aegira-prod \
  --address-prefix 10.50.0.0/16 \
  --location swedencentral
```

Subnets:

| Subnet | CIDR | Zweck |
|---|---|---|
| `snet-containerapps` | 10.50.1.0/24 | Container Apps Environment |
| `snet-functions` | 10.50.2.0/24 | Functions VNet Integration |
| `snet-private-endpoints` | 10.50.10.0/24 | Cosmos, Storage, KeyVault, Foundry |
| `snet-bastion` | 10.50.250.0/27 | Azure Bastion (für Admin-Access) |

### 5.2 Private Endpoints

Alle Daten-Services per Private Endpoint:

```bash
for service in cosmos storage keyvault foundry; do
  az network private-endpoint create \
    --name pe-aegira-$service \
    --resource-group rg-aegira-planner-prod \
    --vnet-name vnet-aegira-prod \
    --subnet snet-private-endpoints \
    --private-connection-resource-id ${!service^^_RESOURCE_ID} \
    --group-id default \
    --connection-name pec-$service
done
```

### 5.3 Network Security Groups

NSG-Regeln:
- Ingress nur von Front Door (Service-Tag `AzureFrontDoor.Backend`).
- Egress zu Foundry, Cosmos, Storage, KeyVault (Service-Tags).
- Egress zu github.com (CI/CD), api.anthropic.com (Bedrock-Fallback).
- Alles andere blockiert.

---

## 6. Azure AI Foundry

### 6.1 Setup

```bash
az ml workspace create \
  --resource-group rg-aegira-foundry-prod \
  --name foundry-aegira-prod \
  --location swedencentral \
  --kind Default
```

### 6.2 Modell-Deployments

```bash
# Claude Sonnet 4.6 — primary
az ml deployment create \
  --workspace foundry-aegira-prod \
  --resource-group rg-aegira-foundry-prod \
  --name "claude-sonnet-46-primary" \
  --model "anthropic.claude-sonnet-4-6" \
  --scale-units 50

# Claude Haiku 4.5 — compression worker
az ml deployment create \
  --workspace foundry-aegira-prod \
  --resource-group rg-aegira-foundry-prod \
  --name "claude-haiku-45-compress" \
  --model "anthropic.claude-haiku-4-5-20251001" \
  --scale-units 20

# GPT-5 — second opinion in Methodology-Guard sectioning
az ml deployment create \
  --workspace foundry-aegira-prod \
  --resource-group rg-aegira-foundry-prod \
  --name "gpt-5-secondopinion" \
  --model "openai.gpt-5" \
  --scale-units 10
```

### 6.3 Quota-Management

- Quota-Alert bei 70% Auslastung.
- Automatische Scale-Unit-Erhöhung bei Burst — Pflicht-Approval ab +20 Units.

### 6.4 Content-Filter

Foundry-Content-Filter auf „Medium" (Default). Override nur für Sentinel-Tests via Service-Principal.

---

## 7. Cosmos DB

### 7.1 Account

```bash
az cosmosdb create \
  --resource-group rg-aegira-planner-prod \
  --name cosmos-aegira-planner-prod \
  --kind GlobalDocumentDB \
  --default-consistency-level Session \
  --locations regionName=swedencentral failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westeurope failoverPriority=1 isZoneRedundant=false \
  --enable-multiple-write-locations false \
  --enable-automatic-failover true \
  --key-uri "$KEY_VAULT_KEY_URI"   # Customer-Managed Key
```

### 7.2 Container-Schema

| Container | PartitionKey | RU/s |
|---|---|---|
| `projects` | `/tenantId` | 400 shared |
| `plans` | `/projectId` | 400 shared |
| `sessions` | `/projectId` | 400 dedicated |
| `audit` | `/tenantIdAndMonth` (z.B. `tenant_exmachinai__202605`) | 400 shared |

### 7.3 Backup

- **Continuous Backup** (Point-in-Time-Restore bis 30 Tage).
- Backup-Test monatlich.

---

## 8. Azure Storage

### 8.1 Account

```bash
az storage account create \
  --name aegirastorageplannerprod \
  --resource-group rg-aegira-planner-prod \
  --location swedencentral \
  --sku Standard_RAGRS \
  --kind StorageV2 \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  --encryption-services blob file \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault $KEY_VAULT_URI
```

### 8.2 Container

| Container | Zweck | Access |
|---|---|---|
| `plans-yaml` | Plan-YAML-Blobs | private |
| `harness-zips` | Kompilierte Harness-Zips | private (Signed-URL) |
| `excel-exports` | XLSX-Exports | private (Signed-URL) |
| `audit-cold` | Audit-Cold-Tier (älter 90 Tage) | private |
| `static-assets` | Frontend-Assets (via CDN) | public (CDN-only) |

### 8.3 Lifecycle Management

- `plans-yaml`: Hot → Cool nach 90 Tagen, Archive nach 365 Tagen.
- `harness-zips`: Hot → Cool nach 30 Tagen.
- `audit-cold`: Cool → Archive nach 7 Jahren (DSGVO-konformer Lösch-Trigger).

---

## 9. Key Vault

### 9.1 Setup

```bash
az keyvault create \
  --name kv-aegira-shared-prod \
  --resource-group rg-aegira-shared-prod \
  --location swedencentral \
  --enable-rbac-authorization true \
  --enable-purge-protection true \
  --enable-soft-delete true \
  --retention-days 90 \
  --sku premium
```

### 9.2 Secrets-Inventory

| Secret | Quelle | Rotation |
|---|---|---|
| `anthropic-api-key-foundry` | Foundry/Anthropic | 90 Tage |
| `cosmos-cmk-current` | Key Vault (Key, nicht Secret) | 365 Tage (manuell) |
| `storage-cmk-current` | Key Vault | 365 Tage |
| `cosmos-readwrite-conn` | Cosmos-RBAC-empfohlen statt Connection-String | n/a |
| `entra-app-secret-planner` | App-Registrierung | 180 Tage |
| `slack-webhook-hitl-notify` | Customer | je Customer |
| `cert-aegira-ai` | Front Door Managed (auto) | auto |
| `github-mcp-pat-default-owner` | für Standard-MCP-Owner-Operations | 90 Tage |

### 9.3 Access-Policies

RBAC, keine klassischen Access Policies:
- `Key Vault Secrets Officer` für `kv-admin-aegira` Group.
- `Key Vault Secrets User` für Managed Identity der Container Apps.
- `Key Vault Reader` für DevOps-Group (read-only Liste).

---

## 10. Container Apps Environment

### 10.1 Environment

```bash
az containerapp env create \
  --name cae-aegira-planner-prod \
  --resource-group rg-aegira-planner-prod \
  --location swedencentral \
  --infrastructure-subnet-resource-id "$VNET_ID/subnets/snet-containerapps" \
  --logs-workspace-id "$LOG_ANALYTICS_ID" \
  --logs-workspace-key "$LOG_ANALYTICS_KEY"
```

### 10.2 Backend-API App

```bash
az containerapp create \
  --name ca-aegira-planner-api \
  --resource-group rg-aegira-planner-prod \
  --environment cae-aegira-planner-prod \
  --image acr-aegira.azurecr.io/planner-api:latest \
  --cpu 1.0 --memory 2.0Gi \
  --min-replicas 2 --max-replicas 10 \
  --target-port 8000 \
  --ingress internal \
  --user-assigned $USER_MI_ID \
  --secrets foundry-key=keyvaultref:$KV_URI/secrets/anthropic-api-key-foundry,identityref:$USER_MI_ID
```

### 10.3 Custom-Domain-Binding

```bash
# Nur am Front Door, nicht direkt am Container App (siehe §11).
```

### 10.4 Scaling-Regeln

```yaml
scale:
  minReplicas: 2
  maxReplicas: 10
  rules:
    - name: "http-requests"
      http:
        metadata:
          concurrentRequests: "50"
    - name: "cpu-load"
      custom:
        type: "cpu"
        metadata:
          type: "Utilization"
          value: "70"
```

---

## 11. Azure Front Door (Premium) + Custom Domain

### 11.1 Front Door Profile

```bash
az afd profile create \
  --profile-name fd-aegira-prod \
  --resource-group rg-aegira-shared-prod \
  --sku Premium_AzureFrontDoor
```

### 11.2 Custom Domains

Pflicht-Domains, hinzugefügt am Front Door (NICHT direkt am Container App):

```bash
for sub in app api docs cdn; do
  az afd custom-domain create \
    --custom-domain-name "${sub}-aegira-ai" \
    --profile-name fd-aegira-prod \
    --resource-group rg-aegira-shared-prod \
    --host-name "${sub}.aegira.ai" \
    --certificate-type ManagedCertificate \
    --tls TLS12 \
    --min-tls-version TLS1_2
done
```

Routes:

| Route | Frontend | Backend |
|---|---|---|
| `zgpm.aegira.ai/*` | `app-aegira-ai` | Container App `ca-aegira-planner-frontend` (Next.js SSR) |
| `api.zgpm.aegira.ai/*` | `api-aegira-ai` | Container App `ca-aegira-planner-api` |
| `docs.aegira.ai/*` | `docs-aegira-ai` | Static Web App `swa-aegira-docs` |
| `cdn.aegira.ai/*` | `cdn-aegira-ai` | Storage `static-assets` |

### 11.3 WAF (Pflicht)

```bash
az network front-door waf-policy create \
  --name wafAegiraPlanner \
  --resource-group rg-aegira-shared-prod \
  --mode Prevention \
  --redirect-url "https://zgpm.aegira.ai/blocked" \
  --custom-block-response-status-code 429 \
  --sku Premium_AzureFrontDoor
```

Regelsätze:
- **OWASP Core Rule Set 3.2** (Managed).
- **Bot Manager** (Managed).
- **Rate-Limiting**: 100 req/min pro IP.
- **Geo-Filtering**: zulässig EU + UK + CH + USA (USA für Vendor-Layer); rest Block.

---

## 12. Azure Functions

### 12.1 Premium Plan (EP1)

```bash
az functionapp plan create \
  --resource-group rg-aegira-planner-prod \
  --name plan-aegira-functions-prod \
  --location swedencentral \
  --sku EP1 \
  --is-linux \
  --max-burst 20
```

### 12.2 Function App

```bash
az functionapp create \
  --resource-group rg-aegira-planner-prod \
  --plan plan-aegira-functions-prod \
  --name fa-aegira-planner-workers \
  --storage-account aegirastorageplannerprod \
  --runtime python --runtime-version 3.12 \
  --functions-version 4 \
  --vnet "$VNET_ID" --subnet "$SUBNET_FUNCTIONS_ID" \
  --assign-identity "$USER_MI_ID"
```

### 12.3 Functions

| Function | Trigger | Code |
|---|---|---|
| `harness-compiler` | HTTP (Backend-API) | Python |
| `plan-validator` | HTTP | Python |
| `export-excel` | HTTP | Python (openpyxl) |
| `notification` | Queue (Service Bus) | Python |

---

## 13. Observability

### 13.1 Log Analytics Workspace

```bash
az monitor log-analytics workspace create \
  --resource-group rg-aegira-observability-prod \
  --workspace-name log-aegira-prod \
  --location swedencentral \
  --retention-time 90 \
  --sku PerGB2018
```

### 13.2 Application Insights

```bash
az monitor app-insights component create \
  --app appi-aegira-planner-prod \
  --location swedencentral \
  --resource-group rg-aegira-observability-prod \
  --workspace "$LOG_ANALYTICS_ID"
```

Instrumentation-Key wird im Backend-Container als App Setting injiziert.

### 13.3 Alerts (Pflicht)

| Alert | Condition | Aktion |
|---|---|---|
| Constitution-Guard Hits > 5/h | Custom-Metric | PagerDuty + Slack |
| Foundry 5xx Rate > 1% | Application Insights | PagerDuty |
| Cosmos RU-Throttling > 0 | Cosmos-Metric | Slack |
| Token-Budget pro Run > 80% | Custom | In-App Banner + Email an HITL-PM |
| Failed-Login Rate > 10/min/IP | Front Door Logs | Block-IP + Security-Team-Alarm |
| Cert-Expiry < 14 Tage | Front Door | DevOps-Team |

---

## 14. Lock Screen

> **Pflicht-Feature.** Bindend für alle Pages unter `zgpm.aegira.ai/(workspace)/*` und `zgpm.aegira.ai/(tenant-admin)/*`.

### 14.1 Zweck

Die Planner App enthält sensible Plan-Inhalte und Customer-Daten. Eine **client-seitige Lock-Screen-Logik** schützt offene Sessions auf unbeobachteten Geräten.

### 14.2 Auslöser

Die Session sperrt automatisch bei einem der folgenden Events:

| Event | Default-Timeout |
|---|---|
| Idle (keine Maus/Tastatur/Touch) im Workspace | **15 Minuten** |
| Idle in Tenant-Admin-Sektion (Members, Billing, Security) | **5 Minuten** |
| Browser-Tab im Hintergrund | **30 Minuten** |
| Manueller Lock via `⌘L` / Top-Nav-Menü | sofort |
| System-Sleep-Wake Event | sofort |
| Conditional-Access-Token-Refresh fehlgeschlagen | sofort |
| User-Risk-Erhöhung (Entra ID Identity Protection Signal) | sofort |
| HITL-Approval-Ablauf ohne Antwort | sofort |

Konfigurierbar pro Tenant: Tenant-Admin kann Timeouts härter setzen, niemals lockerer.

### 14.3 Lock-Screen-Inhalt

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│       AEGIRA                                          │
│       AI Trust Platform                               │
│                                                       │
│       Gesperrt                                        │
│                                                       │
│       Du bist als Michael Veil eingeloggt             │
│       (exmachinai.ai@gmail.com)                       │
│                                                       │
│       [ Mit Single-Sign-On entsperren ]               │
│                                                       │
│       Andere Person? [ Abmelden ]                     │
│                                                       │
│       Gesperrt seit: 14:32 · Letzter Stand wird       │
│       wiederhergestellt nach Entsperren.              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 14.4 Verhalten

- Lock-Screen ist **modal über** der gesamten App, kein Bypass.
- Hintergrund ist **stark unscharf** (CSS `filter: blur(20px)`) damit Plan-Inhalte nicht sichtbar bleiben.
- **Keine Inhalte werden aus dem Browser-Speicher gelöscht** — Session-State bleibt im Memory; nach Entsperren genau dort weiter.
- Eingabefelder werden vor Lock **automatisch gespeichert** (auto-save-Pattern, siehe §10 in UX-Spec).
- **Webhooks/Streaming-Verbindungen werden gepausiert**, kein Token-Verbrauch während Lock.
- WebSocket/SSE-Connections werden bei Lock geschlossen und beim Unlock re-etabliert.

### 14.5 Re-Authentifizierung

Drei Modi, je nach Risiko:

| Modus | Wann | Verhalten |
|---|---|---|
| **Quick-Unlock** | Idle < 60 min, gleicher Device-Fingerprint, kein Risk-Signal | Entra-Silent-Renew (Token-Refresh). User klickt einen Button. |
| **Re-MFA** | Idle ≥ 60 min, oder Risk-Signal mittel | Entra-MFA-Challenge (App, FIDO, SMS — je nach User-Pref). |
| **Hard-Re-Auth** | Risk-Signal hoch, Compliant-Device-Verstoß, Country-Mismatch | Vollständiger Re-Auth-Flow inkl. Passwort. |

Bei `Quick-Unlock`-Fehlschlag (z.B. Token expired): Fallback zu `Re-MFA`.

### 14.6 Session-Restoration

Nach erfolgreicher Re-Auth:

1. Lock-Screen-Overlay fade-out (200ms).
2. Hintergrund-Blur entfernt.
3. SSE-/WebSocket-Connections re-etabliert.
4. Toast „Willkommen zurück. Stand: vor 14 Minuten" rechts unten.
5. Bei aktiven Streaming-Sessions: Frage „Streaming fortsetzen?" inline.

### 14.7 Constitution-Konformität

- **Kein Auto-Unlock** durch Mausbewegung etc. — explizite User-Aktion ist Pflicht.
- **Kein „Remember me indefinitely"** — maximales Refresh-Token-TTL 24 Stunden (Entra-Conditional-Access enforced).
- **Audit-Log-Eintrag** bei jedem Lock-/Unlock-Event (`audit-cold`-Container, mit Device-Fingerprint).

### 14.8 Accessibility

- Lock-Screen Tab-Focus geht direkt auf „Mit SSO entsperren"-Button.
- Esc-Taste zeigt Hinweis „Bitte mit SSO entsperren" — nicht entsperren.
- Screen-Reader-Announcement bei Lock: „Sitzung gesperrt. Mit SSO entsperren oder abmelden."
- Touch-Targets ≥ 44×44px.
- Hoher Kontrast: `--c-ink` auf `--c-bg`.

### 14.9 Mobile-Verhalten

- iOS/Android: zusätzlicher Lock bei App-Hintergrund-Übergang (kein Idle-Wait).
- Biometrie (Touch-ID/Face-ID/Fingerprint) erlaubt für Quick-Unlock, **wenn** im Tenant-Setting freigegeben.
- Default: Biometrie deaktiviert für Tenant-Admin-Sektion.

### 14.10 Verbot

- Lock-Screen mit „Demo-Mode-Click-Through"-Bypass.
- Anhängende Cookies oder Headers nach Lock unverändert nutzen.
- Token-Persistenz in `localStorage` (nur `sessionStorage` oder `httpOnly`-Cookie).
- Skip-Lock für „Admin-User" — Lock gilt für alle, ausnahmslos.

---

## 15. Environment-Variablen (per Stage)

### 15.1 Backend Container App

```ini
# Build-injected
APP_VERSION=<git-sha>
APP_ENV=prod | staging | dev

# Foundry
AZURE_FOUNDRY_ENDPOINT=https://foundry-aegira-prod.<region>.inference.ml.azure.com
AZURE_FOUNDRY_DEPLOYMENT_PRIMARY=claude-sonnet-46-primary
AZURE_FOUNDRY_DEPLOYMENT_COMPRESS=claude-haiku-45-compress
AZURE_FOUNDRY_DEPLOYMENT_SECONDOPINION=gpt-5-secondopinion
AZURE_FOUNDRY_API_KEY=@Microsoft.KeyVault(SecretUri=...)

# Cosmos
COSMOS_ENDPOINT=https://cosmos-aegira-planner-prod.documents.azure.com:443/
COSMOS_DATABASE=planner
# Auth via Managed Identity, kein Key

# Storage
STORAGE_ACCOUNT_NAME=aegirastorageplannerprod
STORAGE_CONTAINER_PLANS=plans-yaml
STORAGE_CONTAINER_HARNESS=harness-zips
# Auth via Managed Identity

# Identity
ENTRA_TENANT_ID=<tenant-id>
ENTRA_APP_ID=<planner-app-id>
ENTRA_APP_SECRET=@Microsoft.KeyVault(...)
ENTRA_AUDIENCE=https://zgpm.aegira.ai

# App-Behavior
MAX_TOKENS_PER_RUN=1000000
RATE_LIMIT_PER_USER_PER_HOUR=20
SESSION_IDLE_TIMEOUT_WORKSPACE_SEC=900
SESSION_IDLE_TIMEOUT_ADMIN_SEC=300
SESSION_HARD_LOCK_BACKGROUND_SEC=1800

# Observability
APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
LOG_LEVEL=info
```

### 15.2 Frontend Container App (Next.js)

```ini
NEXT_PUBLIC_APP_URL=https://zgpm.aegira.ai
NEXT_PUBLIC_API_URL=https://api.zgpm.aegira.ai
NEXT_PUBLIC_ENTRA_TENANT_ID=<tenant-id>
NEXT_PUBLIC_ENTRA_APP_ID=<planner-app-id>
NEXT_PUBLIC_BUILD_VERSION=<git-sha>
NEXT_PUBLIC_APP_ENV=prod
NEXT_PUBLIC_LOCK_IDLE_WORKSPACE_SEC=900
NEXT_PUBLIC_LOCK_IDLE_ADMIN_SEC=300
NEXT_PUBLIC_FEATURE_FLAGS=...
```

---

## 16. Bicep — IaC-Struktur

```
infra/
├── main.bicep                # entry + parameters
├── modules/
│   ├── networking.bicep
│   ├── identity.bicep
│   ├── keyvault.bicep
│   ├── cosmos.bicep
│   ├── storage.bicep
│   ├── foundry.bicep
│   ├── containerAppsEnv.bicep
│   ├── containerApp.bicep    # parameterized
│   ├── functions.bicep
│   ├── frontDoor.bicep
│   ├── appInsights.bicep
│   └── dnsZone.bicep
├── parameters/
│   ├── prod.bicepparam
│   ├── staging.bicepparam
│   └── dev.bicepparam
└── post-deploy/
    ├── seed-tenant.ts
    └── verify-deployment.ts
```

Deployment:

```bash
az deployment sub create \
  --location swedencentral \
  --template-file infra/main.bicep \
  --parameters infra/parameters/prod.bicepparam
```

---

## 17. CI/CD (GitHub Actions)

`.github/workflows/deploy-prod.yml`:

1. **Lint + Test** auf jedem PR.
2. **Build Container Images** via Buildx in ACR.
3. **SBOM (CycloneDX)** für jedes Image.
4. **Trivy Scan** — Build-Stop bei Critical-CVE.
5. **Bicep Validate + What-If**.
6. **Approval-Gate** (GitHub Environments) für Prod.
7. **Bicep Deploy**.
8. **Rainbow-Deploy** auf Container Apps (20% Traffic → 50% → 100%, mit Auto-Rollback bei P95 > 500ms).
9. **Smoke-Tests** gegen `https://zgpm.aegira.ai/health` und `https://api.zgpm.aegira.ai/health`.
10. **Notification** zu Slack `#aegira-deploys`.

OIDC-Auth für GitHub-Actions zu Azure — keine Long-Lived-Secrets.

---

## 18. Hardening-Checkliste vor GA

- [ ] WAF aktiv mit OWASP-Core + Bot Manager.
- [ ] Alle Daten-Services per Private Endpoint, keine Public-Endpoints.
- [ ] Customer-Managed-Keys (CMK) für Cosmos + Storage.
- [ ] Key-Vault Purge-Protection aktiv.
- [ ] Soft-Delete auf Cosmos, Storage, Key Vault.
- [ ] HSTS aktiv + Preload-Submission.
- [ ] CSP-Header strikt (`default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'`; `img-src 'self' data: https://cdn.aegira.ai`; `connect-src 'self' https://api.zgpm.aegira.ai wss://api.zgpm.aegira.ai`).
- [ ] Subresource-Integrity für externe Skripte.
- [ ] Cookie-Flags: `Secure; HttpOnly; SameSite=Strict`.
- [ ] Cross-Tenant-Isolation Penetration-Test.
- [ ] Lock-Screen-Test (alle 8 Auslöser).
- [ ] Failed-Login-Rate-Limiting.
- [ ] Pentest abgeschlossen.
- [ ] DPIA dokumentiert.
- [ ] Customer-Onboarding-Runbook fertig.
- [ ] Run-Books für Incident-Response.
- [ ] Disaster-Recovery getestet.
- [ ] Audit-Log-Retention-Tests.

---

## 19. Cost-Monitoring

Budget Alerts:

| Budget | Threshold | Aktion |
|---|---|---|
| `rg-aegira-planner-prod` | 500 € / Monat | Email DevOps |
| `rg-aegira-foundry-prod` | 1500 € / Monat | Email DevOps + Slack |
| Total Subscription | 3000 € / Monat | Email Founder |

Cost-Analysis-Dashboards in `rg-aegira-observability-prod`.

---

## 20. Disaster Recovery

| Szenario | RTO | RPO | Aktion |
|---|---|---|---|
| Container Apps Region-Outage | 30 min | 0 | Failover via Front Door zu West Europe Replica |
| Cosmos Region-Outage | 5 min | 0 | Automatischer Failover |
| Storage Region-Outage | 1 h | 5 min | RA-GRS Read-Failover |
| Key Vault-Outage | 1 h | 0 | Soft-Delete-Restore |
| Foundry-Region-Outage | manuell | 0 | Optionaler Bedrock-Fallback (Customer-Opt-in) |

DR-Test halbjährlich.

---

## 21. Troubleshooting

| Symptom | Vermutung | Lösung |
|---|---|---|
| `zgpm.aegira.ai` 502 | Container App down | Front-Door-Backend-Health-Check + `az containerapp revision list` |
| Foundry 429 | Quota | Scale-Units erhöhen, kurzfristig Bedrock-Fallback |
| Cosmos 429 | RU-Throttling | Container auf dedicated RU/s umstellen |
| Entra-Login schlägt fehl | Conditional-Access | Sign-In Logs in Entra prüfen |
| Lock-Screen löst nicht aus | Idle-Detection-Bug | Browser-DevTools `localStorage.aegira_last_activity` prüfen |
| Streaming bricht ab | SSE-Verbindung weg | Front-Door `keep-alive` und `read-timeout` checken |
| MFA-Challenge nicht erscheint | CA-Policy-Konflikt | Conditional-Access-Insights aufrufen |

---

## 22. Quellen

- Azure Container Apps Docs (Mai 2026).
- Azure AI Foundry Docs (Mai 2026).
- Azure Front Door Premium Docs.
- Entra ID Conditional Access Best Practices.
- Microsoft Cloud Adoption Framework — Landing Zone.
- WCAG 2.2 (W3C, 2023).
- DSGVO Art. 5, 13, 17, 32.
- EU AI Act Art. 13, 50.
- AEGIRA-Constitution.

---

## 23. Versions-Notiz

Schema-Version dieses Dokuments: **1.0** (28.05.2026).

Änderungen erfordern HITL-PM-Approval plus DevOps-Lead-Approval. Bei Constitution-relevanten Änderungen zusätzlich Methodology-Guard-Agent-Review.
