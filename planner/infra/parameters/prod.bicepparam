// =============================================================================
// Production parameters
// Domain: aegira.ai
//
// NOTE: This file defaults to SPIKE-TIER cost defaults (~80 €/Mo).
// To flip to Prod-Tier (~650 €/Mo), search for "Spike-Tier" comments below
// and toggle the values. The deploy script (_deploy-azure.sh) shows the
// active tier in its READY?-prompt.
// =============================================================================

using '../main.bicep'

param environment = 'prod'
param primaryLocation = 'swedencentral'
param secondaryLocation = 'westeurope'
param resourcePrefix = 'aegira'
param customDomain = 'aegira.ai'

// Cost tier — toggle ONLY when revenue + traffic justify Prod-Tier.
// Spike-Tier (~80 €/Mo)  = serverless Cosmos, FD Standard, scale-to-zero CAE.
// Prod-Tier  (~650 €/Mo) = provisioned Cosmos multi-region, FD Premium WAF,
//                          zone-redundant CAE, RA-GRS storage, 90d retention.
param costTier = 'spike'

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
