// =============================================================================
// modules/cosmos.bicep — Cosmos DB Account + 4 containers + CMK + Private Endpoint
//
// Containers per docs/02 §4 and docs/06 §7:
//   projects   PK=/tenantId
//   plans      PK=/projectId
//   sessions   PK=/projectId
//   audit      PK=/tenantIdAndMonth
//
// Spike-Tier (current): EnableServerless capability, single-region,
//   no zone-redundancy, Periodic backups, no provisioned throughput.
//   Pay-per-request only — fits early-stage usage where the planner sees
//   a few thousand RU/s peaks per day, not constant load.
// Prod-Tier (future): provisioned throughput (1200 RU/s shared) with
//   isZoneRedundant + secondary read region + Continuous30Days backups
//   + enableAutomaticFailover. Cost delta ≈ 200 €/Mo → ≈ 15 €/Mo on Spike
//   for the planner's expected request rate.
// =============================================================================

param location string
@description('Secondary location — only used when costTier == "prod" (multi-region read).')
param secondaryLocation string = ''
param tags object
param accountName string
param databaseName string
param cmkKeyUri string
param userAssignedMiId string
param privateEndpointSubnetId string

@description('Default consistency level. "Session" recommended for SaaS workloads.')
param consistencyLevel string = 'Session'

@description('Shared throughput for the database (RU/s). Only honored on Prod-Tier — Serverless ignores it.')
param sharedThroughput int = 1200

@description('Cost tier flag. Spike = serverless single-region, Prod = provisioned multi-region.')
@allowed([ 'spike', 'prod' ])
param costTier string = 'spike'

var isProd = costTier == 'prod'

// -----------------------------------------------------------------------------
// Cosmos Account (CMK + region topology controlled by costTier)
// -----------------------------------------------------------------------------

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-12-01-preview' = {
  name: accountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${userAssignedMiId}': {} }
  }
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: consistencyLevel
      maxIntervalInSeconds: 5
      maxStalenessPrefix: 100
    }
    locations: isProd ? [
      { locationName: location, failoverPriority: 0, isZoneRedundant: true }
      { locationName: secondaryLocation, failoverPriority: 1, isZoneRedundant: false }
    ] : [
      { locationName: location, failoverPriority: 0, isZoneRedundant: false }
    ]
    enableAutomaticFailover: isProd
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Disabled'
    backupPolicy: isProd ? {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous30Days' }
    } : {
      type: 'Periodic'
      periodicModeProperties: {
        backupIntervalInMinutes: 1440
        backupRetentionIntervalInHours: 168
        backupStorageRedundancy: 'Local'
      }
    }
    keyVaultKeyUri: cmkKeyUri
    defaultIdentity: 'UserAssignedIdentity=${userAssignedMiId}'
    minimalTlsVersion: 'Tls12'
    disableLocalAuth: true
    capabilities: isProd ? [] : [ { name: 'EnableServerless' } ]
  }
}

// -----------------------------------------------------------------------------
// SQL DB + Containers
// -----------------------------------------------------------------------------

resource db 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-12-01-preview' = {
  parent: cosmos
  name: databaseName
  properties: {
    resource: { id: databaseName }
    // Serverless does not accept throughput allocation on the database — pay-per-request only.
    options: isProd ? { throughput: sharedThroughput } : {}
  }
}

resource projectsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-12-01-preview' = {
  parent: db
  name: 'projects'
  properties: {
    resource: {
      id: 'projects'
      partitionKey: { paths: [ '/tenantId' ], kind: 'Hash' }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
        includedPaths: [ { path: '/*' } ]
        excludedPaths: [ { path: '/"_etag"/?' } ]
      }
    }
  }
}

resource plansContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-12-01-preview' = {
  parent: db
  name: 'plans'
  properties: {
    resource: {
      id: 'plans'
      partitionKey: { paths: [ '/projectId' ], kind: 'Hash' }
    }
  }
}

resource sessionsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-12-01-preview' = {
  parent: db
  name: 'sessions'
  properties: {
    resource: {
      id: 'sessions'
      partitionKey: { paths: [ '/projectId' ], kind: 'Hash' }
      defaultTtl: -1
    }
  }
}

resource auditContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-12-01-preview' = {
  parent: db
  name: 'audit'
  properties: {
    resource: {
      id: 'audit'
      partitionKey: { paths: [ '/tenantIdAndMonth' ], kind: 'Hash' }
      // 7 years retention enforced by the application (delete after Lifecycle Mgmt)
    }
  }
}

// -----------------------------------------------------------------------------
// Private Endpoint
// -----------------------------------------------------------------------------

resource pe 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: 'pe-${accountName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'plsc-${accountName}'
        properties: {
          privateLinkServiceId: cosmos.id
          groupIds: [ 'Sql' ]
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output cosmosAccountId string = cosmos.id
output endpoint string = cosmos.properties.documentEndpoint
output databaseName string = databaseName
