// =============================================================================
// modules/containerAppsEnv.bicep — Container Apps Environment
//
// Spike-Tier (current): zoneRedundant=false, Consumption-only, internal=false
//   (public-loadbalancer mode — FD Standard kann nur public-DNS-Origins erreichen).
// Prod-Tier (future):   zoneRedundant=true, + D4 dedicated, internal=true
//   (private-VNet mode — erfordert FD Premium + Private Link).
//   Cost delta ≈ 120 €/Mo → ≈ 25 €/Mo (Consumption-only + scale-to-zero).
// =============================================================================

param location string
param tags object
param envName string
param infrastructureSubnetId string
param logsWorkspaceCustomerId string
@secure()
param logsWorkspaceSharedKey string

@description('Zone redundancy. Spike-Tier = false, Prod-Tier = true.')
param zoneRedundant bool = false

@description('Add dedicated D4 workload profile. Spike-Tier = false, Prod-Tier = true.')
param includeDedicatedProfile bool = false

@description('Internal VNet mode. Spike-Tier = false (public LB so FD Standard can reach), Prod-Tier = true (private, needs FD Premium + Private Link).')
param internal bool = false

var workloadProfilesConsumptionOnly = [
  { name: 'Consumption', workloadProfileType: 'Consumption' }
]

var workloadProfilesWithDedicated = [
  { name: 'Consumption', workloadProfileType: 'Consumption' }
  { name: 'D4', workloadProfileType: 'D4', minimumCount: 0, maximumCount: 5 }
]

resource cae 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: envName
  location: location
  tags: tags
  properties: {
    vnetConfiguration: {
      internal: internal
      infrastructureSubnetId: infrastructureSubnetId
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logsWorkspaceCustomerId
        sharedKey: logsWorkspaceSharedKey
      }
    }
    zoneRedundant: zoneRedundant
    workloadProfiles: includeDedicatedProfile ? workloadProfilesWithDedicated : workloadProfilesConsumptionOnly
  }
}

output environmentId string = cae.id
output defaultDomain string = cae.properties.defaultDomain
output staticIp string = cae.properties.staticIp
