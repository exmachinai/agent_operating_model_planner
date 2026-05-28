// =============================================================================
// modules/containerApp.bicep — Parameterized Container App (Backend OR Frontend)
// =============================================================================

param location string
param tags object
param appName string
param environmentId string
param userAssignedMiId string
param containerImage string
param targetPort int
param ingressExternal bool = false
param cpu string = '1.0'
param memory string = '2Gi'
param minReplicas int = 2
param maxReplicas int = 10
param envVars array = []

resource app 'Microsoft.App/containerApps@2025-01-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${userAssignedMiId}': {} }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: ingressExternal
        targetPort: targetPort
        transport: 'auto'
        traffic: [ { weight: 100, latestRevision: true } ]
        corsPolicy: {
          allowedOrigins: [ 'https://zgpm.aegira.ai', 'https://docs.aegira.ai' ]
          allowedMethods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ]
          allowedHeaders: [ '*' ]
          allowCredentials: true
        }
      }
      activeRevisionsMode: 'Multiple'  // for rainbow-deploy
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerImage
          resources: { cpu: json(cpu), memory: memory }
          env: envVars
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: targetPort }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/ready', port: targetPort }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: { concurrentRequests: '50' }
            }
          }
        ]
      }
    }
  }
}

output id string = app.id
output fqdn string = app.properties.configuration.ingress.fqdn
output latestRevisionName string = app.properties.latestRevisionName
