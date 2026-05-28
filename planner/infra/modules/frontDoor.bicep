// =============================================================================
// modules/frontDoor.bicep — Azure Front Door Premium + WAF + Custom Domains
//
// Routes:
//   app.<customDomain>  → frontendFqdn (Container App)
//   api.<customDomain>  → backendApiFqdn (Container App)
//
// WAF: OWASP Core Rule Set 3.2 + Bot Manager + Geo-filter + Rate limit.
// =============================================================================

param location string = 'global'
param tags object
param profileName string
param customDomain string
param backendApiFqdn string
param frontendFqdn string
param allowedCountries array
param wafMode string = 'Prevention'

// -----------------------------------------------------------------------------
// Profile
// -----------------------------------------------------------------------------

resource profile 'Microsoft.Cdn/profiles@2024-09-01' = {
  name: profileName
  location: location
  tags: tags
  sku: { name: 'Premium_AzureFrontDoor' }
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
    hostName: 'app.${customDomain}'
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
    hostName: 'api.${customDomain}'
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
  sku: { name: 'Premium_AzureFrontDoor' }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: wafMode
      requestBodyCheck: 'Enabled'
      customBlockResponseStatusCode: 429
      customBlockResponseBody: base64('Refused by AEGIRA WAF.')
      redirectUrl: 'https://app.${customDomain}/blocked'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleSetAction: 'Block'
        }
      ]
    }
    customRules: {
      rules: [
        {
          name: 'GeoAllow'
          priority: 100
          ruleType: 'MatchRule'
          action: 'Allow'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              matchValue: allowedCountries
            }
          ]
        }
        {
          name: 'GeoDenyDefault'
          priority: 200
          ruleType: 'MatchRule'
          action: 'Block'
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'GeoMatch'
              negateCondition: true
              matchValue: allowedCountries
            }
          ]
        }
        {
          name: 'RateLimitPerIp'
          priority: 300
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
