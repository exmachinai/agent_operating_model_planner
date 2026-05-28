// =============================================================================
// Production parameters
// Domain: aegira.ai
// =============================================================================

using '../main.bicep'

param environment = 'prod'
param primaryLocation = 'swedencentral'
param secondaryLocation = 'westeurope'
param resourcePrefix = 'aegira'
param customDomain = 'aegira.ai'

param backendApiImage = readEnvironmentVariable('BACKEND_API_IMAGE', 'acr-aegira.azurecr.io/planner-api:latest')
param frontendImage   = readEnvironmentVariable('FRONTEND_IMAGE',  'acr-aegira.azurecr.io/planner-frontend:latest')

param userAssignedMiId = readEnvironmentVariable('USER_MI_ID')
param entraTenantId    = readEnvironmentVariable('ENTRA_TENANT_ID')
param entraAppId       = readEnvironmentVariable('ENTRA_APP_ID')

param tags = {
  app: 'aegira-planner'
  owner: 'exmachinAI'
  costcenter: 'AEGIRA-PLATFORM'
  managed_by: 'bicep'
  compliance: 'EU-AI-Act'
  environment: 'prod'
}

// Empty array = use module default (EU + UK + CH + USA).
// param allowedCountries = []
