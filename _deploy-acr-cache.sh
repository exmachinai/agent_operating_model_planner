#!/usr/bin/env bash
# =============================================================================
# AEGIRA Planner — ACR Artifact Cache Bootstrap (Docker-Hub-Rate-Limit-Fix)
# =============================================================================
#
# Richtet auf der bestehenden ACR `aegiraacrprodtgygvmrc` einen authentifizierten
# Docker-Hub-Cache ein, damit `az acr build` nicht mehr ins anonyme Pull-Rate-Limit
# (`toomanyrequests`) läuft. Danach ziehen die Dockerfiles ihre Base-Images über
# den ACR-Cache (siehe planner/{api/,}Dockerfile, docs/18_acr-artifact-cache.md).
#
# DIES IST EIN INFRA-SUB-DEPLOY — bewusst getrennt vom Routine-Image-Push
# (.github/workflows/deploy.yml). Einmalig auszuführen (bzw. bei PAT-Rotation Schritt 4).
#
# Voraussetzungen: az CLI (eingeloggt, `az login`), Rechte auf RG aegira-shared-prod,
# ein Docker-Hub-Account + ein READ-ONLY Personal Access Token (PAT):
#   Docker Hub → Account Settings → Personal access tokens → Generate
#   → Permissions: "Read-only". Token kopieren (wird nur einmal angezeigt).
#
# Ausführen:
#   chmod +x _deploy-acr-cache.sh
#   ./_deploy-acr-cache.sh
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Konfiguration (an deploy.yml / main.bicep ausgerichtet)
# -----------------------------------------------------------------------------
RG_SHARED="aegira-shared-prod"
ACR="aegiraacrprodtgygvmrc"
LOCATION="swedencentral"                  # ACR-Region; Vault hält nur einen PAT (residenz-irrelevant)
KV_NAME="${KV_NAME:-kv-aegira-dhub-prod}" # 3-24 Zeichen, global eindeutig; per Env übersteuerbar
USERNAME_SECRET="dockerhub-username"
TOKEN_SECRET="dockerhub-token"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE="$SCRIPT_DIR/planner/infra/modules/acrCache.bicep"

# -----------------------------------------------------------------------------
# 0. Sanity
# -----------------------------------------------------------------------------
command -v az >/dev/null || { echo "FEHLER: Azure CLI (az) nicht installiert."; exit 1; }
[ -f "$MODULE" ] || { echo "FEHLER: Bicep-Modul nicht gefunden: $MODULE"; exit 1; }

az account show >/dev/null 2>&1 || { echo "FEHLER: nicht eingeloggt — führe 'az login' aus."; exit 1; }
az acr show -n "$ACR" >/dev/null 2>&1 || { echo "FEHLER: ACR '$ACR' nicht erreichbar (falsche Subscription?)."; exit 1; }

echo "→ ACR:        $ACR"
echo "→ Shared-RG:  $RG_SHARED"
echo "→ Key Vault:  $KV_NAME  (Region $LOCATION)"
echo "→ Modul:      $MODULE"
echo

# Object-ID des aktuell eingeloggten Operators → bekommt 'Secrets Officer' für Schritt 4.
OPERATOR_OID="$(az ad signed-in-user show --query id -o tsv 2>/dev/null || true)"
OPERATOR_TYPE="User"
if [ -z "$OPERATOR_OID" ]; then
  echo "  Hinweis: signed-in-user nicht ermittelbar (SP-Login?). Ohne Operator-RBAC —"
  echo "  in Schritt 4 brauchst du dann selbst 'Key Vault Secrets Officer' auf $KV_NAME."
fi

TAGS='{"app":"aegira-planner","owner":"exmachinAI","costcenter":"AEGIRA-PLATFORM","managed_by":"bicep","compliance":"EU-AI-Act","purpose":"acr-dockerhub-cache"}'

# -----------------------------------------------------------------------------
# Phase A — Key Vault anlegen (noch KEIN Credential-Set)
# -----------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════"
echo "  PHASE A — Key Vault provisionieren"
echo "════════════════════════════════════════════════════════════════════════════"
az deployment group create \
  --resource-group "$RG_SHARED" \
  --name "acr-cache-phaseA-$(az account show --query id -o tsv | cut -c1-8)" \
  --template-file "$MODULE" \
  --parameters \
      location="$LOCATION" \
      acrName="$ACR" \
      keyVaultName="$KV_NAME" \
      enableCredentialSet=false \
      operatorObjectId="${OPERATOR_OID:-}" \
      operatorPrincipalType="$OPERATOR_TYPE" \
      tags="$TAGS" \
  --query "properties.provisioningState" -o tsv

echo "  ✓ Key Vault bereit."
echo

# -----------------------------------------------------------------------------
# Schritt 4 — Docker-Hub-Credentials als KV-Secrets setzen (NIE im Repo!)
# -----------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════"
echo "  SECRETS — Docker-Hub-Login in den Key Vault (read-only PAT)"
echo "════════════════════════════════════════════════════════════════════════════"
read -r -p "Docker-Hub-Username: " DH_USER
read -r -s -p "Docker-Hub READ-ONLY PAT (Eingabe verborgen): " DH_PAT; echo

[ -n "$DH_USER" ] && [ -n "$DH_PAT" ] || { echo "FEHLER: Username/PAT dürfen nicht leer sein."; exit 1; }

# RBAC-Propagation kann ein paar Sekunden brauchen — mit Retry setzen.
set +e
for i in $(seq 1 12); do
  az keyvault secret set --vault-name "$KV_NAME" --name "$USERNAME_SECRET" --value "$DH_USER" >/dev/null 2>&1 && \
  az keyvault secret set --vault-name "$KV_NAME" --name "$TOKEN_SECRET"   --value "$DH_PAT"  >/dev/null 2>&1 && break
  echo "  … RBAC propagiert noch (Versuch $i/12), warte 10s"; sleep 10
done
RC=$?
set -e
unset DH_PAT
[ "$RC" -eq 0 ] || { echo "FEHLER: Secret-Set fehlgeschlagen — hast du 'Key Vault Secrets Officer' auf $KV_NAME?"; exit 1; }
echo "  ✓ Secrets gesetzt ($USERNAME_SECRET, $TOKEN_SECRET)."
echo

# -----------------------------------------------------------------------------
# Phase B — Credential-Set + Role-Assignment + Cache-Rules
# -----------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════"
echo "  PHASE B — Credential-Set + Cache-Rules"
echo "════════════════════════════════════════════════════════════════════════════"
az deployment group create \
  --resource-group "$RG_SHARED" \
  --name "acr-cache-phaseB-$(az account show --query id -o tsv | cut -c1-8)" \
  --template-file "$MODULE" \
  --parameters \
      location="$LOCATION" \
      acrName="$ACR" \
      keyVaultName="$KV_NAME" \
      enableCredentialSet=true \
      tags="$TAGS" \
  --query "properties.provisioningState" -o tsv

echo "  ✓ Credential-Set + Cache-Rules deployt."
echo

# -----------------------------------------------------------------------------
# Verifikation
# -----------------------------------------------------------------------------
echo "════════════════════════════════════════════════════════════════════════════"
echo "  VERIFIKATION"
echo "════════════════════════════════════════════════════════════════════════════"
echo "→ Cache-Rules:"
az acr cache list -r "$ACR" -o table || true
echo
echo "→ Credential-Set:"
az acr credential-set show -r "$ACR" -n dockerhub \
  --query "{name:name, loginServer:loginServer, principalId:identity.principalId}" -o table || true
echo
echo "→ Test-Pull (populiert den Cache; darf KEIN 'toomanyrequests' werfen):"
echo "    az acr login -n $ACR"
echo "    docker pull $ACR.azurecr.io/docker-hub/library/python:3.12-slim"
echo "    docker pull $ACR.azurecr.io/docker-hub/library/node:22-alpine"
echo
echo "✓ Fertig. Die Dockerfile-FROM-Zeilen zeigen bereits auf den Cache-Pfad."
echo "  Nächster regulärer Deploy (prod) zieht die Base-Images authentifiziert/gecacht."
