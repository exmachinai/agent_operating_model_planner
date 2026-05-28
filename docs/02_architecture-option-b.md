# 02 — Architektur-Spec · Option B · Planner App (Azure-native)

> **Status:** ARCHITECTURE DECISION RECORD (ADR) — Status `accepted, pending HITL-PM approval`.
> **Scope:** Diese Spec beschreibt die **Planner App**. Der Harness läuft *separat* in Claude Code (siehe `docs/03_harness-zip-spec.md`). Die Spec hier deckt **nicht** die Harness-Runtime — der Planner kompiliert den Harness, betreibt ihn nicht.

---

## 1. Zweck und Abgrenzung

Die Planner App nimmt einen Projektauftrag entgegen, lässt fünf spezialisierte Agenten plus einen Human-in-the-Loop-Projektleiter (HITL-PM) gemeinsam einen **ZGPM-konformen Plan** erzeugen, und kompiliert daraus ein **portables Agent-Harness-Zip**. Das Zip läuft anschließend in Claude Code beim Endkunden — die Planner App ist dann nicht mehr im Weg.

**Was der Planner ist:**
- Multi-Agent-Webapp für die *Planungs-Phase*.
- Kompiler von ZGPM-YAML zu Harness-Zip.
- Optional: Distributions-Punkt für fertige Harness-Zips (Releases auf GitHub).

**Was der Planner NICHT ist:**
- Keine Runtime für die Plan-Ausführung — das ist Claude Code beim Kunden.
- Kein generischer Agent-Builder.
- Keine Compliance-Software (AEGIRA-Constitution: Trust-Infrastructure, nicht Compliance).

---

## 2. Architektur-Bild

```
┌────────────────────────────────────────────────────────────────────────┐
│                            Browser / SPA                               │
│                          (Next.js · React)                             │
└────────────┬───────────────────────────────────────┬───────────────────┘
             │                                       │
             ▼                                       ▼
┌────────────────────────┐         ┌──────────────────────────────────┐
│  Azure Front Door      │         │  Entra ID (B2B/B2C)              │
│  (CDN + WAF)           │         │  Auth-Issuer                     │
└────────────┬───────────┘         └──────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Azure Container Apps (Backend API)                    │
│                       FastAPI · Python 3.12                            │
└────┬─────────────────────────────────────────────────┬─────────────────┘
     │                                                 │
     │ ┌─────────────────────────────────────────────┐ │
     │ │ Azure AI Foundry                            │ │
     │ │  - Claude Sonnet 4.6 (primary)              │ │
     │ │  - Claude Haiku 4.5 (cheap)                 │ │
     │ │  - GPT-5 (fallback / second-opinion)        │ │
     │ └────────────────────────────────────────────┬┘ │
     │                                              │  │
     ▼                                              ▼  ▼
┌────────────────────┐    ┌────────────────────┐  ┌────────────────────┐
│  Cosmos DB         │    │  Azure Storage     │  │ Key Vault          │
│  (multi-region)    │    │  (Blob, harness    │  │ (Tokens, secrets)  │
│  Plans, Sessions,  │    │  zips, audit logs) │  │                    │
│  Audit-Trail       │    │                    │  │                    │
└────────────────────┘    └────────────────────┘  └────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  Azure Functions (asynchronous workers)                                │
│   - harness_compiler                                                   │
│   - plan_validator                                                     │
│   - export_excel                                                       │
│   - notification (Slack / Email / Teams)                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technologie-Stack

| Schicht | Auswahl | Begründung |
|---|---|---|
| Frontend | **Next.js 15** (App-Router, RSC) | SSR + Streaming für agentische UX; gleiche Sprache wie AEGIRA-Website |
| API | **FastAPI** auf Python 3.12 | Pydantic-Validation, gute Anthropic-/Azure-OpenAI-Bibliotheken |
| Compute | **Azure Container Apps** | Scale-to-zero, KEDA-Skalierung; weniger Lock-in als App Service |
| Identity | **Entra ID** (B2B+B2C) | Native Azure-Integration, EU-Datenresidenz |
| LLM | **Azure AI Foundry**: Claude Sonnet 4.6 (Anthropic Direct on Foundry), GPT-5 (Fallback) | Datenresidenz, Quotas im EU-Tenant |
| Datenbank | **Cosmos DB for NoSQL** (Multi-Region EU) | Append-only Audit-Trail, schnelle Reads für Plan-Drafts |
| Object Storage | **Azure Storage Blob** (RA-GRS) | Harness-Zips, Excel-Exports, Audit-Log-Cold-Tier |
| Secrets | **Azure Key Vault** | Tokens, API-Keys, Customer-Managed-Keys für Cosmos |
| Async Jobs | **Azure Functions** (Premium Plan, Linux) | Harness-Build, Excel-Export, Notifications |
| Observability | **Application Insights** + **Log Analytics** | Full-Trace incl. Subagent-Decisions (ohne PII) |
| CI/CD | **GitHub Actions** | Build → Container Registry → Container Apps Revision |
| IaC | **Bicep** | Azure-native; auch von Plan-Agenten ausgegeben |
| Plugin-Distribution | **Azure Storage Static Website** + GitHub Releases | Harness-Zips öffentlich oder per Signed URL |

---

## 4. Datenmodell (Cosmos DB)

Vier Container, alle PartitionKey-strategisch designt:

### 4.1 `projects` (PartitionKey: `/tenantId`)

```json
{
  "id": "prj_01HF...",
  "tenantId": "tenant_exmachinai",
  "owner_user_id": "user_michael_veil",
  "title": "AEGIRA AGP Launch DE",
  "project_nature": "technical",
  "target_platform": "azure",
  "created_at": "2026-05-28T10:00:00Z",
  "status": "planning|reviewing|approved|compiled|archived",
  "current_iteration": 2,
  "plan_hash": "sha256:..."
}
```

### 4.2 `plans` (PartitionKey: `/projectId`)

Append-only — jede Plan-Version ist ein eigenes Dokument:

```json
{
  "id": "plan_v2_01HF...",
  "projectId": "prj_01HF...",
  "version": 2,
  "yaml_blob_url": "https://aegirastorageplannerprod.blob.core.windows.net/plans/prj_01HF.../v2.yaml",
  "plan_hash": "sha256:...",
  "planausgabedatum": "2026-05-28T10:32:11Z",
  "kontrolliert_durch": "user_michael_veil",
  "reviewer_status": "PASS|NEEDS_REVISION|HARD_FAIL",
  "reviewer_findings": [...],
  "created_at": "..."
}
```

### 4.3 `sessions` (PartitionKey: `/projectId`)

Eine Session pro Planungs-Lauf — vollständiger Multi-Agent-Trace:

```json
{
  "id": "session_01HF...",
  "projectId": "prj_01HF...",
  "trace": [
    {
      "agent": "pmo-agent",
      "iteration": 1,
      "thinking_summary": "...",
      "tool_calls": [...],
      "tokens_used": 12345,
      "timestamp": "..."
    }
  ],
  "hitl_approvals": [
    {"meilenstein_id": "M02", "user_id": "...", "decision": "approve", "at": "..."}
  ]
}
```

### 4.4 `audit` (PartitionKey: `/tenantId/yyyymm`)

Immutable Audit-Trail für DSGVO/EU-AI-Act:

```json
{
  "id": "audit_01HF...",
  "tenantId": "tenant_exmachinai",
  "yyyymm": "202605",
  "event_type": "plan.created|plan.approved|harness.compiled|hitl.escalation|guard.triggered",
  "actor": "user_michael_veil",
  "subject_id": "prj_01HF...",
  "payload_redacted": {...},
  "at": "..."
}
```

**Retention:** projects + plans + sessions = Customer-konfigurierbar (default 7 Jahre für `audit`); Customer-Delete-Right via DSGVO-Art-17 implementiert mit Tombstone in `audit`.

---

## 5. Multi-Tenancy

Drei mögliche Mandanten-Modelle. Empfehlung **(b)**:

| Modell | Trennung | Komplexität | Wann |
|---|---|---|---|
| (a) Single-Tenant | dedicated Azure-Sub pro Customer | sehr hoch | Enterprise-Kunden mit eigener Compliance |
| **(b) Multi-Tenant logisch in Cosmos via `tenantId`** | logisch + Verschlüsselung CMK | mittel | Standard — Mehrheit der Kunden |
| (c) Multi-Tenant mit eigener Cosmos-Instanz pro Mandant | physisch | mittel | Pflicht bei besonders sensiblen Sektoren (Healthcare, Gov) |

Bei (b): jeder Cosmos-Query enthält `WHERE c.tenantId = @tenantId`, enforced über Backend-Middleware. Kein Frontend-Code spricht direkt mit Cosmos.

---

## 6. Identity und Authorization

**Auth-Issuer:** Entra ID Tenant (eigener exmachinAI-Tenant für SaaS, Customer-Tenant für Bring-Your-Own-Entra).

**Rollen** (Custom Roles):
- `aegira.planner.viewer` — Read-only.
- `aegira.planner.author` — Plan-Erzeugung, Self-Approval.
- `aegira.planner.reviewer` — kann anderen Plänen Reviewer-Approval geben.
- `aegira.planner.hitl_pm` — vollumfänglich, inkl. Constitution-Override.
- `aegira.planner.tenant_admin` — Mandanten-Setup, User-Management.

**Token-Flow:** OAuth 2.0 Auth Code Flow → JWT mit `roles` Claim → Backend prüft per FastAPI-Middleware.

---

## 7. LLM-Routing (Azure AI Foundry)

Foundry hostet die Modelle innerhalb des EU-Tenants → Datenresidenz garantiert.

**Routing-Regeln** im Backend:
- **PMO-Agent / Reviewer-Agent**: Sonnet 4.6 (high `thinking_budget`).
- **Skill-Mapping-Agent / Risk-Agent**: Sonnet 4.6 (medium).
- **Methodology-Guard-Agent**: Sonnet 4.6 + zweiter Pass mit GPT-5 als unabhängige Zweitmeinung (sectioning-Pattern).
- **Architecture-Agent**: Sonnet 4.6 high.
- **Compression-Worker** (Long-Horizon-Conversation-Mgmt): Haiku 4.5.

**Fallback:** Wenn Sonnet 4.6 in Foundry nicht verfügbar (Throttle / Region-Outage): Bedrock-Proxy zu Sonnet 4.6 als Bridge — nur mit explizitem Customer-Opt-in, da US-Nexus.

---

## 8. Service-Komponenten

### 8.1 `planner-api` (Container App)

FastAPI Backend. Endpunkte:

```
POST   /v1/projects                         # neues Projekt
GET    /v1/projects/{id}                    # Projekt-Detail
POST   /v1/projects/{id}/sessions           # Planungs-Session starten
GET    /v1/sessions/{id}/stream             # SSE-Stream: Agent-Outputs
POST   /v1/sessions/{id}/hitl-decision      # HITL-Approval einreichen
POST   /v1/projects/{id}/compile-harness    # Harness-Zip kompilieren (async via Function)
GET    /v1/harness-zips/{id}/download       # Signed URL
POST   /v1/projects/{id}/export-excel       # Excel-Export
GET    /v1/audit?since=...                  # Audit-Log
```

Multi-Agent-Orchestrierung passiert intern, **nicht via LangGraph** (siehe Constraint: Claude-Code-Only). Statt LangGraph: eigene leichtgewichtige State Machine in Python, die Agent-Aufrufe + Persistenz koordiniert.

### 8.2 `harness-compiler` (Function)

Trigger: HTTP via Backend.
Schritte:
1. Plan-YAML aus Blob laden.
2. ZGPM-Konsistenz-Validate (gleiche Regeln wie Reviewer-Agent).
3. `harness/_template/` aus dem Mono-Repo klonen (gepinnte Template-Version).
4. Plan-Inhalte einsetzen, Subagenten parametrieren.
5. `.claude/agents/<name>.md` mit aufgabenspezifischen Tools füllen.
6. SHA-256-Checksums berechnen, `checksums.txt` schreiben.
7. Zip erstellen, in Blob-Storage hochladen.
8. Optional: GitHub-Release via `github-pat-mcp-server` triggern.

### 8.3 `plan-validator` (Function)

Idempotenter ZGPM-Konsistenz-Check. Aufgerufen vor jedem `compile-harness` und vor jedem `hitl-decision/approve`.

### 8.4 `export-excel` (Function)

Konvertiert YAML-Plan zu ZGPM-kompatibler XLSX mit MSP, PVM, Aktivitäten-Sheets, Pivot. **Keine PwC-Makros**.

### 8.5 `notification` (Function)

Slack / Email / Teams Webhooks für HITL-Approvals, rote Risikoampeln, Constitution-Treffer.

---

## 9. Constitution-Safety-Guard (serverseitig)

Wie im MCP-Server, aber Cloud-seitig enforced. Vor jedem Schreib-Endpoint wird geprüft:

```python
async def constitution_guard(request, payload):
    target_path = extract_target_path(payload)
    if matches_protected_pattern(target_path, tenant.protected_paths):
        if not payload.get("acknowledge_protected_path"):
            raise HTTPException(403, "Refused by Constitution-Safety-Guard.")
        if len(payload.get("protected_path_reason", "")) < 10:
            raise HTTPException(403, "Protected-path reason missing.")
        audit.log("guard.triggered", ...)
```

---

## 10. EU AI Act Klassifizierung

Die Planner App ist nach EU AI Act:

- **GPAI-System**: nein — keine Foundation-Model-Bereitstellung an Dritte.
- **High-Risk-System**: nein — keine Anwendung in Annex-III-Domänen.
- **Limited-Risk-System** (Art. 50 Transparenzpflichten): **ja** — interagiert mit Menschen, generiert Inhalte.

**Resultierende Pflichten:**
- Art. 50 (1) Transparenz: User wird informiert „Du interagierst mit AI-Agenten."
- Art. 50 (2) AI-generierter Output: Plan-Output ist klar als AI-generiert markiert; Watermark in Excel-Export.
- Art. 13 Informationspflicht: in-App Erklärung der Verarbeitung.
- Logbuch-Pflicht (Art. 12) gilt nicht (keine High-Risk-Stufe), aber wir führen es freiwillig (`audit` Container).

Bei Customer-Pflichten (z.B. Customer ist Pflichtige für ein High-Risk-System): Planner liefert auditierbare Outputs, die der Customer in seine eigene Pflicht-Doku einbinden kann.

---

## 11. ISO/IEC 42001 Mapping

Die Planner App selbst ist nicht ISO-42001-zertifiziert, aber die produzierten Pläne enthalten AIMS-relevante Strukturen, die der Customer in sein eigenes AIMS einbringen kann (siehe AEGIRA-Constitution AIMS-Vorgabe).

---

## 12. DSGVO

- **Datenresidenz**: alle Cosmos-Container und Blobs in EU-Regionen (Sweden Central + West Europe). Kein US-Replica.
- **Rechtsgrundlage**: Vertrag (Art. 6 (1) b).
- **Customer-Managed Keys**: optional pro Tenant; Cosmos + Storage unterstützen CMK over Key Vault.
- **DSGVO-Art-17 Right to Erasure**: Tombstone-Pattern in `audit`-Container; persönliche Daten in `projects`/`plans`/`sessions` werden aktiv gelöscht.
- **DPA**: Standard-Mustervertrag plus Art-28-Anlage.
- **DPIA**: vor GA durchzuführen. Verantwortlicher: exmachinAI DPO + externer Berater.

---

## 13. Sicherheit

- **Network**: alle Backend-Services in eigener VNet, Cosmos und Storage via Private Endpoints.
- **Ingress**: Azure Front Door + WAF (OWASP-Regelset).
- **Secret-Management**: ausschließlich Key Vault. Keine Secrets in App-Config.
- **Token-Lifecycle**: HITL-PM-Tokens via Entra ID rotation; MCP-PATs Customer-managed.
- **Vulnerability-Scanning**: Trivy auf Container Images; Dependabot auf alle Repos.
- **Penetration Tests**: vor GA, jährlich danach.

---

## 14. Beobachtbarkeit

- **Application Insights**: Distributed Tracing für jeden Multi-Agent-Run.
- **Log Analytics**: zentrale Log-Sammlung; Retention 90 Tage Hot + 7 Jahre Cold.
- **Metrics**:
  - Plan-Erzeugungs-Latenz (P50, P95, P99)
  - Reviewer-Iteration-Count
  - Tokens je Plan
  - HITL-Approval-Latenz
  - Constitution-Guard-Treffer
  - Anti-Pattern-Findings (Reviewer-Output)
- **Alerts**: rote Risikoampel, Constitution-Treffer, P95 > 5 min, Foundry-Errors > 1%.

---

## 15. Deployment

```
GitHub Actions
  ├── Build (TypeScript + Python wheels + Container Image)
  ├── SBOM (CycloneDX)
  ├── Trivy Scan
  ├── Push to Azure Container Registry
  └── Deploy
        ├── Bicep template apply
        └── Container Apps: gradual revision rollout (rainbow deploy)
```

Bicep modules in `infra/`:
- `infra/main.bicep`
- `infra/modules/{containerApp,cosmosdb,storage,keyvault,functions,frontDoor,foundry}.bicep`

---

## 16. Kosten-Modell (indikativ)

Für 100 Pläne/Monat (Annahme P50: 500k tokens je Plan):

| Komponente | Annahme | €/Monat |
|---|---|---|
| Container Apps (planner-api) | 2 Replicas, 1 vCPU each | 60 |
| Azure Functions Premium Plan | Linux EP1 | 150 |
| Cosmos DB | 800 RU/s shared throughput | 50 |
| Storage Blob | 50 GB | 5 |
| Key Vault | Standard | 5 |
| Foundry — Claude Sonnet 4.6 | 50M Tokens In, 5M Out @ Listenpreis | 280 |
| Front Door + WAF | Premium | 250 |
| App Insights | 10 GB/Monat | 25 |
| Log Analytics | 20 GB/Monat | 50 |
| **Summe** | | **875** |

Skaliert linear mit LLM-Token-Verbrauch. Hauptkosten-Treiber ist Foundry.

---

## 17. Lock-in-Vermeidung

Trotz Azure-Native:
- **Plan-YAML** ist Standard-Format, exportierbar als ZGPM-Excel jederzeit (über `/export-excel`).
- **Harness-Zip** ist plattformunabhängig, läuft offline in Claude Code.
- **Cosmos-Daten** exportierbar via Azure Data Factory zu Standard-JSON.
- **Agenten und Skills** sind als `.md` plus YAML-Frontmatter → portierbar zu anderen Multi-Agent-Frameworks ohne Azure.

Damit ist der Customer **nicht** Azure-locked, auch wenn der Planner Azure-native ist.

---

## 18. Offene Entscheidungen (HITL-Approval erforderlich)

| ID | Frage | Vorschlag |
|---|---|---|
| Q-A1 | Bring-Your-Own-Entra oder eigener exmachinAI-Tenant für SaaS? | beide unterstützen, default exmachinAI-Tenant |
| Q-A2 | Customer-Managed-Keys Pflicht oder optional? | optional, Pflicht in Enterprise-Tier |
| Q-A3 | Cosmos-Multi-Region Active-Active oder Active-Passive? | Active-Passive (Sweden Central primary, West Europe secondary) |
| Q-A4 | Plan-Versions-Retention Standard? | 7 Jahre (DSGVO-konform für Audit) |
| Q-A5 | Bedrock-Proxy als Fallback erlauben? | optional Customer-Opt-in, default nein |
| Q-A6 | Public Harness-Zip-Distribution via Storage Static Website? | nein — nur Signed URLs und GitHub Releases |
| Q-A7 | Plan-Editor im UI oder nur Read-only (Plan ist immutable)? | Read-only nach erster Compile, Re-Plan erzeugt neue Version |

---

## 19. Roadmap und Phasen

| Phase | Dauer | Output | GO/NO-GO |
|---|---|---|---|
| Phase 1 (Spike) | 4 Wochen | MCP + Harness-Template + Demo | Review |
| Phase 2 (Beta-MVP) | 8 Wochen | Planner-API + 5 Agenten + 3 Pilot-Projekte | Beta-Review |
| Phase 3 (GA) | 8 Wochen | Cowork-Plugin + Public Release + Eval-Suite | GA-Sign-off |

Total: ≈ 20 Wochen.

---

## 20. Verifikation gegen `docs/04_agent-best-practices.md`

- ✔ Orchestrator-Worker-Pattern für Planung.
- ✔ Evaluator-Optimizer-Loop (reviewer-agent).
- ✔ Sectioning für Guardrails (methodology-guard = separater Pass).
- ✔ Parallel-Tool-Calling innerhalb der Worker.
- ✔ Filesystem-Artifact-Pattern (Worker schreiben in Blob, Lead bekommt Pointer).
- ✔ Checkpoint + Resume (Session-Container in Cosmos).
- ✔ Token-Budget-Cap je Run.
- ✔ Constitution-Safety-Guard serverseitig + im Harness.
- ✔ End-State-Evaluation (Plan-PASS vs. NEEDS_REVISION).
- ✔ Vollständige Observability ohne PII.
- ✔ Platform-Discovery als Pflicht-Erstschritt im PMO-Agent-Flow.

---

## 21. Quellen

- AEGIRA-Constitution (eingefrorene Eckpfeiler aus User-Preferences).
- `docs/01_zgpm-method.md`.
- `docs/04_agent-best-practices.md`.
- Anthropic-Engineering: Building Effective Agents, Multi-Agent Research System.
- Cognition: Don't Build Multi-Agents.
- Azure-Foundry-Doku (Mai 2026).
- EU AI Act, ISO/IEC 42001, DSGVO.

---

## 22. Versions-Notiz

Schema-Version dieses Dokuments: **1.0** (28.05.2026).
Statusänderung erfordert HITL-PM-Approval und Methodology-Guard-Review.
