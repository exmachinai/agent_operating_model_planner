# Planner API (FastAPI · Phase-2 Spike)

> Spec: `docs/02_architecture-option-b.md` §8.1.
> Status: **Spike-Skelett**. CRUD-Stubs in-memory, Streaming-Stub mit Sleep-Loop. Phase-2-Beta integriert Cosmos + Foundry.

## Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/health` | Liveness-Probe (Container Apps) |
| GET | `/ready` | Readiness-Probe |
| POST | `/v1/projects` | Neues Projekt |
| GET | `/v1/projects/{id}` | Projekt-Detail |
| GET | `/v1/projects` | Liste |
| POST | `/v1/sessions?project_id=…` | Multi-Agent-Session starten |
| GET | `/v1/sessions/{id}/stream` | SSE-Stream der Agent-Outputs (Stub) |
| POST | `/v1/hitl-decision` | HITL-Approval einreichen |
| GET | `/docs` | OpenAPI Swagger (nur dev/staging) |

## Lokal starten

```bash
cd planner/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

uvicorn app.main:app --reload
# → http://localhost:8000/health
# → http://localhost:8000/docs
```

## Stream-Test

```bash
# In Tab 1: Session anlegen
curl -X POST 'http://localhost:8000/v1/sessions?project_id=prj_test'
# {"id":"ses_xxx", ...}

# In Tab 2: Stream
curl -N http://localhost:8000/v1/sessions/ses_xxx/stream
# SSE-Events alle ~600ms
```

## Container-Build

```bash
docker build -t aegira-planner-api:dev .
docker run --rm -p 8000:8000 --env-file .env aegira-planner-api:dev
```

## Was noch fehlt (Phase-2-Beta)

- `db/cosmos.py` — echter Cosmos-Client mit Managed-Identity-Auth.
- `auth/entra.py` — JWT-Validation gegen `${ENTRA_TENANT_ID}`.
- `routers/sessions.py` — real Streaming gegen Azure AI Foundry.
- Constitution-Safety-Guard auf jedem Write-Endpoint.
- Rate-Limit-Middleware (`rate_limit_per_user_per_hour`).
- Audit-Log-Append in Cosmos `audit`-Container.

## Lizenz

Apache-2.0. © 2026 exmachinAI GmbH.
