# Handover — AEGIRA Planner (Prozess-aligned)

**Stand: 29.05.2026 — aktualisiert auf den kanonischen User-Prozess**
**Ziel dieses Handovers: die App ab jetzt konsistent entlang des dokumentierten
9-Schritt-Prozesses weiterbauen. Keine Eile, kein Druck.**

> Neu seit letztem Handover: Es gibt jetzt eine kanonische Prozess- und Bedien-Norm:
> - `deliverables/AEGIRA_Planner_User_Guide.pptx` (29 Slides, didaktischer User Guide — ersetzt das alte PDF)
> - `docs/09_process-flow.md` (dokumentierter Ablauf)
>
> **Diese beiden Dokumente sind ab sofort die Referenz für jede App-Entscheidung.**
> Jede neue Screen-/API-Arbeit muss sich einem der neun Schritte zuordnen lassen.

---

## TL;DR — Stand der Plattform

Die Phase-2-Spike-Plattform ist live unter `https://zgpm.aegira.ai` (HTTP/2 200).
Backend (FastAPI), Frontend (Next.js), Front Door, Cosmos, Storage, Key Vault, ACR —
alles deployed und gesund. Was fehlt, ist die **fachliche Substanz**: Der Prozess aus
dem User Guide ist noch nicht in Screens und Endpoints umgesetzt.

## Der kanonische Prozess als Bauplan

Drei Makro-Phasen, neun Schritte, drei harte HITL-Gates, drei begrenzte Schleifen.
Jede Zeile unten = ein Stück App. Routen folgen der IA aus `docs/05_ux-ui-best-practices.md`.

| # | Schritt | Screen / Route | Backend / Daten | Status |
|---|---|---|---|---|
| 1 | Projekt beschreiben | `/projects/new` (Freitext-Brief) | `POST /v1/projects` → Cosmos `projects` | TODO |
| 2 | Schärfungs-Interview (McK) | `/projects/[id]/interview` (Chat, MECE/Hypothese-Chips, Vorschläge) | SSE-Stream PMO-Discovery; `sessions` | TODO |
| 3 | Verständnis + Agentenstruktur freigeben | `/projects/[id]/understanding` | `project.yaml` (`project_nature`, `target_platform`); Gate 1 | TODO |
| 4 | Projekte verwalten | `/` Dashboard (Status-Badges, Kopieren/Löschen) | `GET /v1/projects`; append-only `plans` | TEIL (Liste) |
| 5 | Leitplanken | In Schritt 2/3 integriert + `/projects/[id]/understanding` | Guardrail-Sectioning-Call (eigener LLM-Call) | TODO |
| 6 | ZGPM-Plan | `/projects/[id]/plan` (MSP/PVM/Risiken/Aktivitäten) + `/session` Live-View | Orchestrator-Worker; Reviewer-Loop (max 3×); `plans` | TODO |
| 7 | Review & Edit | `/projects/[id]/plan` (Inline-Edit, DE/EN, DiffViewer) | neue Plan-Version; Gate 2 | TODO |
| 8 | Harness bauen & gestalten | `/projects/[id]/harness` (Graph-Viz, Artefakt-Editor, Kommandofeld) | `harness_compiler` Function; Iterations-Schleife | TODO |
| 9 | Export Zip + Cowork-Setup | `/projects/[id]/harness` (Download) | Blob signed URL; `checksums.txt`; `plugin.json`; Gate 3 | TODO |

**Drei harte Gates** (nie übersteuerbar): Meilenstein-Sign-off · rote Risiko-Ampel · `SKILL.md`-Aufnahme.

## Empfohlene Reihenfolge (Prozess-getrieben)

Variante C → A → B aus dem alten Handover bleibt klug, aber jetzt am Prozess ausgerichtet:

### 1. API-Design schärfen (kein Code, 1–2 h)
OpenAPI-Spec entlang der Tabelle oben: `projects`, `interview/sessions`, `plans`
(append-only, `version` + `plan_hash` + `reviewer_status`), `harness`. Pydantic-Schemas
für `project.yaml` (inkl. `project_nature` enum: concept/technical/hybrid). Auth-Flows
und die drei Gate-Übergänge als explizite State-Transitions modellieren.

### 2. Stack stabilisieren (1 h)
- PR #10 Bicep-Patches im Code nachziehen (Single-Mode, `min-replicas=1`, Probe-Timings in `containerApp.bicep`).
- `_deploy-azure.sh` um Pre-Deploy `git pull origin main` auf `WORK_DIR` erweitern (behebt das `ls -td`-Picking-Problem dauerhaft).
- ~~Sicherheits-PR: Next.js 15.0.3 → 15.0.4 (CVE-2025-66478)~~ **erledigt 2026-05-29.** Korrektur: 15.0.4 ist selbst von CVE-2025-66478 betroffen (npm-Deprecation). Angehoben auf **15.5.18** (gepatcht, schließt auch alle Folge-Advisories), React-RC → stabil **19.2.6**, postcss-Override. Verifiziert: `npm run build` + `npm run typecheck` grün, `npm audit` = 0 vulnerabilities.

### 3. Substanz: Schritt 1 → 3 end-to-end (2–3 h)
- `db/cosmos.py` mit `ManagedIdentityCredential` + lazy `CosmosClient`.
- `POST /v1/projects` schreibt echt in Cosmos; Smoke-Test
  `curl -X POST https://api.zgpm.aegira.ai/v1/projects -d '{"name":"Test"}'`.
- Danach Screen 1 (Brief) und Screen 2 (Interview-SSE) — der erste sichtbare Prozess-Pfad
  bis Gate 1. End-to-End-Beweis: Browser → FD → WAF → Backend → MI → Cosmos.

## Konsistenz-Regeln für jede App-Änderung

- Jede neue Route ordnet sich einem der neun Schritte zu (sonst gehört sie nicht in den MVP).
- HITL-Approvals erscheinen **inline im Agent-Trace**, nicht als Modal (UX-Norm U2/U3).
- Plan ist nach erstem Compile **read-only**; Änderung = neue Version (append-only).
- Token-Budget je Agent/Knoten wird live mitgezählt und bei Überschreitung als HITL-Punkt behandelt.
- Guardrails laufen als **eigener LLM-Call** (Sectioning), nie im Worker-Prompt.
- Keine Azure-Abhängigkeit ins Harness; Export bleibt portabel (kein Vendor-Lock-in).

## Offene Tasks (aus altem Handover, weiterhin gültig)

| # | Status | Was | Priorität |
|---|---|---|---|
| 30 | pending | Fine-Grained PAT für github-pat-mcp-server | niedrig (User-Aktion) |
| 43 | **done (2026-05-29)** | Next.js 15.0.3 → **15.5.18** (CVE-2025-66478; 15.0.4 war selbst betroffen) + React stabil 19.2.6 | mittel (vor prod) |
| PR#10 | offen | Bicep-Patches nachziehen (Single-Mode, Probes, min-replicas) | niedrig |
| deploy | offen | `_deploy-azure.sh` + `git pull` | mittel |

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

## Schnell-Check (morgens)

```bash
curl -s https://zgpm.aegira.ai/health | head -3
curl -s https://api.zgpm.aegira.ai/health | head -3
for app in ca-aegira-planner-api ca-aegira-planner-frontend; do
  echo "=== $app ==="
  az containerapp revision list -g aegira-planner-prod -n $app \
    --query "[?properties.active==\`true\`].{name:name,state:properties.runningState,health:properties.healthState}" -o table
done
```

## Wo finde ich was

- **Prozess-Norm**: `deliverables/AEGIRA_Planner_User_Guide.pptx` · `docs/09_process-flow.md`
- **Architektur/IA/Screens**: `docs/02_architecture-option-b.md`, `docs/05_ux-ui-best-practices.md`
- **Harness-Spec**: `docs/03_harness-zip-spec.md` · **Agent-Best-Practices**: `docs/04_agent-best-practices.md`
- **Bicep**: `planner/infra/` · **Backend**: `planner/api/` · **Frontend**: `planner/app/`, `planner/components/`
- **Deploy-Skripte**: `_push-update.sh`, `_deploy-azure.sh`, `_push-images.sh`

## Constitution-Eckpfeiler (gelten weiter)

- AEGIRA ist Trust-Infrastructure, nicht Compliance-Software.
- Buyer Promise: „Evidence-based AI Trust — nachweisbar, audit-ready". Keine 100%-Claims.
- Rechtsräume: DE · EU27-Rest · UK · CH (niemals „DACH").
- Forcing Event: EU AI Act Enforcement am 02.12.2027.
- Maturity = AIMS (ISO 42001 × CMMI v3). MITRE und GMS deprecated.
- Produkte: AI Navigator / AI Guardian / AI Commander — keine anderen Namen.
- Constitution-Safety-Guard: Writes auf `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` blockiert.
- ZGPM = PwC-Methodik (Glasner et al.); methodisch nutzen, keine PwC-Marke suggerieren.

---

**Nächster konkreter Schritt:** OpenAPI-Spec für Schritte 1–3 schreiben, dann Cosmos-Connect
für `POST /v1/projects`. Damit steht der erste sichtbare Prozess-Pfad bis Gate 1.
