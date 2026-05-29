// =============================================================================
// modules/acr.bicep — Azure Container Registry + AcrPull RBAC for User-Assigned MI
//
// Spike-Tier (current): Basic SKU (~5 €/Mo, 10 GB storage, no geo-replication).
// Prod-Tier (future):   Premium SKU (~50 €/Mo, geo-replication, content trust,
//                       private endpoints, scope maps).
//
// The User-Assigned MI gets the AcrPull role so Container Apps can pull
// images without storing admin credentials.
// =============================================================================

param location string
param tags object

@minLength(5)
@maxLength(50)
@description('ACR name. Lowercase alphanumeric, globally unique.')
param acrName string

@description('Principal ID of the User-Assigned MI used by Container Apps.')
param userAssignedMiPrincipalId string

@description('ACR SKU. Spike-Tier = Basic, Prod-Tier = Premium.')
@allowed([ 'Basic', 'Standard', 'Premium' ])
param skuName string = 'Basic'

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

resource acr 'Microsoft.ContainerRegistry/registries@2024-11-01-preview' = {
  name: acrName
  location: location
  tags: tags
  sku: { name: skuName }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: skuName == 'Premium' ? 'Enabled' : 'Disabled'
    anonymousPullEnabled: false
  }
}

// -----------------------------------------------------------------------------
// RBAC: User-Assigned MI gets "AcrPull" role
// -----------------------------------------------------------------------------

var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource roleAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, userAssignedMiPrincipalId, acrPullRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: userAssignedMiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output acrId string = acr.id
output acrName string = acr.name
output loginServer string = acr.properties.loginServer
