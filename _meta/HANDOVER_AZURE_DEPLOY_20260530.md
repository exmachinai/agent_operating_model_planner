# HANDOVER → Claude Code (neue Session) — Produktiv-Deploy zgpm.aegira.ai

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` (Zone 3) · **Stand:** 2026-05-30
**Branch mit aktuellem Code:** `main` (PR #21 gemergt) + offener PR `claude/lockscreen-deploy-EHpW2` (Lockscreen + CI-Workflow)

> Diese Datei in einer **neuen Claude-Code-Session mit Azure-Zugang** öffnen und
> abarbeiten. Die aktuelle Build-/Web-Session hatte **kein** `az`/Docker/Azure-Netz
> — daher konnte nicht deployt werden. Code, Tests und User Guide sind fertig.

---

## 0. Voraussetzungen der neuen Session (Gate)

- **Environment-Netzwerk-Policy** mit Azure-Zugriff (`login.microsoftonline.com`,
  `management.azure.com`, `*.azurecr.io`, `*.azurefd.net`).
- `az` CLI, `bicep`, `gh`, **Docker mit buildx** (laufender Daemon).
- **Owner** auf der Ziel-Subscription (für den ersten Run: RG/MI/Entra-App anlegen).
- Repo geklont, ausgecheckt auf `main` (enthält Harness/Plan-UX/CRUD/Dropbox; nach
  Merge von `claude/lockscreen-deploy-EHpW2` auch den aktiven Lockscreen).

Prüfen: `az account show`, `docker info`, `bicep --version`.

---

## 1. Zielbild & Eckdaten (aus `planner/infra/parameters/prod.bicepparam`)

- **Domain (App):** `https://zgpm.aegira.ai` (Front-Door-Custom-Domain; Zonen-Apex `aegira.ai`).
- **Region:** `germanywestcentral` (Frankfurt) primär, `germanynorth` sekundär
  — Migration 2026-05-30 weg von Sweden Central (deutsche Datenresidenz).
- **Cost-Tier:** `spike` (~80 €/Mo: serverless Cosmos, FD Standard, scale-to-zero CAE).
- **Komponenten:** ACR · Container Apps Env · 2 Container Apps (`planner-api`,
  `planner-frontend`) · Cosmos · Storage · Front Door · (Key Vault optional, im
  Spike entfällt CMK — siehe Commit-Historie #18).

---

## 2. Deploy — zwei Wege

### Weg A — geführtes Skript (empfohlen für ersten/seltenen Run)
```bash
chmod +x _deploy-azure.sh && ./_deploy-azure.sh
```
Das Skript: Sanity-Check → Subscription/Region wählen → RG + User-Assigned MI +
Entra-App anlegen → **Bicep what-if** (Trockenlauf) → `READY?`-Bestätigung →
`az deployment sub create` → Front-Door-Endpoint + **Custom-Domain-Validation-Tokens**
ausgeben (für DNS, „Bytecamp-Records").

### Weg B — CI (push-button, ohne lokales az)
`.github/workflows/deploy.yml` (in PR `claude/lockscreen-deploy-EHpW2`): manuell via
**Actions → Deploy → Run workflow**. Voraussetzung: Repo-Secrets/OIDC
`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (Federated Credential
auf den Entra-App-Workload). Baut Images → ACR → `az deployment sub create`.

---

## 3. Images bauen & pushen (KRITISCH: Frontend-Build-Variable)

```bash
chmod +x _push-images.sh && ./_push-images.sh v0.3.0
```
- Backend `planner-api` + Frontend `planner-frontend` → ACR → Container Apps update → Smoke-Test.
- **⚠ Stolperstein (Commit f10d381):** Der Frontend-Client **bäckt** `NEXT_PUBLIC_API_BASE_URL`
  zur **Build-Zeit** ein. Das Frontend-Image MUSS mit der **echten Prod-API-URL** gebaut
  werden, sonst ruft der Browser `localhost:8000`. Im Dockerfile/Build-Arg setzen:
  `NEXT_PUBLIC_API_BASE_URL=https://zgpm.aegira.ai` (bzw. die interne API-Route).
  Lockscreen-Timeout optional via `NEXT_PUBLIC_LOCK_IDLE_SEC` (Default 900).

---

## 4. Diagnose: warum ist zgpm.aegira.ai aktuell down? (`ERR_SOCKET_NOT_CONNECTED`)

Wahrscheinlich Folge der Frankfurt-Migration. In dieser Reihenfolge prüfen:
```bash
# DNS: zeigt der CNAME noch auf den (alten/Sweden) Front-Door-Endpoint?
nslookup zgpm.aegira.ai
# Front Door: Endpoint, Origin-Group, Route, Custom-Domain-Status
az afd endpoint list   -g aegira-shared-prod --profile-name <fd-profile> -o table
az afd origin list     -g aegira-shared-prod --profile-name <fd-profile> --origin-group-name <og> -o table
az afd route show      -g aegira-shared-prod --profile-name <fd-profile> --endpoint-name <ep> -n <route>
# Container Apps: laufen sie in Frankfurt, min-replicas, Revision aktiv/healthy?
az containerapp list -g aegira-planner-prod -o table
az containerapp revision list -g aegira-planner-prod -n planner-frontend -o table
```
Typische Ursachen: (a) FD-Origin zeigt noch auf gelöschte Sweden-Ressource;
(b) Custom-Domain-Association/Zertifikat nach Migration nicht neu validiert;
(c) Container App scale-to-zero + fehlender/ungesunder Origin; (d) DNS-CNAME
nicht auf den neuen FD-Endpoint umgezogen. Fix: Bicep redeploy (Schritt 2) richtet
FD+Origin+Domain neu ein, dann DNS-CNAME/TXT laut Skript-Output setzen,
`az afd custom-domain wait ... --custom-domain-validated`.

---

## 5. Akzeptanz (Done)

- [ ] `curl -sS -o /dev/null -w "%{http_code}" https://zgpm.aegira.ai/` → `200`.
- [ ] `https://zgpm.aegira.ai/health` (bzw. API-Route) → `{"status":"ok"}`.
- [ ] Neue Features sichtbar: `/projects/<id>/plan` (Gantt/RACI/Heatmap/Token/Auslastung),
      `/projects/<id>/harness` (Graph + Agent-CRUD + Gate 3 + Zip-Download),
      Dashboard-Aktionsmenü, Idle-Lockscreen.
- [ ] `shasum -a 256 -c checksums.txt` eines exportierten Harness-Zips grün.
- [ ] Keine Secrets im Klartext; Tokens via MI/Key Vault/OIDC.

---

## 6. Constitution-Leitplanken (gelten weiter)

Trust-Infrastructure · keine 100%-Claims · Rechtsräume DE/EU27-Rest/UK/CH · AIMS ·
Produktnamen AI Navigator/Guardian/Commander · dieses Repo (Zone 3) schreibt **nie**
nach `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**`.

---

*exmachinAI · AEGIRA AI Trust Platform · Deploy-Handover · 30.05.2026*
