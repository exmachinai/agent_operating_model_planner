// =============================================================================
// modules/storage.bicep — Storage Account + Blob containers + CMK + Lifecycle
//
// Containers per docs/06 §8.2.
// =============================================================================

param location string
param tags object

@minLength(3)
@maxLength(24)
param storageAccountName string

param cmkKeyUri string
param userAssignedMiId string
param privateEndpointSubnetId string

@description('VNet ID used to link the private DNS zone so the blob endpoint resolves to the private IP.')
param vnetId string

@description('Storage SKU. Spike-Tier = Standard_LRS (local-redundant, ~5 €/Mo). Prod-Tier = Standard_RAGRS (geo-redundant for DR, ~25 €/Mo).')
@allowed([ 'Standard_LRS', 'Standard_ZRS', 'Standard_GRS', 'Standard_RAGRS' ])
param skuName string = 'Standard_LRS'

// -----------------------------------------------------------------------------
// Account
// -----------------------------------------------------------------------------

resource sa 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: { name: skuName }
  kind: 'StorageV2'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${userAssignedMiId}': {} }
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Disabled'
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    encryption: {
      keySource: 'Microsoft.Keyvault'
      keyvaultproperties: { keyvaulturi: substring(cmkKeyUri, 0, indexOf(cmkKeyUri, '/keys/')), keyname: 'storage-cmk' }
      identity: { userAssignedIdentity: userAssignedMiId }
      services: {
        blob: { enabled: true, keyType: 'Account' }
        file: { enabled: true, keyType: 'Account' }
        queue: { enabled: true, keyType: 'Account' }
        table: { enabled: true, keyType: 'Account' }
      }
    }
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2024-01-01' = {
  parent: sa
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 30 }
    containerDeleteRetentionPolicy: { enabled: true, days: 30 }
    isVersioningEnabled: true
  }
}

// -----------------------------------------------------------------------------
// Containers (private — Signed URL only)
// -----------------------------------------------------------------------------

var containers = [
  'plans-yaml'
  'harness-zips'
  'excel-exports'
  'audit-cold'
  'static-assets'
]

resource containerResources 'Microsoft.Storage/storageAccounts/blobServices/containers@2024-01-01' = [for c in containers: {
  parent: blobs
  name: c
  properties: {
    publicAccess: 'None'
  }
}]

// -----------------------------------------------------------------------------
// Lifecycle policy
//   - plans-yaml: Hot → Cool after 90d, Archive after 365d.
//   - harness-zips: Hot → Cool after 30d.
//   - audit-cold: Cool → Archive after 7 years (then app-level deletion trigger).
// -----------------------------------------------------------------------------

resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2024-01-01' = {
  parent: sa
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'plans-yaml-tiering'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'plans-yaml/' ] }
            actions: {
              baseBlob: {
                tierToCool: { daysAfterModificationGreaterThan: 90 }
                tierToArchive: { daysAfterModificationGreaterThan: 365 }
              }
            }
          }
        }
        {
          name: 'harness-zips-tiering'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'harness-zips/' ] }
            actions: {
              baseBlob: { tierToCool: { daysAfterModificationGreaterThan: 30 } }
            }
          }
        }
        {
          name: 'audit-cold-archive'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: [ 'blockBlob' ], prefixMatch: [ 'audit-cold/' ] }
            actions: {
              baseBlob: { tierToArchive: { daysAfterModificationGreaterThan: 90 } }
            }
          }
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// Private Endpoint (blob)
// -----------------------------------------------------------------------------

resource pe 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: 'pe-${storageAccountName}-blob'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'plsc-${storageAccountName}-blob'
        properties: {
          privateLinkServiceId: sa.id
          groupIds: [ 'blob' ]
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Private DNS — so the blob endpoint resolves to the private IP (public access
// is Disabled on the account).
// -----------------------------------------------------------------------------

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.blob.${environment().suffixes.storage}'
  location: 'global'
  tags: tags
}

resource dnsVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: privateDnsZone
  name: 'link-${storageAccountName}-blob'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnetId }
  }
}

resource dnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-05-01' = {
  parent: pe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: { privateDnsZoneId: privateDnsZone.id }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output storageAccountId string = sa.id
output accountName string = sa.name
output blobEndpoint string = sa.properties.primaryEndpoints.blob
