# 08 — DNS-Setup bei Bytecamp · zgpm.aegira.ai

> **Provider:** Bytecamp (DNS-Hosting + Registrar für `aegira.ai`).
> **Scope:** Neue Subdomain `zgpm.aegira.ai` und `api.zgpm.aegira.ai` für die AEGIRA Planner App. Koexistiert mit bestehender Website auf `aegira.ai` und bestehender AIMS-App auf `aims.aegira.ai`.
> **Status: BINDEND** für den Go-Live der Planner App.

---

## 1. Bestand auf aegira.ai (was bereits steht)

Damit nichts beschädigt wird:

| Subdomain | Was | Provider | DNS-Record (heute) |
|---|---|---|---|
| `aegira.ai` (Apex) | Marketing-Website | — | A oder ALIAS auf bestehende Hosting-IP |
| `www.aegira.ai` | Website (canonical) | — | CNAME oder A |
| `aims.aegira.ai` | AIMS Azure-App | Azure (eigene Front Door) | CNAME auf `<aims-fd>.azurefd.net` |

**Niemals diese Records anfassen.** Der Planner-Setup nutzt ausschließlich neue Records unter `zgpm.aegira.ai`.

---

## 2. Neue Records für zgpm.aegira.ai

Insgesamt **4 Records** im Bytecamp-Control-Panel anlegen. Werte aus dem Azure-Deployment-Output:

| # | Record-Typ | Host (relativ zu aegira.ai) | Ziel | TTL | Zweck |
|---|---|---|---|---|---|
| **1** | `CNAME` | `zgpm` | `<fd-endpoint>.azurefd.net.` | 3600 | Frontend (App) |
| **2** | `CNAME` | `api.zgpm` | `<fd-endpoint>.azurefd.net.` | 3600 | Backend (API) |
| **3** | `TXT` | `_dnsauth.zgpm` | `<validation-token-frontend>` | 3600 | Domain-Verification (Azure Front Door) |
| **4** | `TXT` | `_dnsauth.api.zgpm` | `<validation-token-api>` | 3600 | Domain-Verification (Azure Front Door) |

**Validation-Tokens** werden von Front Door beim Hinzufügen der Custom-Domain ausgegeben — sie sehen aus wie `_d2b4c1f8eb...`. Beide Tokens unterscheiden sich pro Custom-Domain.

### 2.1 Wo bekomme ich die Werte her?

Nach dem Bicep-Deploy (`infra/main.bicep` mit `prod.bicepparam`):

```bash
DEPLOYMENT_NAME=aegira-planner-prod-<YYYYMMDDHHMM>
az deployment sub show -n "$DEPLOYMENT_NAME" --query properties.outputs

# Liefert u.a.:
#   frontDoorDnsTarget = "fd-aegira-prod-<hash>.b01.azurefd.net"
```

Pro Custom-Domain (zgpm + api.zgpm) den Validation-Token holen:

```bash
RG=aegira-shared-prod
az afd custom-domain show \
  -g $RG \
  --profile-name fd-aegira-prod \
  --custom-domain-name cd-app \
  --query validationProperties.validationToken -o tsv

az afd custom-domain show \
  -g $RG \
  --profile-name fd-aegira-prod \
  --custom-domain-name cd-api \
  --query validationProperties.validationToken -o tsv
```

---

## 3. Klick-Anleitung im Bytecamp-Control-Panel

### 3.1 Login

1. <https://www.bytecamp.net/customer/> öffnen.
2. Login mit den exmachinAI-Credentials (Owner: Michael Veil).
3. Im Hauptmenü: **Domains** → Auswahl `aegira.ai` → **DNS verwalten** (oder „Zonen-Editor").

### 3.2 Record 1 — CNAME zgpm

| Feld | Wert |
|---|---|
| Type | `CNAME` |
| Name / Host | `zgpm` |
| Value / Ziel | `fd-aegira-prod-<hash>.b01.azurefd.net.` *(trailing dot beachten!)* |
| TTL | `3600` (1 Stunde) |
| Priorität | leer |

→ Speichern.

### 3.3 Record 2 — CNAME api.zgpm

| Feld | Wert |
|---|---|
| Type | `CNAME` |
| Name / Host | `api.zgpm` |
| Value / Ziel | `fd-aegira-prod-<hash>.b01.azurefd.net.` |
| TTL | `3600` |

→ Speichern.

### 3.4 Record 3 — TXT für Frontend-Validation

| Feld | Wert |
|---|---|
| Type | `TXT` |
| Name / Host | `_dnsauth.zgpm` |
| Value | `<validation-token vom Front-Door>` *(in Anführungszeichen falls Bytecamp das verlangt)* |
| TTL | `3600` |

### 3.5 Record 4 — TXT für API-Validation

| Feld | Wert |
|---|---|
| Type | `TXT` |
| Name / Host | `_dnsauth.api.zgpm` |
| Value | `<validation-token-2 vom Front-Door>` |
| TTL | `3600` |

---

## 4. Verifikation aus dem Terminal

Pro Record nach ca. 5–60 Min (Bytecamp publiziert üblicherweise innerhalb 15 Min, TTL-Caches auf öffentlichen Resolvern länger):

```bash
# CNAME-Resolution
dig +short CNAME zgpm.aegira.ai
# Erwartet: fd-aegira-prod-<hash>.b01.azurefd.net.

dig +short CNAME api.zgpm.aegira.ai
# Erwartet: fd-aegira-prod-<hash>.b01.azurefd.net.

# TXT-Validation
dig +short TXT _dnsauth.zgpm.aegira.ai
dig +short TXT _dnsauth.api.zgpm.aegira.ai
# Erwartet: jeweils der Validation-Token in Anführungszeichen.
```

Wenn die TXT-Records resolved sind, in Azure die Validation triggern:

```bash
RG=aegira-shared-prod
for cd in cd-app cd-api; do
  az afd custom-domain wait \
    -g $RG \
    --profile-name fd-aegira-prod \
    --custom-domain-name $cd \
    --custom \
    --condition "properties.domainValidationState=='Approved'" \
    --timeout 600
done
```

---

## 5. SSL/TLS

Azure Front Door **managed Certificate** wird automatisch nach erfolgreicher Domain-Validation ausgestellt (Let's Encrypt oder DigiCert je nach Region). Kein Cert-Upload nötig.

Erste Bereitstellung dauert üblicherweise **5–15 Min** nach der Domain-Validation.

Prüfen:

```bash
openssl s_client -connect zgpm.aegira.ai:443 -servername zgpm.aegira.ai </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
```

---

## 6. CAA-Records (optional, aber empfohlen)

Damit nur erlaubte CAs für `aegira.ai` Zertifikate ausstellen können — verhindert ungewollte Cert-Issuance:

| Type | Host | Wert | Zweck |
|---|---|---|---|
| `CAA` | `@` (Apex) | `0 issue "digicert.com"` | Erlaubt DigiCert |
| `CAA` | `@` (Apex) | `0 issue "letsencrypt.org"` | Erlaubt Let's Encrypt |
| `CAA` | `@` (Apex) | `0 issuewild "digicert.com"` | Erlaubt Wildcard-Zerts |
| `CAA` | `@` (Apex) | `0 iodef "mailto:security@aegira.ai"` | Incident-Notification |

**Wichtig:** CAA-Records sind auf Apex-Ebene und gelten für alle Subdomains. Falls AIMS-App andere CAs nutzt: vorher absprechen, sonst bricht aims.aegira.ai bei Cert-Renewal.

Front Door nutzt aktuell DigiCert (managed cert via Microsoft) — also `digicert.com` ist Pflicht.

---

## 7. SPF / DMARC (nice-to-have)

Bytecamp managt aktuell die Mail-Records für `aegira.ai`. Wenn die Planner App keine Mails sendet (HITL-Notifications gehen über Slack/Teams-Webhooks, nicht SMTP): keine Änderung. Wenn doch:

| Type | Host | Wert |
|---|---|---|
| `TXT` | `@` (Apex) | `v=spf1 include:_spf.google.com -all` *(Google Workspace)* |
| `TXT` | `_dmarc` | `v=DMARC1; p=reject; rua=mailto:dmarc@aegira.ai` |

Diese Records sind NICHT Teil des Planner-Deploys — sie wurden beim Mail-Provider-Onboarding eingerichtet und bleiben unverändert.

---

## 8. Koexistenz mit aims.aegira.ai

Beide Apps (AIMS + ZGPM) leben unter eigenen Subdomains und kollidieren **nicht** auf DNS-Ebene. Wichtige Punkte:

- **Front Door:** beide haben separate Profile (`fd-aims-prod`, `fd-aegira-prod`) → eigene Endpoint-Hostnames → eigene CNAMEs.
- **Validation-Tokens:** sind pro Custom-Domain unterschiedlich. Kein Sharing.
- **TLS-Zerts:** beide Apps bekommen eigene managed Certs.
- **API-Routing:** AIMS hat `api.aims.aegira.ai`, ZGPM hat `api.zgpm.aegira.ai`. Kein gemeinsamer `api.aegira.ai`-Endpoint.

---

## 9. Rollback / Abriss

Wenn die App jemals heruntergefahren wird:

1. **Im Azure** zuerst Custom-Domain entfernen (`az afd custom-domain delete`).
2. **Danach** im Bytecamp die vier Records löschen.
3. **CAA-Records** bleiben — sie sind Apex-weit und betreffen andere Subdomains.

---

## 10. Troubleshooting

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `dig CNAME zgpm.aegira.ai` liefert nichts | Bytecamp noch nicht publiziert | 15 Min warten und nochmal |
| `dig CNAME zgpm.aegira.ai` zeigt alten Wert | DNS-Cache | `dig @8.8.8.8 zgpm.aegira.ai` für Google-DNS direkt |
| Azure Validation bleibt "Pending" | TXT-Record falsch geschrieben | Token-Wert ohne Anführungszeichen kopieren, nochmal speichern |
| `openssl s_client` → "no cert" | Cert-Issuance läuft noch | bis zu 60 Min warten nach Validation-Approval |
| Browser zeigt SSL-Warnung | Cert noch nicht aktiv | siehe oben |
| 404 vom Front Door | Route nicht konfiguriert | im Bicep-Output prüfen: `frontDoorRoutes` muss Custom-Domain referenzieren |
| `aims.aegira.ai` bricht plötzlich | CAA-Record schließt AIMS-CA aus | CAA-Liste prüfen, fehlende CA ergänzen |

---

## 11. Checkliste vor Cutover

- [ ] Bicep-Deploy erfolgreich (Phase 2)
- [ ] Front-Door-Custom-Domain `cd-app` angelegt
- [ ] Front-Door-Custom-Domain `cd-api` angelegt
- [ ] Beide Validation-Tokens kopiert
- [ ] 4 Records bei Bytecamp angelegt
- [ ] CNAME-Resolution per `dig` validiert
- [ ] TXT-Resolution per `dig` validiert
- [ ] Azure-Custom-Domain-State = `Approved`
- [ ] TLS-Cert ausgestellt und gültig
- [ ] CAA-Records ergänzt
- [ ] HTTPS-Test: `curl -I https://zgpm.aegira.ai/health` liefert 200
- [ ] HTTPS-Test: `curl -I https://api.zgpm.aegira.ai/health` liefert 200
- [ ] AIMS-App noch erreichbar (Regression-Test)

---

## 12. Quellen

- Bytecamp Customer Portal — DNS-Editor-Doku
- Azure Front Door Custom-Domain Validation (Microsoft Learn, Mai 2026)
- RFC 1035 (DNS), RFC 6844 (CAA), RFC 7208 (SPF), RFC 7489 (DMARC)
- `docs/06_azure-configuration-guide.md` §2 (Domain-Strategie)
- `planner/infra/modules/frontDoor.bicep` (Front-Door-Provisioning)

---

## 13. Versions-Notiz

Schema-Version dieses Dokuments: **1.0** (28.05.2026).
Änderungen am DNS-Setup erfordern HITL-PM-Approval, damit AIMS-Koexistenz nicht versehentlich verletzt wird.
