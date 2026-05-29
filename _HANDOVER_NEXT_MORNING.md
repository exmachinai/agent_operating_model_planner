# Handover — AEGIRA Planner Azure Deploy

**Letzter Stand: 29.05.2026, ~14:40 Uhr (Spike-Tier live, 502-Placeholder)**
**Weitermachen: jederzeit — keine Eile, kein Druck**

## TL;DR — Stand jetzt

✓ Spike-Tier-Stack komplett deployed (Front Door, Cosmos Serverless, Storage LRS, KV Standard, CAE, 2× Container Apps, Observability)
✓ Bytecamp DNS: 4 Records propagiert weltweit
✓ Azure Front Door: beide Domains validiert + Managed Certs (Let's Encrypt) provisioniert
✓ `https://zgpm.aegira.ai` antwortet mit HTTP/2 + TLS (502 — Demo-Image ohne /health-Endpoint, das ist OK für Spike)
✓ Budget-Alert 150€/Mo @ 80% gesetzt

## Was als nächstes (drei Optionen, eine wählen)

### Option A — Lock-Screen-Demo lokal anschauen (5 Min, motivierend)
```bash
cd planner && npm install && npm run dev
```
Browser zu http://localhost:3000 → drei Buttons → „Sitzung sperren" zeigt den LockScreen.

### Option B — Phase 3: echte AEGIRA Container-Images bauen (2–4 Std)
- ACR anlegen (Bicep-Erweiterung +30 Zeilen)
- FastAPI-Backend (`/health`, `/ready`, Port 8000)
- Next.js-Frontend prod-build (`/health`, `/ready`, Port 3000)
- `az containerapp update --image …` × 2
- 502 verschwindet, echte Demo-UI live auf zgpm.aegira.ai

### Option C — strategisch Pause, API-Design vorziehen
Statt direkt zu coden: erst ein sauberes API-Design (OpenAPI-Spec, Endpoint-Liste, Auth-Flow). Dann ist Phase 3 nur noch Codegen + Glue.

## Restliche offene Punkte
- Task #30: Fine-Grained PAT für github-pat-mcp-server (User-Aktion, jederzeit)
- 29 Dependabot-Vulnerabilities (Next.js RC + transitive Deps) — sammelt sich, irgendwann mal aufräumen
- Cosmos-Daten-Modell (per docs/02 schon spezifiziert, fehlt nur die Implementierung)

---

## TL;DR — was du als erstes tust

**Genau ein Befehl im Terminal:**

```bash
az deployment sub show -n aegira-planner-prod-202605282118 \
  --query "{state:properties.provisioningState, ts:properties.timestamp}"
```

Das zeigt dir, ob der Deploy von gestern Abend durchgelaufen ist.

Drei mögliche Antworten:

| `state` | Bedeutung | Was du machst |
|---|---|---|
| `Succeeded` | Spike-Tier-Stack steht in Azure | → weiter mit **Schritt B** (Bug-Fix PR #6) |
| `Running` / `Accepted` | Deploy läuft noch | → einmal `az deployment sub wait -n aegira-planner-prod-202605282118 --created --interval 30` stehen lassen, dann **Schritt B** |
| `Failed` / `Canceled` | Resource-Fehler oder abgebrochen | → schick mir die Outputs, dann debuggen wir gemeinsam |

---

## Wo du gestern aufgehört hast

1. PR #5 (Spike-Tier Bicep + Linter-Fixes) wurde gepatcht und über `_push-update.sh` ins GitHub-Repo. Bicep-Build war lokal verifiziert, what-if war sauber (`retentionInDays: 30`, `dailyQuotaGb: 1` — beides Spike-Werte aus dem Patch).
2. `_deploy-azure.sh` lief durch alle Vorbereitungen:
   - Subscription `23302507-c311-4f98-8af0-3061571960d4` gesetzt
   - Entra-App `1ffa4339-a156-45ea-ba3f-01cccc67f46d` wiederverwendet
   - 3 Resource Groups bestätigt: `aegira-shared-prod`, `aegira-planner-prod`, `aegira-observability-prod`
   - User-Assigned MI `umi-aegira-planner-prod` da
3. Du hast bei READY? `yes` getippt → Deploy `aegira-planner-prod-202605282118` wurde abgesetzt.
4. Die Azure-CLI hat dann „Long-running operation wait cancelled" geworfen — das ist **nur** der lokale Wait-Loop, der Azure-Deploy läuft serverseitig weiter.

Deshalb beginnt morgen alles mit dem `az deployment sub show`-Befehl oben.

---

## Bekannte Issues vor dem Weitermachen

### Issue A — Custom-Domain-Mismatch in frontDoor.bicep (muss in PR #6 gefixt werden)

`planner/infra/modules/frontDoor.bicep` legt die Custom Domains so an:
```
cd-app → app.aegira.ai
cd-api → api.aegira.ai
```

Wir wollen aber:
```
cd-app → zgpm.aegira.ai
cd-api → api.zgpm.aegira.ai
```

Das Deploy-Script druckt zwar die richtigen Bytecamp-Records mit `zgpm` und `api.zgpm`, aber die Validation-Tokens kommen von den falschen Domain-Resources. Mit den aktuellen Tokens würde die DNS-Validierung bei Bytecamp **fehlschlagen**.

→ Vor dem Bytecamp-Step machen wir PR #6 mit dem Domain-Fix. Ich schreibe den Patch morgen, wenn du den Deploy-Status oben gemeldet hast.

### Issue B — Budget-Alert offen

Wir wollten gestern noch ein 150€-Monatsbudget mit Email-Alert bei 80% setzen. Befehl steht weiter unten in der „Referenz"-Sektion. Sollte vor produktiver Nutzung einmal laufen.

---

## Tomorrow's Sequence

```
Morgens                                                          Geschätzte Zeit
─────────────────────────────────────────────────────────────    ───────────────
1. Deploy-Status prüfen (Befehl oben)                            1 min
2. Falls Running: az deployment sub wait                         max 15 min
3. Budget-Alert setzen (Befehl in Referenz unten)                1 min
4. PR #6 mit frontDoor-Domain-Fix bauen (ich schreibe Patch)     5 min
5. _push-update.sh "fix(infra): zgpm subdomain custom domains"   3 min
6. _deploy-azure.sh nochmal — Enter, Enter, yes                  15 min
7. Bytecamp: 4 DNS Records einsetzen + speichern                 5 min
8. dig-Validation + az afd custom-domain wait                    5–15 min
9. Cert-Generation abwarten                                      5–15 min
                                                          ────────────────
                                                          ~50 min bis live
```

Danach ist `https://zgpm.aegira.ai` öffentlich erreichbar und zeigt die Container-App-Demo.

---

## Referenz — Daten + Commands

### IDs (zum Kopieren)
```
Subscription ID:  23302507-c311-4f98-8af0-3061571960d4
Tenant ID:        611423c4-741d-40c9-8808-2271e4086ad2
Entra App ID:     1ffa4339-a156-45ea-ba3f-01cccc67f46d
Deploy Name:      aegira-planner-prod-202605282118
FD Profile:       fd-aegira-prod
RG Shared:        aegira-shared-prod
RG Planner:       aegira-planner-prod
RG Observability: aegira-observability-prod
MI:               umi-aegira-planner-prod
```

### Deploy-Status prüfen
```bash
az deployment sub show -n aegira-planner-prod-202605282118 \
  --query "{state:properties.provisioningState, ts:properties.timestamp}"
```

### Deploy abwarten (blockt bis fertig)
```bash
az deployment sub wait -n aegira-planner-prod-202605282118 --created --interval 30
echo "Exit: $?"
```

### Deploy-Outputs lesen (nach erfolgreichem Run)
```bash
az deployment sub show -n aegira-planner-prod-202605282118 \
  --query properties.outputs
```

### Budget-Alert setzen
```bash
SUB_ID="23302507-c311-4f98-8af0-3061571960d4"
az consumption budget create \
  --budget-name "aegira-planner-monthly" \
  --amount 150 \
  --category Cost \
  --time-grain Monthly \
  --start-date "$(date +%Y-%m-01)" \
  --end-date "2027-12-31" \
  --notifications '[{
    "enabled": true,
    "operator": "GreaterThan",
    "threshold": 80,
    "contactEmails": ["exmachinai.ai@gmail.com"],
    "notificationLanguage": "en-us"
  }]' \
  --subscription "$SUB_ID" 2>&1 | tail -5
```

### Azure-Portal-Links (nach erfolgreichem Deploy direkt anschaubar)
- Resource Group Planner:
  `https://portal.azure.com/#@/resource/subscriptions/23302507-c311-4f98-8af0-3061571960d4/resourceGroups/aegira-planner-prod`
- Resource Group Shared:
  `https://portal.azure.com/#@/resource/subscriptions/23302507-c311-4f98-8af0-3061571960d4/resourceGroups/aegira-shared-prod`
- Cost Analysis:
  `https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/costanalysis`

### Wenn du re-deployen willst (für PR #6 morgen)
```bash
cd "/Users/mveil/Library/CloudStorage/Dropbox-exmachinAI/Team-Ordner exmachinAI/02_exmachinAI_GmbH/02_Projekte/01_AEGIRA _AI_TRUST_PLATFORM/50_APPS/20_AGENT_OPERATING_MODEL_PLANNER"
bash _push-update.sh "fix(infra): zgpm.aegira.ai custom domains in Front Door"
bash _deploy-azure.sh
```

Bei den Image-Prompts → **ENTER** drücken (nicht die Sub-ID), bei READY? → `yes`.

---

## Was im Chat morgen früh mein erstes Update sein wird

Schick mir einfach die Ausgabe von:
```bash
az deployment sub show -n aegira-planner-prod-202605282118 \
  --query "{state:properties.provisioningState, ts:properties.timestamp}"
```

Dann routet sich der Rest automatisch — entweder direkt zu Schritt B, oder wir debuggen einen Fehler.

Gute Nacht.
