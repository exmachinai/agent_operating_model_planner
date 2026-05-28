// =============================================================================
// modules/keyvault.bicep — Key Vault + CMK keys + Private Endpoint
//
// Creates:
//   - Key Vault (SKU configurable: standard or premium)
//   - Two CMK keys (cosmos, storage) — RSA-4096 software-protected
//   - Private Endpoint
//   - RBAC for the User-Assigned MI (Key Vault Secrets User)
//
// Spike-Tier (current): SKU=standard, software-protected keys.
// Prod-Tier (future):   SKU=premium, optionally HSM-protected keys.
//   Cost delta ≈ 5 €/Mo (Premium base) → ~1 €/Mo (Standard base).
//
// Per docs/06 §9.
// =============================================================================

param location string
param tags object
param keyVaultName string
param privateEndpointSubnetId string

@description('Principal ID of the User-Assigned MI used by Container Apps + Functions')
param userAssignedMiPrincipalId string

@description('Retention days for soft-delete. 90 in prod.')
@minValue(7)
@maxValue(90)
param softDeleteRetentionDays int = 90

@description('Key Vault SKU. Spike-Tier = standard, Prod-Tier = premium.')
@allowed([ 'standard', 'premium' ])
param skuName string = 'standard'

// -----------------------------------------------------------------------------
// Key Vault
// -----------------------------------------------------------------------------

resource kv 'Microsoft.KeyVault/vaults@2024-12-01-preview' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: softDeleteRetentionDays
    sku: { family: 'A', name: skuName }
    tenantId: tenant().tenantId
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// -----------------------------------------------------------------------------
// CMK Keys
// -----------------------------------------------------------------------------

resource cosmosCmkKey 'Microsoft.KeyVault/vaults/keys@2024-12-01-preview' = {
  parent: kv
  name: 'cosmos-cmk'
  properties: {
    kty: 'RSA'
    keySize: 4096
    keyOps: [ 'wrapKey', 'unwrapKey' ]
    attributes: { enabled: true }
    rotationPolicy: {
      attributes: { expiryTime: 'P365D' }
      lifetimeActions: [
        {
          trigger: { timeBeforeExpiry: 'P30D' }
          action: { type: 'rotate' }
        }
      ]
    }
  }
}

resource storageCmkKey 'Microsoft.KeyVault/vaults/keys@2024-12-01-preview' = {
  parent: kv
  name: 'storage-cmk'
  properties: {
    kty: 'RSA'
    keySize: 4096
    keyOps: [ 'wrapKey', 'unwrapKey' ]
    attributes: { enabled: true }
    rotationPolicy: {
      attributes: { expiryTime: 'P365D' }
      lifetimeActions: [
        {
          trigger: { timeBeforeExpiry: 'P30D' }
          action: { type: 'rotate' }
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// RBAC: User-Assigned MI gets "Key Vault Secrets User" role
// -----------------------------------------------------------------------------

var keyVaultSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
var keyVaultCryptoServiceEncryptionUserRoleId = 'e147488a-f6f5-4113-8e2d-b22465e65bf6'

resource roleSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, userAssignedMiPrincipalId, keyVaultSecretsUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleId)
    principalId: userAssignedMiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource roleEncryptionUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, userAssignedMiPrincipalId, keyVaultCryptoServiceEncryptionUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultCryptoServiceEncryptionUserRoleId)
    principalId: userAssignedMiPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// -----------------------------------------------------------------------------
// Private Endpoint
// -----------------------------------------------------------------------------

resource pe 'Microsoft.Network/privateEndpoints@2024-05-01' = {
  name: 'pe-${keyVaultName}'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: 'plsc-${keyVaultName}'
        properties: {
          privateLinkServiceId: kv.id
          groupIds: [ 'vault' ]
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output keyVaultId string = kv.id
output uri string = kv.properties.vaultUri
output cosmosCmkKeyUri string = cosmosCmkKey.properties.keyUri
output storageCmkKeyUri string = storageCmkKey.properties.keyUri
