# Handover — AEGIRA Planner

**Stand: 29.05.2026, ~17:20 Uhr — Phase-2-Spike komplett live**
**Weitermachen: jederzeit, keine Eile, kein Druck**

---

## TL;DR — was heute passiert ist

Die komplette Phase-2-Spike-Plattform ist **live unter `https://zgpm.aegira.ai`** und antwortet mit echtem HTTP/2 200. Backend, Frontend, Front Door, Cosmos, Storage, Key Vault, ACR — alles deployed, alle Komponenten gesund, HTTPS mit Let's-Encrypt-Cert, WAF mit Geo-Filter EU+UK+CH+US, Budget-Alert bei 120 €/Mo gesetzt.

Es gibt einen separaten **User Guide** (`AEGIRA_Planner_User_Guide.pdf`, 11 Seiten) im Projekt-Ordner — der erklärt für eine low-coding-Person was die Plattform tut und wie man sie bedient.

## Was du jetzt sehen kannst

| URL | Was du siehst |
|---|---|
| https://zgpm.aegira.ai | Demo-Page mit AEGIRA-Branding, drei Buttons (AgentTrace · Approval · Sitzung sperren), Lock-Screen klickbar |
| https://api.zgpm.aegira.ai/health | JSON `{status: ok, service: aegira-planner-api, env: prod, version: 0.1.0-spike, now: ...}` |
| https://api.zgpm.aegira.ai/ready | JSON `{status: ready, checks: {cosmos: true, foundry: true, storage: true}}` |

## Heute durchgepusht (5 PRs)

| PR | Titel | Was er gebracht hat |
|---|---|---|
| #5 | Spike-Tier Bicep + Linter-Fixes | ~80 €/Mo statt 650 €/Mo (Cosmos Serverless, FD Standard, scale-to-zero CAE) |
| #6 | Cosmos API + Storage-Name + zgpm-Custom-Domains | Erste Deploy-Failures gefixt |
| #7 | WAF Geo-Match in 3 Chunks split | AFD-Standard-Limit umgangen |
| #8 | ACR + Frontend Dockerfile + Health-Routes + push-images.sh | Container-Pipeline aufgebaut |
| #9 | CAE External + Container Apps External + ACR-Registry-Bind | Wichtigster Architektur-Fix — Internal CAE war Sackgasse mit FD Standard |

Plus **PR #10** (Single-Revision-Mode + relaxed Probes + Top-Level-Health-Routes) — die App-Code-Teile (Next.js-Routes, Dockerfile, FastAPI-Health-Fix) sind gemergt, die Bicep-Patches mussten am Ende imperativ via az CLI gesetzt werden, weil das `ls -td`-Picking immer wieder den falschen Working-Folder genommen hat.

## Der Killer-Bug zum Ende

Backend-FastAPI-Code hatte in `planner/api/app/routers/health.py` den Return-Type `dict[str, str | bool]` annotiert, aber das tatsächliche Return-Objekt hatte `checks` als nested dict. Pydantic-Strict-Response-Validation lehnte das ab → Container-Crash → Restart-Loop → ActivationFailed. Fix: `dict[str, Any]`. **Bereits in der Dropbox-Quelle gefixt und ins ACR als planner-api:v0.1.1 gepusht.**

## Offene Tasks (Stand 17:20)

| # | Status | Was | Priorität |
|---|---|---|---|
| 30 | pending | Fine-Grained PAT für github-pat-mcp-server erstellen | niedrig — User-Aktion |
| 43 | pending | Next.js 15.0.3 → 15.0.4 (CVE-2025-66478) | mittel — vor produktiver Nutzung |
| neu | offen | PR #10 Bicep-Patches nachziehen (Single-Mode, Probe-Timings, min-replicas im containerApp.bicep) | niedrig — manuelle az-CLI-Settings überleben Re-Deploy aber nicht |
| neu | offen | `_deploy-azure.sh` mit `git pull origin main` auf WORK_DIR erweitern (vermeidet das `ls -td`-Picking-Problem) | mittel — verhindert wiederkehrende Folge-Bugs |

## Empfohlene Reihenfolge morgen / nächste Session

### Variante A — Stack stabilisieren (1 Stunde)

1. PR #10 Bicep-Patches im Code nachziehen (Single-Mode + min-replicas=1 + Probe-Timings in `containerApp.bicep`)
2. `_deploy-azure.sh` mit Pre-Deploy `git pull` erweitern
3. Sicherheits-PR für Next.js CVE
4. Einmal komplett deployen, prüfen dass nichts kaputt geht

### Variante B — Substanz pushen (2-3 Stunden)

Cosmos-Connect ins Backend bauen:
1. `azure-identity` + `azure-cosmos` SDK ins Backend (sind schon in requirements.txt)
2. `db/cosmos.py` Module mit ManagedIdentityCredential + lazy-loaded CosmosClient
3. POST `/v1/projects` Endpoint, der echt in Cosmos `projects`-Container schreibt
4. Image neu pushen, smoke-test mit `curl -X POST https://api.zgpm.aegira.ai/v1/projects -d '{"name":"Test"}'`
5. End-to-End-Beweis: Browser → FD → WAF → Backend → MI → Cosmos

### Variante C — API-Design schärfen (1-2 Stunden, kein Code)

Bevor du viel Backend-Code schreibst: sauberes OpenAPI-Spec entwerfen. Alle Endpoints, alle Auth-Flows, alle Pydantic-Schemas. Dann ist die Implementation reine Code-Gen.

**Mein Tipp:** C → A → B. Erst Plan, dann Stabilität, dann Substanz.

## Wichtige Werte / IDs

```
Subscription ID:    23302507-c311-4f98-8af0-3061571960d4
Tenant ID:          611423c4-741d-40c9-8808-2271e4086ad2
Entra App ID:       1ffa4339-a156-45ea-ba3f-01cccc67f46d
ACR Login Server:   aegiraacrprodtgygvmrc.azurecr.io
Container Images:   planner-api:v0.1.1 · planner-frontend:v0.1.1
Resource Groups:    aegira-planner-prod · aegira-shared-prod · aegira-observability-prod
Container Apps:     ca-aegira-planner-api · ca-aegira-planner-frontend
FD Profile:         fd-aegira-prod
Cosmos Endpoint:    https://cosmos-aegira-planner-prod.documents.azure.com:443/
```

## Schnell-Check-Befehle für morgen früh

**Plattform-Status:**
```bash
curl -s https://zgpm.aegira.ai/health | head -3
curl -s https://api.zgpm.aegira.ai/health | head -3
```

**Container-Status:**
```bash
for app in ca-aegira-planner-api ca-aegira-planner-frontend; do
  echo "=== $app ==="
  az containerapp revision list -g aegira-planner-prod -n $app \
    --query "[?properties.active==\`true\`].{name:name, state:properties.runningState, health:properties.healthState, replicas:properties.replicas}" \
    -o table
done
```

**Kosten heute:**
```bash
# Im Portal: Cost Management → Cost Analysis
# Oder: portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/costanalysis
```

## Wo finde ich was?

- **User Guide PDF** für Mitarbeiter / Doku: `AEGIRA_Planner_User_Guide.pdf` (im Projekt-Ordner)
- **Skripte** zum Deployen: `_push-update.sh`, `_deploy-azure.sh`, `_push-images.sh` (im Projekt-Ordner)
- **Bicep-Code**: `planner/infra/`
- **Backend-Code**: `planner/api/`
- **Frontend-Code**: `planner/app/`, `planner/components/`
- **Doku zur Architektur**: `docs/` (00–08, mit ZGPM-Methodik, Architektur-Spec, Azure-Config, UX-Best-Practices)

## Was gilt weiterhin (Constitution-Eckpfeiler)

- AEGIRA ist Trust-Infrastructure, nicht Compliance-Software
- Buyer Promise: „Evidence-based AI Trust — nachweisbar, audit-ready". Keine 100%-Claims.
- Rechtsräume: DE · EU27-Rest · UK · CH (niemals „DACH")
- Forcing Event: EU AI Act Enforcement am 02.12.2027
- Maturity = AIMS (ISO 42001 × CMMI v3). MITRE und GMS deprecated.
- Produkte: AI Navigator / AI Guardian / AI Commander — keine anderen Namen.
- Constitution-Safety-Guard: Writes auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` standardmäßig blockiert.

---

**Gute Pause. Du hast heute eine ganze Plattform durchgebracht.**
