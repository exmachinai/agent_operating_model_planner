#!/usr/bin/env bash
# =============================================================================
# AEGIRA Planner — Azure Deploy + Bytecamp-Records-Generator
# =============================================================================
#
# Was es tut:
#   1. Sanity-Check: az CLI, gh, gefoldete bicep-Files.
#   2. Subscription + Region wählen.
#   3. Resource Groups + User-Assigned Managed Identity provisionieren.
#   4. Entra-App-Registration anlegen (oder existierende verwenden).
#   5. Bicep what-if (Trockenlauf).
#   6. Auf Bestätigung warten ("READY?") und Bicep deploy.
#   7. Front-Door-Endpoint + Validation-Tokens extrahieren.
#   8. **4 Bytecamp-Records ready-to-paste ausgeben.**
#
# Ausführen:
#   chmod +x _deploy-azure.sh
#   ./_deploy-azure.sh
#
# WICHTIG:
#   - Du brauchst Owner-Rechte auf der Azure-Subscription für den ersten Run.
#   - Bei den Container-Images: für Phase-2 reicht es, Public-Microsoft-Demo-
#     Images zu nehmen. Die echten Images kommen aus dem CI-Build später.
# =============================================================================

set -euo pipefail

PREFIX="aegira"
ENV="prod"
PRIMARY="swedencentral"
SECONDARY="westeurope"
DOMAIN="aegira.ai"

# Detect newest geklontes Repo unter ~/Code/aegira-aomp-*/repo
WORK_DIR=$(ls -td "$HOME/Code"/aegira-aomp-*/repo 2>/dev/null | head -1 || true)
INFRA_DIR="${WORK_DIR:-/nonexistent}/planner/infra"

# Placeholder-Images für Phase-2 (Microsoft sample)
DEFAULT_BACKEND_IMG="mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
DEFAULT_FRONTEND_IMG="mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"

# -----------------------------------------------------------------------------
# 0. Sanity
# -----------------------------------------------------------------------------
command -v az    >/dev/null || { echo "FEHLER: Azure CLI (az) nicht installiert."; exit 1; }
command -v jq    >/dev/null || { echo "FEHLER: jq nicht installiert.  Install: brew install jq"; exit 1; }
command -v bicep >/dev/null || az bicep install >/dev/null

if [ ! -d "$INFRA_DIR" ]; then
  echo "FEHLER: $INFRA_DIR nicht gefunden."
  echo "Dieses Skript erwartet, dass _push-update.sh vorher gelaufen ist und"
  echo "~/Code/aegira-aomp-*/repo mit den aktuellsten Bicep-Files existiert."
  echo
  echo "Quick-Fix: führe '_push-update.sh' nochmal aus, dann das hier."
  echo "Oder setze WORK_DIR manuell:"
  echo "  WORK_DIR=/pfad/zum/repo bash _deploy-azure.sh"
  exit 1
fi

echo "→ Infra-Pfad: $INFRA_DIR"
echo

# -----------------------------------------------------------------------------
# 0a. KOSTEN-WARNUNG
# -----------------------------------------------------------------------------
cat << 'WARN'

╔══════════════════════════════════════════════════════════════════════════════╗
║  KOSTEN-INFO — Default ist jetzt SPIKE-TIER (costTier=spike in bicepparam):  ║
║                                                                              ║
║    Front Door Standard        ≈  35 €/Monat   (Premium war: 280 €)           ║
║    Container Apps (scale→0)   ≈  15 €/Monat   (Prod war:   120 €)            ║
║    Cosmos DB Serverless       ≈  15 €/Monat   (Prod-multi: 200 €)            ║
║    Storage LRS                ≈   3 €/Monat   (RA-GRS war:   5 €)            ║
║    Key Vault Standard         ≈   1 €/Monat   (Premium war:  5 €)            ║
║    Log Analytics 30d (1GB/d)  ≈  10 €/Monat   (Prod-90d:    40 €)            ║
║    ───────────────────────────────────────                                   ║
║    Spike-Sockel ohne LLM      ≈  79 €/Monat                                  ║
║    Prod-Sockel ohne LLM       ≈ 650 €/Monat   (flippen via costTier='prod')  ║
║                                                                              ║
║  Bei "READY?"-Prompt unten:                                                  ║
║    yes       → Deploy Spike-Tier (~80 €/Monat).                              ║
║    no / Strg+C → Abbrechen, kein Deploy.                                     ║
║                                                                              ║
║  ⚠ HINWEIS zu den nächsten zwei Prompts (Backend-Image, Frontend-Image):     ║
║      Drücke einfach ENTER, um das Microsoft-Demo-Image zu nehmen.            ║
║      NICHT die Subscription-ID eintippen — die wird woanders gebraucht.      ║
║                                                                              ║
║  Du kannst jederzeit Strg+C drücken. Das What-if ist KEIN Deploy.            ║
╚══════════════════════════════════════════════════════════════════════════════╝

WARN

# -----------------------------------------------------------------------------
# 1. Subscription wählen
# -----------------------------------------------------------------------------
echo "→ Verfügbare Subscriptions:"
az account list --query "[].{Name:name, Id:id, IsDefault:isDefault}" -o table

echo
read -r -p "Welche Subscription-ID nutzen? " SUB_ID
az account set --subscription "$SUB_ID"
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "→ Tenant: $TENANT_ID · Sub: $SUB_ID"
echo

# -----------------------------------------------------------------------------
# 2. Entra-App-Registration
# -----------------------------------------------------------------------------
APP_NAME="AEGIRA Planner App"
EXISTING_APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null || true)

if [ -z "$EXISTING_APP_ID" ]; then
  echo "→ Entra-App-Registrierung anlegen …"
  az ad app create \
    --display-name "$APP_NAME" \
    --sign-in-audience AzureADMultipleOrgs \
    --web-redirect-uris "https://zgpm.aegira.ai/auth/callback" >/dev/null

  EXISTING_APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
  az ad sp create --id "$EXISTING_APP_ID" >/dev/null
  echo "  App-ID: $EXISTING_APP_ID (NEU)"
else
  echo "→ Existierende Entra-App nutzen: $EXISTING_APP_ID"
fi
ENTRA_APP_ID=$EXISTING_APP_ID
echo

# -----------------------------------------------------------------------------
# 3. Resource Groups + User-Assigned Managed Identity
# -----------------------------------------------------------------------------
RG_SHARED="${PREFIX}-shared-${ENV}"
RG_PLANNER="${PREFIX}-planner-${ENV}"
RG_OBS="${PREFIX}-observability-${ENV}"

for rg in $RG_SHARED $RG_PLANNER $RG_OBS; do
  if ! az group show -n "$rg" >/dev/null 2>&1; then
    echo "→ Resource Group anlegen: $rg in $PRIMARY"
    az group create -n "$rg" -l "$PRIMARY" >/dev/null
  fi
done

MI_NAME="umi-aegira-planner-${ENV}"
if ! az identity show -g $RG_SHARED -n $MI_NAME >/dev/null 2>&1; then
  echo "→ User-Assigned MI anlegen: $MI_NAME"
  az identity create -g $RG_SHARED -n $MI_NAME -l $PRIMARY >/dev/null
fi
USER_MI_ID=$(az identity show -g $RG_SHARED -n $MI_NAME --query id -o tsv)
echo "  MI: $USER_MI_ID"
echo

# -----------------------------------------------------------------------------
# 4. Bicep what-if
# -----------------------------------------------------------------------------
echo
echo "→ Container-Images. Drück einfach ENTER für die Microsoft-Demo-Images (Phase-2 Spike)."
echo "  Die echten AEGIRA-Images kommen später aus dem CI-Build."
read -r -p "Backend-Image  [ENTER für $DEFAULT_BACKEND_IMG]: " BACKEND_IMG
BACKEND_IMG=${BACKEND_IMG:-$DEFAULT_BACKEND_IMG}
read -r -p "Frontend-Image [ENTER für $DEFAULT_FRONTEND_IMG]: " FRONTEND_IMG
FRONTEND_IMG=${FRONTEND_IMG:-$DEFAULT_FRONTEND_IMG}

export USER_MI_ID
export ENTRA_TENANT_ID=$TENANT_ID
export ENTRA_APP_ID
export BACKEND_API_IMAGE=$BACKEND_IMG
export FRONTEND_IMAGE=$FRONTEND_IMG

echo "→ Bicep what-if (kein Deploy, nur Diff) …"
az deployment sub what-if \
  --location $PRIMARY \
  --template-file "$INFRA_DIR/main.bicep" \
  --parameters "$INFRA_DIR/parameters/prod.bicepparam" \
  --no-pretty-print | head -100
echo

read -r -p "READY? Bicep wirklich deployen? (yes/no) " GO
case "$GO" in
  yes|YES|y|Y)
    echo "→ Deploye Spike-Tier (~80 €/Monat). Tier-Flip auf Prod via prod.bicepparam → costTier='prod'."
    ;;
  *)
    echo "Abbruch."
    exit 0
    ;;
esac

# -----------------------------------------------------------------------------
# 5. Bicep deploy
# -----------------------------------------------------------------------------
DEPLOYMENT_NAME="${PREFIX}-planner-${ENV}-$(date +%Y%m%d%H%M)"
echo "→ Deploy: $DEPLOYMENT_NAME"

az deployment sub create \
  --location $PRIMARY \
  --template-file "$INFRA_DIR/main.bicep" \
  --parameters "$INFRA_DIR/parameters/prod.bicepparam" \
  --name "$DEPLOYMENT_NAME"

echo
echo "→ Outputs:"
az deployment sub show -n "$DEPLOYMENT_NAME" --query properties.outputs

# -----------------------------------------------------------------------------
# 6. Front-Door-Endpoint + Validation-Tokens extrahieren
# -----------------------------------------------------------------------------
echo
echo "→ Front-Door-Endpoint und Validation-Tokens lesen …"

FD_PROFILE="fd-aegira-${ENV}"
FD_HOSTNAME=$(az afd endpoint list -g $RG_SHARED --profile-name $FD_PROFILE --query "[0].hostName" -o tsv)

TOKEN_APP=$(az afd custom-domain show \
  -g $RG_SHARED \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-app \
  --query validationProperties.validationToken -o tsv 2>/dev/null || echo "PENDING")

TOKEN_API=$(az afd custom-domain show \
  -g $RG_SHARED \
  --profile-name $FD_PROFILE \
  --custom-domain-name cd-api \
  --query validationProperties.validationToken -o tsv 2>/dev/null || echo "PENDING")

# -----------------------------------------------------------------------------
# 7. Bytecamp-Records ausgeben (ready-to-paste)
# -----------------------------------------------------------------------------
cat << EOF

================================================================================
✓ AZURE DEPLOY KOMPLETT.
================================================================================

Jetzt im Bytecamp-Panel (https://www.bytecamp.net/customer/) → Domains
→ aegira.ai → DNS-Konfiguration → vier Records anlegen:

┌────────┬───────────────────┬──────────────────────────────────────────────┬──────┐
│ Type   │ Name              │ Ziel / Text                                  │ TTL  │
├────────┼───────────────────┼──────────────────────────────────────────────┼──────┤
│ CNAME  │ zgpm              │ ${FD_HOSTNAME}.                              │ 1H   │
│ CNAME  │ api.zgpm          │ ${FD_HOSTNAME}.                              │ 1H   │
│ TXT    │ _dnsauth.zgpm     │ ${TOKEN_APP}
│ TXT    │ _dnsauth.api.zgpm │ ${TOKEN_API}
└────────┴───────────────────┴──────────────────────────────────────────────┴──────┘

NACH dem Speichern in Bytecamp, hier validieren:
  dig +short CNAME zgpm.aegira.ai
  dig +short CNAME api.zgpm.aegira.ai
  dig +short TXT _dnsauth.zgpm.aegira.ai
  dig +short TXT _dnsauth.api.zgpm.aegira.ai

Dann in Azure die Validation triggern:
  for cd in cd-app cd-api; do
    az afd custom-domain wait -g $RG_SHARED --profile-name $FD_PROFILE \\
      --custom-domain-name \$cd --custom \\
      --condition "properties.domainValidationState=='Approved'" --timeout 600
  done

Erst danach kommt das managed-Cert (5-15 Min nach Approval).

App-URL danach: https://zgpm.aegira.ai
API-URL danach: https://api.zgpm.aegira.ai

================================================================================
EOF
