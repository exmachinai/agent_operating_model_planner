// =============================================================================
// modules/acrCache.bicep — ACR Artifact Cache für Docker-Hub-Base-Images
//
// Zweck: Den Prod-Build robust gegen das anonyme Docker-Hub-Pull-Rate-Limit
// (`toomanyrequests`) machen. Die Base-Images (python, node) werden über die
// eigene ACR `aegiraacrprodtgygvmrc` geproxt und gecacht. Steady-State zieht der
// Build aus dem ACR-Cache (0 Upstream-Pulls); bei Cache-Miss greift über das
// Credential-Set das AUTHENTIFIZIERTE Limit (200 Pulls/6 h) statt der 100 anonym.
//
// Komponenten (alle in der shared RG, co-lokalisiert mit der bestehenden ACR):
//   1. Key Vault            — hält Docker-Hub-Username + read-only-PAT als Secrets.
//   2. Credential-Set       — System-Assigned-Identity, verweist auf die KV-Secret-URIs.
//   3. Role-Assignment      — Credential-Set-Identity → `Key Vault Secrets User`.
//   4. Zwei Cache-Rules     — docker.io/library/{python,node} → docker-hub/library/...
//
// ZWEI BETRIEBSARTEN:
//   (A) Azure-native / anonym (DEFAULT, kein Docker-Hub-PAT):
//         enableCacheRules=true, enableCredentialSet=false
//       → Cache-Rules ohne Credentials. Die ACR proxt+cached docker.io anonym;
//         nach der ersten Population 0 Upstream-Pulls. Kein KV/Secret nötig.
//   (B) Authentifizierter Upstream (optionales Upgrade, 200 statt 100 Pulls/6 h):
//         enableCacheRules=true, enableCredentialSet=true  (+ KV-Secrets gesetzt)
//       → zusätzlich Credential-Set + Role; Cache-Rules referenzieren es.
//
// Phase A (nur KV vorbereiten, für späteres Upgrade B): beide false.
// Chicken-Egg bei B: Credential-Set referenziert die KV-Secrets → zuerst KV anlegen,
// Secrets setzen (`az keyvault secret set`, NIE im Repo), dann B deployen.
// Orchestriert von `_deploy-acr-cache.sh`.
//
// SECURITY (azure-best-practices): Keine Secrets im Code/Params — nur die Secret-URIs
// fließen durch Bicep, der PAT wird out-of-band per CLI gesetzt. RBAC least-privilege
// (`Key Vault Secrets User`). Bewusste, dokumentierte Abweichung von der Baseline:
// KEIN Private Endpoint — der Vault hält ausschließlich einen read-only Docker-Hub-PAT
// (keine Kundendaten); ACR erreicht ihn über den Trusted-Services-Bypass. Siehe
// docs/18_acr-artifact-cache.md (ADR-Begründung).
// =============================================================================

targetScope = 'resourceGroup'

@description('Standort des Key Vault (= ACR-Region, Sweden — residenz-irrelevant, nur PAT).')
param location string

@description('Tags für alle Ressourcen.')
param tags object

@description('Name der BESTEHENDEN ACR (z. B. aegiraacrprodtgygvmrc).')
param acrName string

@description('Name des Key Vault für die Docker-Hub-Credentials. 3-24 Zeichen.')
@minLength(3)
@maxLength(24)
param keyVaultName string

@description('Cache-Rules anlegen (docker.io/library/{python,node} → docker-hub/library/...). Default false für die reine KV-Vorbereitung (Phase A).')
param enableCacheRules bool = false

@description('python-Cache-Rule anlegen. Default true (konvergierter Stand): python läuft wie node als authentifizierte Cache-Rule. Nur auf false setzen, wenn docker-hub/library/python als gepinnter `az acr import` existiert (Cache-Rules können nicht über existierende Repos gelegt werden).')
param enablePythonCacheRule bool = true

@description('Authentifizierter Upstream: Credential-Set + Role anlegen und an die Cache-Rules hängen. false = anonymer Upstream (Azure-native, kein PAT nötig).')
param enableCredentialSet bool = false

@description('Login-Server des Upstreams. Für Docker Hub immer docker.io.')
param dockerHubLoginServer string = 'docker.io'

@description('Optionale Object-ID eines Operators, der für den Secret-Set-Schritt "Key Vault Secrets Officer" erhält (leer = überspringen).')
param operatorObjectId string = ''

@description('PrincipalType der operatorObjectId (User für Personen, ServicePrincipal für CI-Identitäten).')
@allowed([ 'User', 'ServicePrincipal', 'Group' ])
param operatorPrincipalType string = 'User'

// Feste Secret-Namen — auf diese verweisen sowohl `_deploy-acr-cache.sh` (Secret-Set)
// als auch das Credential-Set (Secret-URIs).
var usernameSecretName = 'dockerhub-username'
var tokenSecretName = 'dockerhub-token'

// Built-in-Role-IDs
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'    // Key Vault Secrets User
var kvSecretsOfficerRoleId = 'b86a8fe4-44ce-4948-aee5-eccb2c155cd7' // Key Vault Secrets Officer

// -----------------------------------------------------------------------------
// Bestehende ACR (wird NICHT neu angelegt — nur als Parent referenziert)
// -----------------------------------------------------------------------------

resource acr 'Microsoft.ContainerRegistry/registries@2024-11-01-preview' existing = {
  name: acrName
}

// -----------------------------------------------------------------------------
// Key Vault (Docker-Hub-Credentials)
// -----------------------------------------------------------------------------

resource kv 'Microsoft.KeyVault/vaults@2024-12-01-preview' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    // Bewusst Public-Access: Vault hält nur einen read-only Docker-Hub-PAT
    // (keine Kundendaten). bypass=AzureServices lässt die ACR-Credential-Set-
    // Identität (Trusted Service) zu. Siehe docs/18 (ADR-Abweichung von der Baseline).
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Optional: Operator bekommt "Secrets Officer", um in Phase A das PAT zu setzen.
resource roleOperator 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(operatorObjectId)) {
  scope: kv
  name: guid(kv.id, operatorObjectId, kvSecretsOfficerRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsOfficerRoleId)
    principalId: operatorObjectId
    principalType: operatorPrincipalType
  }
}

// -----------------------------------------------------------------------------
// Phase B — Credential-Set + Role-Assignment + Cache-Rules
// -----------------------------------------------------------------------------

resource credSet 'Microsoft.ContainerRegistry/registries/credentialSets@2024-11-01-preview' = if (enableCredentialSet) {
  parent: acr
  name: 'dockerhub'
  identity: { type: 'SystemAssigned' }
  properties: {
    loginServer: dockerHubLoginServer
    authCredentials: [
      {
        // 'Credential1' ist der einzige zulässige Name (genau eine Credential pro Set).
        name: 'Credential1'
        // Unversionierte Secret-URIs → Rotation des PAT wirkt ohne Bicep-Redeploy.
        usernameSecretIdentifier: '${kv.properties.vaultUri}secrets/${usernameSecretName}'
        passwordSecretIdentifier: '${kv.properties.vaultUri}secrets/${tokenSecretName}'
      }
    ]
  }
}

// Credential-Set-Identity darf die KV-Secrets lesen (least privilege).
resource roleCredSet 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableCredentialSet) {
  scope: kv
  name: guid(kv.id, 'dockerhub-credset', kvSecretsUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    // Gleiche if-Bedingung wie credSet → zur Laufzeit garantiert vorhanden (Non-Null-Assertion).
    principalId: credSet!.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// credentialSetResourceId wird nur bei enableCredentialSet angehängt (sonst anonym).
resource cacheRulePython 'Microsoft.ContainerRegistry/registries/cacheRules@2024-11-01-preview' = if (enableCacheRules && enablePythonCacheRule) {
  parent: acr
  name: 'docker-hub-python'
  properties: union(
    {
      sourceRepository: 'docker.io/library/python'
      targetRepository: 'docker-hub/library/python'
    },
    enableCredentialSet ? { credentialSetResourceId: credSet!.id } : {}
  )
}

resource cacheRuleNode 'Microsoft.ContainerRegistry/registries/cacheRules@2024-11-01-preview' = if (enableCacheRules) {
  parent: acr
  name: 'docker-hub-node'
  properties: union(
    {
      sourceRepository: 'docker.io/library/node'
      targetRepository: 'docker-hub/library/node'
    },
    enableCredentialSet ? { credentialSetResourceId: credSet!.id } : {}
  )
}

// -----------------------------------------------------------------------------
// Outputs
// -----------------------------------------------------------------------------

output keyVaultName string = kv.name
output keyVaultUri string = kv.properties.vaultUri
output usernameSecretName string = usernameSecretName
output tokenSecretName string = tokenSecretName
output credentialSetResourceId string = enableCredentialSet ? credSet.id : ''
// Pull-Pfad-Präfix für die Dockerfile-FROM-Zeilen (zur Doku/Verifikation).
output cacheRepositoryPrefix string = '${acr.properties.loginServer}/docker-hub/library'
