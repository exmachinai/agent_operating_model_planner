// =============================================================================
// AEGIRA Planner — Azure Infrastructure (main.bicep)
//
// Deploys the full Planner App stack to one region.
//
// Topology:
//   - Resource group(s) created via az CLI prior to this template (see deploy.sh).
//   - This template deploys at SUBSCRIPTION scope and creates the RGs.
//
// Modules used (in order):
//   1. observability    (Log Analytics + App Insights)
//   2. networking       (VNet + Subnets + NSGs)
//   3. keyvault         (Key Vault + Soft-delete + Purge-protection)
//   4. cosmos           (Cosmos DB account + containers + CMK)
//   5. storage          (Storage account + containers + CMK)
//   6. containerAppsEnv (Container Apps Environment)
//   7. containerApp     (parameterized — Backend API + Frontend)
//   8. frontDoor        (Front Door Premium + WAF + custom domains)
//
// Per AEGIRA docs/06_azure-configuration-guide.md.
// =============================================================================

targetScope = 'subscription'

// -----------------------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------------------

@description('Environment short name (prod / staging / dev).')
@allowed([ 'prod', 'staging', 'dev' ])
param environment string

@description('Primary Azure region. Germany West Central (Frankfurt) für deutsche Datenresidenz.')
param primaryLocation string = 'germanywestcentral'

@description('Secondary region for DR (nur Prod-Tier). Germany North hält die DR ebenfalls in Deutschland; bei Prod-Tier-Aktivierung Service-/Cosmos-Multi-Region-Verfügbarkeit prüfen.')
param secondaryLocation string = 'germanynorth'

@description('Resource name prefix. Combined with environment for uniqueness.')
param resourcePrefix string = 'aegira'

@description('Custom domain for the application. e.g. aegira.ai')
param customDomain string = 'aegira.ai'

@description('Tags applied to all resources.')
param tags object = {
  app: 'aegira-planner'
  owner: 'exmachinAI'
  costcenter: 'AEGIRA-PLATFORM'
  managed_by: 'bicep'
  compliance: 'EU-AI-Act'
}

@description('Container image tag for the backend-api app.')
param backendApiImage string

@description('Container image tag for the frontend app.')
param frontendImage string

@description('User-assigned Managed Identity for all workloads. Created externally.')
param userAssignedMiId string

@description('Entra ID Tenant ID.')
param entraTenantId string

@description('Entra App ID for the Planner App.')
param entraAppId string

@description('Allowed geographies for WAF geo-filter. Default EU + UK + CH + USA.')
param allowedCountries array = [ 'DE','AT','BE','BG','CY','CZ','DK','EE','ES','FI','FR','GR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','GB','CH','US' ]

@description('Cost tier flag. Spike = serverless Cosmos, FD Standard, scale-to-zero (~80 €/Mo). Prod = provisioned multi-region, FD Premium with managed WAF rules (~650 €/Mo).')
@allowed([ 'spike', 'prod' ])
param costTier string = 'spike'

var isProd = costTier == 'prod'

// -----------------------------------------------------------------------------
// Resource Groups
// -----------------------------------------------------------------------------

var rgShared      = '${resourcePrefix}-shared-${environment}'
var rgPlanner     = '${resourcePrefix}-planner-${environment}'
var rgObservability = '${resourcePrefix}-observability-${environment}'

// NOTE: rgFoundry intentionally NOT declared here — Foundry has special
// provisioning requirements (model deployments, capacity reservations).
// Provision separately. Naming convention would be:
//   ${resourcePrefix}-foundry-${environment}

resource rgSharedRes 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgShared
  location: primaryLocation
  tags: tags
}

resource rgPlannerRes 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgPlanner
  location: primaryLocation
  tags: tags
}

resource rgObservabilityRes 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgObservability
  location: primaryLocation
  tags: tags
}

// -----------------------------------------------------------------------------
// Modules
// -----------------------------------------------------------------------------

module observability 'modules/observability.bicep' = {
  name: 'observability-${environment}'
  scope: rgObservabilityRes
  params: {
    location: primaryLocation
    tags: tags
    workspaceName: 'log-${resourcePrefix}-${environment}'
    appInsightsName: 'appi-${resourcePrefix}-planner-${environment}'
    retentionInDays: isProd ? 90 : 30
    dailyQuotaGb: isProd ? 0 : 1
  }
}

module networking 'modules/networking.bicep' = {
  name: 'networking-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    tags: tags
    vnetName: 'vnet-${resourcePrefix}-${environment}'
    vnetCidr: '10.50.0.0/16'
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr-${environment}'
  scope: rgSharedRes
  params: {
    location: primaryLocation
    tags: tags
    // ACR names: 5-50 chars, lowercase alphanumeric, globally unique.
    // 'aegira' (6) + 'acr' (3) + 'prod' (4) + 8-char hash = 21 chars.
    acrName: toLower('${resourcePrefix}acr${environment}${substring(uniqueString(rgSharedRes.id), 0, 8)}')
    userAssignedMiPrincipalId: reference(userAssignedMiId, '2024-11-30').principalId
    skuName: isProd ? 'Premium' : 'Basic'
  }
}

// HINWEIS: Key Vault + CMK wurden im Spike fallengelassen (Frankfurt-Migration).
// Cosmos/Storage nutzen Microsoft-managed Encryption; App-Secrets (z.B. LLM-Key)
// liegen als Container-App-Secret. CMK ist als Advanced-Control später nachrüstbar.

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    secondaryLocation: secondaryLocation
    tags: tags
    accountName: toLower('cosmos-${resourcePrefix}-planner-${environment}')
    databaseName: 'planner'
    userAssignedMiId: userAssignedMiId
    privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId
    vnetId: networking.outputs.vnetId
    costTier: costTier
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    tags: tags
    // Storage account names: 3–24 chars, lowercase alphanumeric only.
    // 'aegira' (6) + 'st' (2) + 'prod' (4) + 12-char hash = 24 exactly.
    storageAccountName: toLower('${resourcePrefix}st${environment}${substring(uniqueString(rgPlannerRes.id), 0, 12)}')
    userAssignedMiId: userAssignedMiId
    privateEndpointSubnetId: networking.outputs.privateEndpointSubnetId
    vnetId: networking.outputs.vnetId
    skuName: isProd ? 'Standard_RAGRS' : 'Standard_LRS'
  }
}

module containerAppsEnv 'modules/containerAppsEnv.bicep' = {
  name: 'cae-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    tags: tags
    envName: 'cae-${resourcePrefix}-planner-${environment}'
    infrastructureSubnetId: networking.outputs.containerAppsSubnetId
    logsWorkspaceCustomerId: observability.outputs.workspaceCustomerId
    logsWorkspaceSharedKey: observability.outputs.workspaceSharedKey
    zoneRedundant: isProd
    includeDedicatedProfile: isProd
    // Spike: internal=false (FD Standard reicht). Prod: internal=true (mit FD Premium + Private Link).
    internal: isProd
  }
}

module backendApi 'modules/containerApp.bicep' = {
  name: 'ca-api-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    tags: tags
    appName: 'ca-${resourcePrefix}-planner-api'
    environmentId: containerAppsEnv.outputs.environmentId
    userAssignedMiId: userAssignedMiId
    containerImage: backendApiImage
    targetPort: 8000
    // Spike: external (FD Standard reicht). Prod: internal (FD Premium + Private Link).
    ingressExternal: !isProd
    acrLoginServer: acr.outputs.loginServer
    cpu: '1.0'
    memory: '2Gi'
    // Spike-Tier: scale-to-zero. Prod-Tier value was minReplicas: 2, maxReplicas: 10.
    minReplicas: 0
    maxReplicas: 3
    envVars: [
      { name: 'APP_ENV', value: environment }
      // Tells DefaultAzureCredential which user-assigned MI to use. Without this
      // the SDK cannot load the proper managed identity and Cosmos/Storage/KV
      // token acquisition fails ("Unable to load the proper Managed Identity").
      { name: 'AZURE_CLIENT_ID', value: reference(userAssignedMiId, '2024-11-30').clientId }
      { name: 'COSMOS_ENDPOINT', value: cosmos.outputs.endpoint }
      { name: 'COSMOS_DATABASE', value: 'planner' }
      { name: 'STORAGE_ACCOUNT_NAME', value: storage.outputs.accountName }
      { name: 'APPINSIGHTS_CONNECTION_STRING', value: observability.outputs.appInsightsConnectionString }
      { name: 'ENTRA_TENANT_ID', value: entraTenantId }
      { name: 'ENTRA_APP_ID', value: entraAppId }
      { name: 'ENTRA_AUDIENCE', value: 'https://zgpm.${customDomain}' }
      { name: 'SESSION_IDLE_TIMEOUT_WORKSPACE_SEC', value: '900' }
      { name: 'SESSION_IDLE_TIMEOUT_ADMIN_SEC', value: '300' }
      { name: 'SESSION_HARD_LOCK_BACKGROUND_SEC', value: '1800' }
      { name: 'MAX_TOKENS_PER_RUN', value: '1000000' }
      { name: 'LOG_LEVEL', value: 'info' }
    ]
  }
  // Implicit dependencies via env-var output references (cosmos, storage, observability).
}

module frontend 'modules/containerApp.bicep' = {
  name: 'ca-fe-${environment}'
  scope: rgPlannerRes
  params: {
    location: primaryLocation
    tags: tags
    appName: 'ca-${resourcePrefix}-planner-frontend'
    environmentId: containerAppsEnv.outputs.environmentId
    userAssignedMiId: userAssignedMiId
    containerImage: frontendImage
    targetPort: 3000
    // Spike: external (FD Standard reicht). Prod: internal (FD Premium + Private Link).
    ingressExternal: !isProd
    acrLoginServer: acr.outputs.loginServer
    cpu: '0.75'
    memory: '1.5Gi'
    // Spike-Tier: scale-to-zero. Prod-Tier value was minReplicas: 2, maxReplicas: 10.
    minReplicas: 0
    maxReplicas: 3
    envVars: [
      { name: 'NEXT_PUBLIC_APP_URL', value: 'https://zgpm.${customDomain}' }
      { name: 'NEXT_PUBLIC_API_URL', value: 'https://api.zgpm.${customDomain}' }
      { name: 'NEXT_PUBLIC_ENTRA_TENANT_ID', value: entraTenantId }
      { name: 'NEXT_PUBLIC_ENTRA_APP_ID', value: entraAppId }
      { name: 'NEXT_PUBLIC_APP_ENV', value: environment }
      { name: 'NEXT_PUBLIC_LOCK_IDLE_WORKSPACE_SEC', value: '900' }
      { name: 'NEXT_PUBLIC_LOCK_IDLE_ADMIN_SEC', value: '300' }
    ]
  }
}

module frontDoor 'modules/frontDoor.bicep' = {
  name: 'fd-${environment}'
  scope: rgSharedRes
  params: {
    location: 'global'
    tags: tags
    profileName: 'fd-${resourcePrefix}-${environment}'
    customDomain: customDomain
    backendApiFqdn: backendApi.outputs.fqdn
    frontendFqdn: frontend.outputs.fqdn
    allowedCountries: allowedCountries
    wafMode: environment == 'prod' ? 'Prevention' : 'Detection'
    skuName: isProd ? 'Premium_AzureFrontDoor' : 'Standard_AzureFrontDoor'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output appPublicUrl string = 'https://zgpm.${customDomain}'
output apiPublicUrl string = 'https://api.zgpm.${customDomain}'
output cosmosEndpoint string = cosmos.outputs.endpoint
output storageAccountName string = storage.outputs.accountName
output frontDoorDnsTarget string = frontDoor.outputs.endpointHostName
output appInsightsConnectionString string = observability.outputs.appInsightsConnectionString
output deployedCostTier string = costTier
output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.acrName
