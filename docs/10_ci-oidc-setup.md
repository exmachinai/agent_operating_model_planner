# 10 — CI-OIDC-Setup für `deploy.yml`

Einmalige Einrichtung, damit der GitHub-Actions-Workflow `.github/workflows/deploy.yml`
sich **ohne Klartext-Secrets** via OIDC bei Azure anmeldet (federated credentials).

> Voraussetzung: `az login` lokal mit ausreichenden Rechten (App-Registration anlegen +
> Rollen auf ACR und der Planner-Resource-Group zuweisen). Werte unten ggf. anpassen.

## 0. Variablen

```bash
APP_NAME="aegira-planner-cicd"
REPO="exmachinai/agent_operating_model_planner"   # owner/repo
RG_PLANNER="aegira-planner-prod"
RG_SHARED="aegira-shared-prod"

SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
```

## 1. App-Registration + Service Principal anlegen

```bash
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
az ad sp create --id "$APP_ID" >/dev/null
echo "AZURE_CLIENT_ID = $APP_ID"
```

## 2. Federated Credential auf das Repo binden

Eine Credential pro Trigger-Kontext. Der Workflow läuft bei Tag-Push (`v*`) und manuell —
darum eine Credential für Tags und eine für den Default-Branch (deckt `workflow_dispatch` ab).

```bash
# a) Tag-Pushes (v*)
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-tags",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':ref:refs/tags/v*",
  "audiences": ["api://AzureADTokenExchange"]
}'

# b) workflow_dispatch vom main-Branch
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "gh-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

> Hinweis: Der `subject` muss exakt zum OIDC-Token von GitHub passen. Tag-Wildcards
> (`refs/tags/v*`) funktionieren; für strengere Bindung stattdessen `environment:prod`
> nutzen und im Workflow ein `environment:` setzen.

## 3. Rollen zuweisen (least privilege)

```bash
SP_OID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

# ACR: Images pushen
ACR_ID=$(az acr list -g "$RG_SHARED" \
  --query "[?starts_with(name,'aegiraacr')].id" -o tsv | head -1)
az role assignment create --assignee-object-id "$SP_OID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope "$ACR_ID"

# Container Apps: Images umstellen (eng auf die Planner-RG)
az role assignment create --assignee-object-id "$SP_OID" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG_PLANNER"
```

> `Contributor` auf RG-Ebene ist der pragmatische Default für `containerapp update`.
> Enger geht via Custom-Role mit `Microsoft.App/containerApps/*` — optional später.

## 4. GitHub-Secrets + Variable setzen

```bash
gh secret set AZURE_CLIENT_ID       --repo "$REPO" --body "$APP_ID"
gh secret set AZURE_TENANT_ID       --repo "$REPO" --body "$TENANT_ID"
gh secret set AZURE_SUBSCRIPTION_ID --repo "$REPO" --body "$SUB_ID"

# Optional — nur wenn von Prod-Default abweichend:
gh variable set NEXT_PUBLIC_API_BASE_URL --repo "$REPO" --body "https://api.zgpm.aegira.ai"
```

## 5. Testlauf

```bash
# Manuell, ohne Tag:
gh workflow run deploy.yml --repo "$REPO" -f version=v0.0.0-cictest

# Oder per Tag:
git tag v0.3.1 && git push origin v0.3.1
```

Den Lauf beobachten: `gh run watch --repo "$REPO"`. Der `Smoke-Tests`-Step am Ende
prüft `zgpm.aegira.ai` und `api.zgpm.aegira.ai`.
