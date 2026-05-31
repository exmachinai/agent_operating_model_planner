# Handover — AOMP Planner, Session 2026-05-31

> Stand: **v0.4.4 live** auf https://zgpm.aegira.ai · `main` @ `f430b37f` (#31) · Deploy grün.
> Doku-Sprache Deutsch, Code englisch. Dropbox = Source-of-Truth (kein Git-Repo);
> Push via `_push-update.sh` → PR → squash-auto-merge nach `main`.

---

## 1. Aktueller Live-Stand

| | |
|---|---|
| App | https://zgpm.aegira.ai |
| API | https://api.zgpm.aegira.ai (`/health` meldet `version: 0.4.4`) |
| Image-Tag live | `planner-api:v0.4.4` / `planner-frontend:v0.4.4` |
| `main` HEAD | `f430b37f` — fix(v0.4.4) (#31) |
| Deploy | GitHub Actions „Deploy (prod)" (`deploy.yml`, `workflow_dispatch`), image-only via `az acr build` → `az containerapp update`. OIDC steht (Entra-App `github-deploy-aegira-planner`). |
| Smoke | App 200 / API 200, Cosmos read+write ok. |

**Deploy auslösen:**
`gh workflow run deploy.yml -R exmachinai/agent_operating_model_planner --ref main -f image_tag=vX.Y.Z -f api_base_url=https://api.zgpm.aegira.ai`

---

## 2. In dieser Session umgesetzt (chronologisch)

- **Reconcile Dropbox ↔ main (2026-05-30):** Dropbox war faktisch *vor* v0.4 (56 Dateien differierten, ganzer Harness-Canvas/Compiler/PlanViews fehlten). Per `rsync -rc` (ohne `--delete`) von frischem main-Klon → Dropbox geglichen, 0 Restdifferenzen. **Regel:** vor jedem Push aus Dropbox prüfen, ob `main` neuer ist.
- **#27 v0.4.1** — (a) Gate-1-Clickflow-Bug behoben: `approve()` persistiert jetzt vor der Freigabe; Backend leitet `project_nature` defensiv aus `project_type` (it→technical/non-it→concept) ab. (b) Plan-Composer verteilt PVM-`A` je Phase auf Spezialisten statt alles auf einen Lead → echte Multi-Agent-Auslastung. (c) „Neu generieren (v2)" entfernt (deterministisch → identischer Plan).
- **#28** — `.playwright-mcp/`-Debug-Artefakte aus Repo entfernt + `.gitignore` ergänzt.
- **#29 v0.4.2** — Gesamtrisiko-Begründungskasten (Treiber-Risiken MRL/PRL + Mitigation, immer sichtbar); Float-Metrik `7.000000000000001 PT` gerundet (`fmtPt`); erster Versuch Modell-editierbar (nur Canvas-Detail) + Overlap-Versuch (`min-width:0`, **reichte nicht**).
- **#30 v0.4.3** — Harness-UX: **globale Modell-Strategie** (Ausgewogen/Sparsam/Premium, Backend-Command `model-strategy`, Pro-Agent-Override bleibt im Detail, HITL bleibt `human`); Pro-Agent-Modell-Badges aus Karten/Palette entfernt; **Overlap robust gelöst** (Detail-Panel volle Breite UNTER der Canvas); **Preflight-Agenten-Graph entfernt** → kompakte read-only „Architektur-Check"-Leiste (Canvas ist die einzige editierbare Agenten-Ansicht); **Modus „Manager"/„Handoff" inline erklärt** + Umschalt-Hinweis (Router/Triage-Agent in Stage ziehen).
- **#31 v0.4.4** — Datei-/Ordner-Upload (Schritt 2) auf **native `<label>`-Inputs** umgestellt statt `fileRef.current.click()` — robust gegen Sicherheits-Extensions/Policies, die skriptgesteuerte `input.click()` blocken.

---

## 3. Offene Punkte / nächste Schritte

1. **🔴 ZU TESTEN: Datei-/Ordner-Upload in der Nutzer-Chrome.** Backend-Upload (201), CORS (ACAO korrekt) und Klick→Dialog im automatisierten Chromium **verifiziert ok**. User meldet „kein Dialog" in *seinem* Chrome. v0.4.4 (native Labels) ist der robuste Fix → **erneut testen**. Falls weiter nichts passiert = Browser-Ebene, kein App-Bug:
   - `chrome://policy` → `AllowFileSelectionDialogs` = Disabled? → IT/MDM-Richtlinie, nur IT-Freigabe oder Cloud-Quellen-Pfad hilft.
   - Inkognito testen → geht's = Extension blockt.
2. **Plan-Composer ist deterministisch, ohne LLM** (`planning/zgpm_composer.py`, Kommentar im Code). Gleiche Eingabe → identischer Plan. **Höchster-Wert-Schritt:** Plangenerierung an die Anthropic-API hängen (Foundry-Pfad existiert) → genuin unterschiedliche/bessere Pläne, dann „Neu generieren" mit echtem Diff zurückbringen.
3. **typedRoutes-tsc-Warnungen** (vorbestehend, viele Seiten): `router.push(\`/projects/${id}/...\`)` ist nicht `RouteImpl`-typkonform. Blockiert den Docker-Build NICHT (Live läuft), sollte aber sauber gemacht werden (z. B. `as Route` oder `typedRoutes` justieren).
4. **Dependabot-PR #14** (pip-Bump, planner/api) noch offen/ungemergt.
5. **Skill hinzufügen (Harness-Editor-Karten):** serverseitig verifiziert (`revise skill` → 201). Frühere „klappt nicht"-Meldung war v0.4.1-Frontend-Lag; auf v0.4.4 erneut prüfen.

---

## 4. Schritt-Flow & API-Vorbedingungen (sonst 409/422)

`createProject` → `PATCH /understanding` (`project_type` it/non-it + subtype + platform + summary) → `POST /approve-understanding` (**Gate 1**) → `POST /guardrails/clear {proceed:true}` → `POST /plan` (generieren) → `POST /approve-plan` (**Gate 2**) → `POST /harness` (kompilieren) → `POST /harness/revise` (Canvas-Edits, `skill`, `agent` op add/update/delete, `layout`, `stage-pattern`, `model-strategy`) → `POST /approve-harness` (**Gate 3**, friert ein).

---

## 5. Architektur-Pointer

- **Composer (Plan):** `planner/api/app/planning/zgpm_composer.py` — `_PHASES`, `_PHASE_AGENTS` (Phase→ausführender Spezialist), `_roles_for`, `_build_token_budget`, `review` (PVM-Regeln).
- **Harness:** `planner/api/app/harness/{catalog,compiler,templates,yaml_emit}.py`; Revise-Logik in `compiler.apply_command` (inkl. `model-strategy`-Command).
- **Frontend:** `planner/components/HarnessCanvas.tsx` (Drag&Drop-Canvas, Modell-Strategie, Detail-Panel unten), `planner/components/PlanViews.tsx` (Gantt/RACI/Heatmap/Utilization, `fmtPt`), `planner/app/projects/[id]/{understanding,plan,harness,interview}/page.tsx`.
- **Modell-IDs:** Opus `claude-opus-4-8`, Sonnet `claude-sonnet-4-6`, Haiku `claude-haiku-4-5` (Konstanten in `harness/catalog.py`).

## 6. Infrastruktur

- RG **`aegira-planner-prod`** (germanywestcentral/Frankfurt): Container Apps `ca-aegira-planner-api` / `ca-aegira-planner-frontend`, Cosmos `cosmos-aegira-planner-prod`.
- RG **`aegira-shared-prod`** (Sweden, residenz-irrelevant): ACR `aegiraacrprodtgygvmrc`, UAMI, Front Door.
- Cosmos-Container `planner`: `projects` (PK `/tenantId`), `plans`, `audit`, `sessions`, `harness` (PK `/projectId`).
- OIDC: Entra-App `github-deploy-aegira-planner` (FedCreds für `ref:refs/heads/main` + `environment:production`), Repo-Secrets `AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID`.
- **Lokale Dev-Eigenheiten:** Next-Build geht nicht direkt aus dem Dropbox-Pfad (SWC-Binary blockiert) → in `$HOME`-Pfad kopieren; Cosmos nicht lokal testbar (Prod-IP-Firewall) → Backend nutzt In-Memory-Fallback bei leerem `COSMOS_ENDPOINT`. Backend-Tests: `planner/api/.venv` + `pytest` (20 grün).
