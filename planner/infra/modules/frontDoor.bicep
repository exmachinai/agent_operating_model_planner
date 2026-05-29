// =============================================================================
// modules/frontDoor.bicep — Azure Front Door + WAF + Custom Domains
//
// Routes:
//   app.<customDomain>  → frontendFqdn (Container App)
//   api.<customDomain>  → backendApiFqdn (Container App)
//
// Spike-Tier (current): Standard_AzureFrontDoor SKU, custom-rules-only WAF
//   (Geo-allow + Geo-deny + RateLimit). No managed rule sets (Premium-only).
// Prod-Tier (future):   Premium_AzureFrontDoor SKU, managedRuleSets with
//   Microsoft_DefaultRuleSet 2.1 + Microsoft_BotManagerRuleSet 1.0 (Block).
//   Cost delta ≈ 280 €/Mo → ≈ 35 €/Mo (~245 € savings).
// =============================================================================

param location string = 'global'
param tags object
param profileName string
param customDomain string
param backendApiFqdn string
param frontendFqdn string
param allowedCountries array
param wafMode string = 'Prevention'

@description('SKU tier. Spike-Tier = Standard_AzureFrontDoor, Prod-Tier = Premium_AzureFrontDoor.')
@allowed([ 'Standard_AzureFrontDoor', 'Premium_AzureFrontDoor' ])
param skuName string = 'Standard_AzureFrontDoor'

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

resource profile 'Microsoft.Cdn/profiles@2024-09-01' = {
  name: profileName
  location: location
  tags: tags
  sku: { name: skuName }
  properties: {
    originResponseTimeoutSeconds: 60
  }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-09-01' = {
  parent: profile
  name: 'ep-${profileName}'
  location: location
  tags: tags
  properties: {
    enabledState: 'Enabled'
  }
}

// -----------------------------------------------------------------------------
// Origin groups
// -----------------------------------------------------------------------------

resource ogApi 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  parent: profile
  name: 'og-api'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/health'
      probeRequestType: 'GET'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 60
    }
    sessionAffinityState: 'Disabled'
  }
}

resource ogFrontend 'Microsoft.Cdn/profiles/originGroups@2024-09-01' = {
  parent: profile
  name: 'og-frontend'
  properties: {
    loadBalancingSettings: { sampleSize: 4, successfulSamplesRequired: 3, additionalLatencyInMilliseconds: 50 }
    healthProbeSettings: { probePath: '/', probeRequestType: 'HEAD', probeProtocol: 'Https', probeIntervalInSeconds: 60 }
    sessionAffinityState: 'Disabled'
  }
}

resource originApi 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = {
  parent: ogApi
  name: 'origin-api'
  properties: {
    hostName: backendApiFqdn
    originHostHeader: backendApiFqdn
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

resource originFrontend 'Microsoft.Cdn/profiles/originGroups/origins@2024-09-01' = {
  parent: ogFrontend
  name: 'origin-frontend'
  properties: {
    hostName: frontendFqdn
    originHostHeader: frontendFqdn
    httpPort: 80
    httpsPort: 443
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// -----------------------------------------------------------------------------
// Custom Domains (managed certificates)
// -----------------------------------------------------------------------------

resource cdApp 'Microsoft.Cdn/profiles/customDomains@2024-09-01' = {
  parent: profile
  name: 'cd-app'
  properties: {
    hostName: 'zgpm.${customDomain}'
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource cdApi 'Microsoft.Cdn/profiles/customDomains@2024-09-01' = {
  parent: profile
  name: 'cd-api'
  properties: {
    hostName: 'api.zgpm.${customDomain}'
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

resource routeApp 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = {
  parent: endpoint
  name: 'route-app'
  properties: {
    customDomains: [ { id: cdApp.id } ]
    originGroup: { id: ogFrontend.id }
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/*' ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    linkToDefaultDomain: 'Disabled'
    cacheConfiguration: null
  }
  dependsOn: [ originFrontend ]
}

resource routeApi 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-09-01' = {
  parent: endpoint
  name: 'route-api'
  properties: {
    customDomains: [ { id: cdApi.id } ]
    originGroup: { id: ogApi.id }
    supportedProtocols: [ 'Http', 'Https' ]
    patternsToMatch: [ '/*' ]
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    linkToDefaultDomain: 'Disabled'
    cacheConfiguration: null
  }
  dependsOn: [ originApi ]
}

// -----------------------------------------------------------------------------
// WAF Policy
// -----------------------------------------------------------------------------

resource waf 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2024-02-01' = {
  name: 'waf${replace(profileName, '-', '')}'
  location: 'global'
  tags: tags
  // WAF SKU must match the Front Door profile SKU.
  sku: { name: skuName }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: wafMode
      requestBodyCheck: 'Enabled'
      customBlockResponseStatusCode: 429
      customBlockResponseBody: base64('Refused by AEGIRA WAF.')
      redirectUrl: 'https://zgpm.${customDomain}/blocked'
    }
    // Spike-Tier: no managedRuleSets — Standard SKU does not support them.
    // Prod-Tier (Premium) re-enables Microsoft_DefaultRuleSet 2.1 + Bot Manager.
    customRules: {
      rules: [
        // Geo-Block: AFD Standard limits matchValue to ≤10 entries per condition.
        // For 30 allowed countries we split into 3 chunks combined via AND on
        // negated GeoMatch — logic: "block IF country in NONE of the chunks".
        // Prod-Tier (Premium WAF) supports >10 values per match — simpler rule.
        {
          name: 'GeoBlockNotAllowed'
          priority: 100
          ruleType: 'MatchRule'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              negateCondition: true
              matchValue: take(allowedCountries, 10)
            }
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              negateCondition: true
              matchValue: take(skip(allowedCountries, 10), 10)
            }
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              negateCondition: true
              matchValue: skip(allowedCountries, 20)
            }
          ]
        }
        {
          name: 'RateLimitPerIp'
          priority: 200
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 100
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'IPMatch'
              matchValue: [ '0.0.0.0/0' ]
            }
          ]
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// Security Policy (WAF binding to endpoint)
// -----------------------------------------------------------------------------

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2024-09-01' = {
  parent: profile
  name: 'sp-${profileName}'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: waf.id }
      associations: [
        {
          domains: [ { id: cdApp.id }, { id: cdApi.id } ]
          patternsToMatch: [ '/*' ]
        }
      ]
    }
  }
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output endpointHostName string = endpoint.properties.hostName
output profileId string = profile.id
output wafId string = waf.id
