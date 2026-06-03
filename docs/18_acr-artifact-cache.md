# 18 — Base-Images Docker-Hub-frei (Microsoft Azure Linux / MCR)

## FINALE LÖSUNG (2026-06-03): Base-Images auf MCR umgestellt

Statt Docker-Hub-Images zu cachen, beziehen die Builds ihre Base-Images jetzt
**vollständig von Microsoft** (`mcr.microsoft.com`, Azure Linux) — **keine
Docker-Hub-Abhängigkeit, kein Account, kein Token, kein Rate-Limit**.

| Dienst | vorher (Docker Hub) | jetzt (MCR / Azure Linux) |
|---|---|---|
| API (`planner/api/Dockerfile`) | `python:3.12-slim` (Debian) | `mcr.microsoft.com/azurelinux/base/python:3.12` |
| Frontend (`planner/Dockerfile`, 3 Stages) | `node:22-alpine` (Alpine) | `mcr.microsoft.com/azurelinux/base/nodejs:24` |

**Anpassungen beim OS-Wechsel** (Debian/Alpine → Azure Linux, glibc, `tdnf`):
- Paketinstallation `apt-get`/`apk` → `tdnf` (`ca-certificates`, `shadow-utils`).
- `curl` ist in beiden Base-Images vorhanden; Frontend-Healthcheck `wget` → `curl`.
- Non-root-User: busybox `addgroup`/`adduser` → `groupadd`/`useradd` (shadow-utils).
- `libc6-compat` entfällt (glibc statt musl).
- **Node-Version: 22 → 24.** Azure Linux führt nur Node 20 + 24 (kein 22); Next.js 15
  läuft auf Node 24. Bewusster, getesteter Bump.

Beide Images server-seitig via `az acr build` getestet — grün, Pull ausschließlich
von `mcr.microsoft.com`. Damit ist die unten beschriebene ACR-Artifact-Cache-Lösung
(Credential-Set/Key Vault) **abgelöst** und wird dekommissioniert (Cache-Rules,
Credential-Set `dockerhub`, KV `kv-aegira-dhub-prod`).

---

## (Historie / abgelöst) ACR Artifact Cache mit Credential-Set

> Der folgende Abschnitt dokumentiert den **Interim-Ansatz**, der python/node aus
> Docker Hub über die ACR cachte. Er ist durch die MCR-Migration oben abgelöst.

## Problem

Der Prod-Deploy (`.github/workflows/deploy.yml`, `az acr build`) baut beide Images
server-seitig in der ACR `aegiraacrprodtgygvmrc`. Die Base-Images werden dabei
**anonym** von Docker Hub gezogen:

- `planner/api/Dockerfile` → `python:3.12-slim`
- `planner/Dockerfile` → `node:22-alpine` (3 Stages: deps, builder, runner)

Die ACR-Build-Agents teilen sich Docker-Hub-IP-Pools und laufen sporadisch ins
**anonyme Pull-Rate-Limit**:

```
Step 1/11 : FROM python:3.12-slim
toomanyrequests: You have reached your unauthenticated pull rate limit.
```

Am **2026-06-03** fiel deshalb Deploy-Run **v0.9.5-25** aus; erst der Retry
(v0.9.5-26) lief durch. `az acr build` kennt kein Retry/Backoff für diesen Fall —
der Lauf bricht hart ab.

## Lösung: ACR Artifact Cache mit authentifiziertem Credential-Set

Die Base-Images werden über die **eigene ACR** geproxt und gecacht. Wirkung:

1. **Steady-State:** Nach der ersten Cache-Population zieht jeder Build aus dem
   ACR-Cache — **null** Upstream-Pulls gegen Docker Hub.
2. **Cache-Miss** (erster Pull bzw. wenn sich das Upstream-Digest eines Tags ändert):
   greift über das Credential-Set das **authentifizierte** Docker-Hub-Limit
   (**200 Pulls / 6 h**) statt der **100 anonym**.

Artifact Cache ist bereits auf **Basic SKU** verfügbar → **kein** SKU-Upgrade,
keine Mehrkosten an der ACR. Einzige neue Ressource mit Sockelkosten ist ein
Key Vault Standard (~1 €/Monat).

### Komponenten

Alle in der shared RG `aegira-shared-prod` (Sweden), co-lokalisiert mit der ACR —
definiert in [`planner/infra/modules/acrCache.bicep`](../planner/infra/modules/acrCache.bicep):

| # | Ressource | Zweck |
|---|-----------|-------|
| 1 | **Key Vault** `kv-aegira-dhub-prod` | Hält `dockerhub-username` + `dockerhub-token` (read-only PAT) |
| 2 | **Credential-Set** `dockerhub` | System-Assigned-Identity; verweist auf die KV-Secret-URIs; `loginServer=docker.io` |
| 3 | **Role-Assignment** | Credential-Set-Identity → `Key Vault Secrets User` |
| 4 | **Cache-Rule** `docker-hub-node` | `docker.io/library/node` → `docker-hub/library/node` (authentifiziert) |
| 5 | **Cache-Rule** `docker-hub-python` | `docker.io/library/python` → `docker-hub/library/python` (authentifiziert) |

> **Hinweis (Historie):** Beim Bootstrap lag `docker-hub/library/python` kurzzeitig als
> `az acr import` in der Registry; ACR lässt **keine Cache-Rule über ein existierendes Repo**
> zu (`TargetRepositoryAlreadyPresentInRegistry`). Das Import-Repo wurde gelöscht und python
> auf eine **Cache-Rule konvergiert** (Stand jetzt: `enablePythonCacheRule=true`, beide Images
> als authentifizierte Cache-Rule mit Auto-Refresh).
>
> Neu erstellte Cache-Rules brauchen ~1–3 Min Data-Plane-Propagation, bevor der erste Pull
> greift (sonst `not found`). Authentifiziert vorwärmen:
> ```bash
> az acr login -n aegiraacrprodtgygvmrc
> docker pull aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/python:3.12-slim
> docker pull aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine
> ```

### Dockerfile-FROM-Zeilen

```dockerfile
# planner/api/Dockerfile
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/python:3.12-slim

# planner/Dockerfile (alle drei Stages)
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS deps
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS builder
FROM aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/node:22-alpine AS runner
```

Der FROM-Wechsel ist für `az acr build` transparent — die ACR-Task-Identity zieht den
Cache aus der eigenen Registry automatisch. `deploy.yml` bleibt **unverändert**.

> **Lokale `docker build`:** brauchen dann `az acr login -n aegiraacrprodtgygvmrc`.
> Lokal wird laut Projekt-Setup ohnehin nicht über diese Dockerfiles gebaut
> (Frontend via Node, Backend via venv), daher unkritisch.

## Bootstrap (einmalig)

Infra-Sub-Deploy — **bewusst getrennt** vom Routine-Image-Push (`deploy.yml` warnt:
Front-Door/DNS-Risiko bei Infra-Änderungen im Routine-Lauf). Orchestriert von
[`_deploy-acr-cache.sh`](../_deploy-acr-cache.sh) in zwei Phasen, weil das
Credential-Set die KV-Secrets referenziert (Chicken-Egg):

1. **PAT erzeugen:** Docker Hub → *Account Settings → Personal access tokens →
   Generate* → Permissions **Read-only**. Token kopieren.
2. **Skript ausführen:**
   ```bash
   chmod +x _deploy-acr-cache.sh
   ./_deploy-acr-cache.sh
   ```
   - **Phase A:** Key Vault anlegen (`enableCredentialSet=false`).
   - **Secrets:** Username + PAT werden interaktiv abgefragt und per
     `az keyvault secret set` gesetzt — **nie** im Repo/in Bicep-Params.
   - **Phase B:** Credential-Set + Role-Assignment + Cache-Rules
     (`enableCredentialSet=true`).
3. **Verifikation** (das Skript zeigt sie an):
   ```bash
   az acr cache list -r aegiraacrprodtgygvmrc -o table
   az acr credential-set show -r aegiraacrprodtgygvmrc -n dockerhub
   az acr login -n aegiraacrprodtgygvmrc
   docker pull aegiraacrprodtgygvmrc.azurecr.io/docker-hub/library/python:3.12-slim
   ```
4. **Regulären Deploy (prod) erneut auslösen** → Build-Log zeigt `FROM aegiraacrprod…`,
   kein `toomanyrequests`.

### PAT-Rotation

PAT in Docker Hub neu erzeugen, dann nur das Secret aktualisieren — kein Redeploy nötig
(Credential-Set nutzt **unversionierte** Secret-URIs):

```bash
az keyvault secret set --vault-name kv-aegira-dhub-prod --name dockerhub-token --value <NEUER_PAT>
```

## Security & azure-best-practices

- **Keine Secrets im Repo/in Params** — durch Bicep fließen nur die **Secret-URIs**;
  der PAT wird out-of-band per CLI gesetzt.
- **Managed Identity** (System-Assigned des Credential-Sets) statt Klartext-Creds.
- **RBAC least-privilege**: `Key Vault Secrets User` (nicht Contributor/Owner).
- **Read-only PAT** — selbst bei Leak kein Push/Schreibzugriff auf Docker Hub.

### ADR-Abweichung von der Security-Baseline: kein Private Endpoint

Die Baseline (`references/security-baseline.md`) verlangt Private Endpoints für
Key Vault. Dieser Vault läuft bewusst mit `publicNetworkAccess=Enabled` +
`networkAcls.bypass=AzureServices`:

- **Begründung:** Der Vault hält ausschließlich einen **read-only Docker-Hub-PAT**,
  **keine** Kundendaten. Die ACR-Credential-Set-Identität erreicht den Vault als
  *Trusted Service* über den Bypass; ein PE würde den Bootstrap-Secret-Set
  zusätzlich an eine Operator-IP-Whitelist binden, ohne den Schutzgewinn zu
  rechtfertigen (Risiko/Aufwand vs. Sensitivität).
- **Nachrüstbar:** Bei höherem Schutzbedarf später PE + `publicNetworkAccess=Disabled`
  ergänzen (analog zum CMK-Key-Vault-Muster aus `modules/keyvault.bicep`).

## Referenzen

- [Optimize image pulls with artifact cache (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/container-registry/artifact-cache-overview)
- [registries/cacheRules — Bicep-Referenz](https://learn.microsoft.com/en-us/azure/templates/microsoft.containerregistry/registries/cacherules)
- [Access network-restricted registry by trusted Azure service](https://learn.microsoft.com/en-us/azure/container-registry/allow-access-trusted-services)
