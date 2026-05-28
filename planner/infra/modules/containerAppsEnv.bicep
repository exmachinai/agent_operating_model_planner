// =============================================================================
// modules/containerAppsEnv.bicep — Container Apps Environment
// =============================================================================

param location string
param tags object
param envName string
param infrastructureSubnetId string
param logsWorkspaceCustomerId string
@secure()
param logsWorkspaceSharedKey string

resource cae 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: envName
  location: location
  tags: tags
  properties: {
    vnetConfiguration: {
      internal: true
      infrastructureSubnetId: infrastructureSubnetId
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logsWorkspaceCustomerId
        sharedKey: logsWorkspaceSharedKey
      }
    }
    zoneRedundant: true
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
      {
        name: 'D4'
        workloadProfileType: 'D4'
        minimumCount: 0
        maximumCount: 5
      }
    ]
  }
}

output environmentId string = cae.id
output defaultDomain string = cae.properties.defaultDomain
output staticIp string = cae.properties.staticIp
