#!/usr/bin/env bash
# =============================================================================
# AEGIRA Planner — Container Images bauen + in ACR pushen + Container Apps updaten
# =============================================================================
#
# Voraussetzung: PR #8 ist gemerged + Bicep ist deployed (ACR existiert).
#
# Was es tut:
#   1. ACR-Login-Server ermitteln aus Deploy-Outputs.
#   2. `az acr login` für authentifiziertes Push.
#   3. Backend-Image bauen + pushen (planner-api:v0.1.0).
#   4. Frontend-Image bauen + pushen (planner-frontend:v0.1.0).
#   5. Container Apps updaten auf die neuen Image-Tags.
#   6. Smoke-Test: curl beide Public URLs.
#
# Ausführen:
#   chmod +x _push-images.sh
#   ./_push-images.sh
#
# Voraussetzungen lokal:
#   - Docker Desktop läuft (oder Colima / Rancher)
#   - az CLI mit aktiver Subscription
#   - Buildx aktiv (kommt mit Docker Desktop, sonst: docker buildx create --use)
# =============================================================================

set -euo pipefail

VERSION="${1:-v0.1.0}"
RG_PLANNER="aegira-planner-prod"
RG_SHARED="aegira-shared-prod"

# Detect newest deploy-output für ACR-Name
WORK_DIR=$(ls -td "$HOME/Code"/aegira-aomp-*/repo 2>/dev/null | head -1 || true)
INFRA_DIR="${WORK_DIR:-/nonexistent}/planner/infra"
PLANNER_DIR="${WORK_DIR:-/nonexistent}/planner"

if [ ! -d "$PLANNER_DIR" ]; then
  echo "FEHLER: $PLANNER_DIR nicht gefunden — _push-update.sh vorher ausführen."
  exit 1
fi

# -----------------------------------------------------------------------------
# 0. Sanity
# -----------------------------------------------------------------------------
command -v az     >/dev/null || { echo "FEHLER: az CLI nicht installiert."; exit 1; }
command -v docker >/dev/null || { echo "FEHLER: Docker nicht installiert (oder Daemon läuft nicht)."; exit 1; }
docker info >/dev/null 2>&1   || { echo "FEHLER: Docker-Daemon läuft nicht. Starte Docker Desktop."; exit 1; }

# -----------------------------------------------------------------------------
# 1. ACR-Login-Server aus letztem Deploy holen
# -----------------------------------------------------------------------------
echo "→ ACR-Login-Server ermitteln …"
ACR_LOGIN_SERVER=$(az acr list -g "$RG_SHARED" --query "[?starts_with(name, 'aegiraacr')].loginServer" -o tsv | head -1)

if [ -z "${ACR_LOGIN_SERVER:-}" ]; then
  echo "FEHLER: Kein ACR im RG $RG_SHARED gefunden. Hat das Bicep-Deploy ACR angelegt?"
  echo "Versuche: az deployment sub show -n <latest-deploy> --query properties.outputs.acrLoginServer"
  exit 1
fi
ACR_NAME=$(echo "$ACR_LOGIN_SERVER" | cut -d. -f1)
echo "  ACR: $ACR_LOGIN_SERVER ($ACR_NAME)"
echo

# -----------------------------------------------------------------------------
# 2. ACR-Login
# -----------------------------------------------------------------------------
echo "→ az acr login --name $ACR_NAME …"
az acr login --name "$ACR_NAME"
echo

# -----------------------------------------------------------------------------
# 3. Backend bauen + pushen
# -----------------------------------------------------------------------------
BACKEND_IMG="${ACR_LOGIN_SERVER}/planner-api:${VERSION}"
echo "→ Backend bauen: $BACKEND_IMG"
docker build --platform linux/amd64 -t "$BACKEND_IMG" "$PLANNER_DIR/api"
echo
echo "→ Backend pushen …"
docker push "$BACKEND_IMG"
echo

# -----------------------------------------------------------------------------
# 4. Frontend bauen + pushen
# -----------------------------------------------------------------------------
FRONTEND_IMG="${ACR_LOGIN_SERVER}/planner-frontend:${VERSION}"
echo "→ Frontend bauen: $FRONTEND_IMG"
docker build --platform linux/amd64 -t "$FRONTEND_IMG" "$PLANNER_DIR"
echo
echo "→ Frontend pushen …"
docker push "$FRONTEND_IMG"
echo

# -----------------------------------------------------------------------------
# 5. Container Apps auf neue Images zeigen
# -----------------------------------------------------------------------------
echo "→ Container App Backend auf neues Image umstellen …"
az containerapp update \
  -g "$RG_PLANNER" \
  -n ca-aegira-planner-api \
  --image "$BACKEND_IMG" \
  --query "{name:name, image:properties.template.containers[0].image, revision:properties.latestRevisionName}" \
  -o table
echo

echo "→ Container App Frontend auf neues Image umstellen …"
az containerapp update \
  -g "$RG_PLANNER" \
  -n ca-aegira-planner-frontend \
  --image "$FRONTEND_IMG" \
  --query "{name:name, image:properties.template.containers[0].image, revision:properties.latestRevisionName}" \
  -o table
echo

# -----------------------------------------------------------------------------
# 6. Smoke-Tests
# -----------------------------------------------------------------------------
echo "→ Warte 60 Sek bis Revisions hochgefahren sind …"
sleep 60

echo
echo "================================================================================"
echo "✓ DEPLOY KOMPLETT. Smoke-Tests:"
echo "================================================================================"
echo
echo "--- App: https://zgpm.aegira.ai ---"
curl -sI https://zgpm.aegira.ai | head -3
echo
echo "--- API health: https://api.zgpm.aegira.ai/health ---"
curl -s https://api.zgpm.aegira.ai/health | head -5
echo
echo "--- Frontend health: https://zgpm.aegira.ai/api/health ---"
curl -s https://zgpm.aegira.ai/api/health | head -5
echo
echo "================================================================================"
