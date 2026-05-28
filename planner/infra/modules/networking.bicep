// =============================================================================
// modules/networking.bicep — VNet + Subnets + NSGs
// =============================================================================

@description('Azure region')
param location string

@description('Tags applied to all resources')
param tags object

@description('Name of the VNet')
param vnetName string

@description('VNet CIDR — default 10.50.0.0/16')
param vnetCidr string = '10.50.0.0/16'

// -----------------------------------------------------------------------------
// Subnet plan (per docs/06 §5)
// -----------------------------------------------------------------------------
//   snet-containerapps       10.50.1.0/24
//   snet-functions           10.50.2.0/24
//   snet-private-endpoints   10.50.10.0/24
//   snet-bastion             10.50.250.0/27
// -----------------------------------------------------------------------------

resource nsgContainerApps 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: 'nsg-${vnetName}-containerapps'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowFrontDoorInbound'
        properties: {
          priority: 100
          protocol: 'Tcp'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: 'AzureFrontDoor.Backend'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRanges: [ '80', '443' ]
        }
      }
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          protocol: '*'
          access: 'Deny'
          direction: 'Inbound'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

resource nsgPrivateEndpoints 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: 'nsg-${vnetName}-pe'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowVnetInbound'
        properties: {
          priority: 100
          protocol: '*'
          access: 'Allow'
          direction: 'Inbound'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// VNet
// -----------------------------------------------------------------------------

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: { addressPrefixes: [ vnetCidr ] }
    subnets: [
      {
        name: 'snet-containerapps'
        properties: {
          addressPrefix: '10.50.1.0/24'
          networkSecurityGroup: { id: nsgContainerApps.id }
          delegations: [
            {
              name: 'Microsoft.App/environments'
              properties: { serviceName: 'Microsoft.App/environments' }
            }
          ]
        }
      }
      {
        name: 'snet-functions'
        properties: {
          addressPrefix: '10.50.2.0/24'
          delegations: [
            {
              name: 'Microsoft.Web/serverFarms'
              properties: { serviceName: 'Microsoft.Web/serverFarms' }
            }
          ]
        }
      }
      {
        name: 'snet-private-endpoints'
        properties: {
          addressPrefix: '10.50.10.0/24'
          networkSecurityGroup: { id: nsgPrivateEndpoints.id }
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'AzureBastionSubnet'
        properties: {
          addressPrefix: '10.50.250.0/27'
        }
      }
    ]
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output vnetId string = vnet.id
output containerAppsSubnetId string = '${vnet.id}/subnets/snet-containerapps'
output functionsSubnetId string = '${vnet.id}/subnets/snet-functions'
output privateEndpointSubnetId string = '${vnet.id}/subnets/snet-private-endpoints'
output bastionSubnetId string = '${vnet.id}/subnets/AzureBastionSubnet'
