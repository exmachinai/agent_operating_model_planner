# Teststrategie — zgpm.aegira.ai (Release v0.9.2)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Datum:** 2026-06-03
**Ersetzt:** `TESTSTRATEGIE_v0.92_2026-06-03.md` · **Begleitdokument:** `HANDOVER_Claude-Code_v0.9_Umsetzung_2026-06-03.md`
**Kanonische App-Version:** `app_version = "0.9.2"` (`api/app/config.py`, alias `APP_VERSION`).

> Stack (verifiziert): Next.js/React/TS-Frontend · FastAPI/pydantic-Backend mit **deterministischem**
> Compiler · `pytest`-Suite inkl. dependency-freiem Schema-Gate · Playwright (MCP) im Repo.

---

## 0. Aktueller Status (Stand 2026-06-03)

Geprüft gegen den Code. Maßgeblich für die App-Version ist `config.app_version = "0.9.2"`.

### 0.1 ⚠️ Versions-Drift (neuer Befund, blockierend für ein sauberes Release)

| Quelle | Version | Soll |
|---|---|---|
| `api/app/config.py` `app_version` | **0.9.2** | ✅ Referenz |
| `planner/package.json` `version` | 0.9.0 | ⬜ auf 0.9.2 ziehen |
| `compiler._COMPILER_ID` | `aegira-planner@0.9.0` | ⬜ auf 0.9.2 |
| `compiler._SCHEMA_VERSION` | `2.1.0-claude-native` | (separater Schema-Strang, prüfen ob bewusst) |

→ **VER-PARITY-Test** ergänzen (§4) und Drift im Zuge v0.9.2 fixen (entspricht v0.9-Brief A4/P1.1).

### 0.2 Feature-/Test-Status

| Bereich | Status | Beleg |
|---|---|---|
| RACI-Standard + Toggle „RACI ⇄ PVM" + Code-Legende | ✅ | `components/PlanViews.tsx` (`PVM_TO_RACI`, `RACI_TITLE`, `role=radiogroup`) |
| Safe-Area / iPhone-Viewport | ✅ (**auch live**) | `tokens.css env(safe-area-inset-*)`, `layout.tsx viewportFit:"cover"` |
| Canonical Hook-/Settings-Schema | ✅ | `templates.py` (PreToolUse/permissionDecision), `defaultMode` |
| Schema-Validierungs-Gate (dependency-frei) | ✅ | `harness/schema_check.py` (`SchemaError`) lehnt `thinking_budget`/`subagents_path` ab |
| Determinismus (gleicher Plan → gleicher Zip-Hash) | ✅ getestet | `api/tests/test_harness_schema.py` (E4) |
| `.mcp.json` · `AutonomyLevel`/Reifegrad | ✅ | `templates/compiler/schema_check`; `harness/page.tsx` |
| **E2E (Playwright-Journeys)** | ⬜ **fehlt** | kein `e2e/`, keine `playwright.config.*`, keine `@playwright/test`-Deps |
| **Property-based (`hypothesis`)** | ⬜ **fehlt** | nur Determinismus + Schema getestet |
| Golden/Snapshot · Visual+A11y · Headless-Smoke | ⬜ fehlt | keine FE-Test-Deps |
| **Versions-Parität** | ❌ Drift | s. §0.1 |

**Deploy-Lag:** `viewport-fit=cover` ist live, der RACI-Toggle war im Live-Build nicht sichtbar (lokal vorhanden)
→ **Test T0 (Deploy-Parität)**, §6.

**Fazit v0.9.2:** Der deterministische Kern ist durch Schema-Gate + Determinismus abgesichert. Schwerpunkt jetzt:
**(a) Versions-Drift fixen + parity-test, (b) E2E/Visual/A11y aufbauen, (c) Property-Suite härten.**

---

## 1. Leitidee (Pyramid / Test-Trophy)

1. **Deterministischer Kern** → Unit + **Property-based** + Golden + Determinismus *(Schema+Determinismus ✅, Property ⬜)*.
2. **Gegateete User-Journey** → **End-to-End mit Playwright** *(⬜)*.

Verteilung ~70 % Unit/Property/Contract · ~20 % API-Integration · ~10 % E2E.
**Anti-Muster:** Rules-Engine über die UI testen · exakte Strings bei LLM-Ausgaben · brüchige Selektoren (`getByRole`/`data-testid`).

---

## 2. Teststufen & Werkzeuge

| Stufe | Werkzeug | Ort | Status |
|---|---|---|---|
| Unit + Property | `pytest` + **`hypothesis`** | `api/tests/` | ⬜ neu |
| Golden/Snapshot | `pytest` + `syrupy` | `api/tests/` | ⬜ neu |
| Contract/Schema | **`schema_check.py` (intern, dependency-frei)** | `api/tests/` | ✅ erweitern |
| API-Integration | `fastapi.testclient` | `api/tests/` | ✅ vorhanden |
| **E2E** | **Playwright (TS)** | `e2e/` | ⬜ neu |
| Visual + A11y | Playwright + `@axe-core/playwright` + `@lhci/cli` | `e2e/` | ⬜ neu |
| Headless-Smoke | Claude-Code-Sandbox | CI | ⬜ neu (P2) |

> **Kein externes `jsonschema`** — `schema_check.py` ist bewusst dependency-frei und wird nur erweitert.
**Neue Deps:** Backend `hypothesis`, `syrupy`. Frontend `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.

---

## 3. Compiler-Properties (Kern härten)

`hypothesis`-Generator baut gültige Pläne; prüft Invarianten über tausende Varianten.
**Datei:** `api/tests/test_compiler_properties.py` + `api/tests/strategies.py` (neu).

| ID | Invariante | Status |
|---|---|---|
| INV-1 | ≥ 1 `A` pro Meilenstein | ⬜ |
| INV-2 | genau ein `F`/`L` pro Meilenstein | ⬜ |
| INV-3 | `e` nie ohne `E` | ⬜ |
| INV-4 | Ampel propagiert nach oben | ⬜ |
| INV-5 | Graph hat immer Orchestrator+Evaluator+HITL | ✅ teilw. (`test_harness.py`) → Property |
| INV-6 | Harness-Pfade absolut ab `$HARNESS_ROOT` | ⬜ |
| INV-7 | Determinismus: gleicher Plan → gleicher `zip_sha256` | ✅ → Property-Form |
| INV-8 | `iteration` monoton; `MAX_HARNESS_ITERATIONS=25` nie überschritten | ⬜ |
| INV-9 | Evaluator-Optimizer max. 3 Runden → HITL | ⬜ |
| INV-10 | Anti-Muster sichtbar (über-spawning/vage-delegation/fehlender-checkpoint/kein-evaluator) | ⬜ |
| INV-11 | Skill-Manifest nur bei Katalog-Skills; community/experimental+Skript → `needs_gate` | ⬜ |
| INV-12 | RACI-Accountable-Achse: genau ein `F/L` ⇔ genau ein `A`(RACI) | ✅ Code → Property |

**Akzeptanz:** INV-1…12 grün; Mutationsprobe (Regel künstlich brechen → passender Test rot).

---

## 4. Contract-/Schema-Tests + Versions-Parität

`schema_check.py` validiert bereits `settings.json`/Hooks/Frontmatter/`plugin.json`/`.mcp.json`. v0.9.2:

- **C-1** Negativfälle je Artefakttyp (falsches Feld → `SchemaError`).
- **C-2** `checksums.txt`-Round-Trip (jede Datei existiert, Hash stimmt).
- **C-3** Event-/Key-Listen gegen **aktuelle** Claude-Code-Doku pinnen (versionsabhängig, BP-MD §9).
- **VER-PARITY (neu):** Test, der `config.app_version` == `package.json.version` == `_COMPILER_ID`-Suffix
  prüft (und ggf. gegen `GET /health`/Version-Endpoint). Fängt die Drift aus §0.1.
- **Dateien:** `api/tests/test_harness_schema.py` (erweitern), `api/tests/test_version_parity.py` (neu).
- **Akzeptanz:** CI-Gate blockierend; Drift macht VER-PARITY rot bis 0.9.0→0.9.2 angeglichen.

---

## 5. API-Integration (vorhanden, ergänzen)

Endpunkte: `/plan` → `/approve-plan` (Gate 2) → `/harness` → `/harness/revise` → `/harness/approve` (Gate 3) → `/harness/files` | `/harness/download`.

| Test | Status |
|---|---|
| Compile ohne Gate 2 → 409 · Graph hat Orchestrator/Evaluator/HITL · Revise +iteration | ✅ `test_harness.py` |
| Revise über `MAX_HARNESS_ITERATIONS` sauber begrenzt | ⬜ |
| `AutonomyLevel`-Stufe → `defaultMode` in `settings.json` | ⬜ |
| `GET /health` meldet `app_version` 0.9.2 | ⬜ (Teil VER-PARITY) |

---

## 6. Playwright-E2E-Journeys (Hauptarbeit v0.9.2)

`e2e/playwright.config.ts`, zwei Projekte: **Desktop** 1440×900 · **iPhone 15 Plus**
(`viewport 430×932`, `deviceScaleFactor 3`, `isMobile/hasTouch`, Safari-UA). `baseURL` aus `PLAYWRIGHT_BASE_URL`.
Locator: `getByRole`/`getByText` + `data-testid` ergänzen. Seed via API (`/plan`→`/approve-plan`), dann UI.

| ID | Journey | Kern-Assertions | Status |
|---|---|---|---|
| T0 | Deploy-Parität | gebaute Features live aktiv (RACI-Toggle vorhanden); `GET /health` = 0.9.2 | ⬜ |
| J1 | Projekt → Verständnis → Gate 1 | Gate-1-Badge ✓; Weiter erst nach Pflichtfeldern | ⬜ |
| J2 | Plan + Matrix → Gate 2 | Matrix + **sichtbare Code-Legende**; Konsistenz ✓/⚠; Gate-2 setzt Status | ⬜ |
| J3 | Harness → revise → Gate 3 → Download | Orchestrator+Evaluator+HITL; Iteration+1; Findings; Download; **`shasum -c checksums.txt` OK** | ⬜ |
| J4 | HITL / rote Ampel hält Lauf | rote Ampel → Pause + HITL-Freigabe (stop-on-red) | ⬜ |
| J5 | RACI-Toggle + Legende | Toggle ändert nur Labels; „genau ein Accountable"=„genau ein F/L"; Konsistenz unverändert | ⬜ |
| J6 | Skill-Repository / Trust-Tier | community/experimental+Skript → HITL-Gate; Manifest `trust_tier`/`content_sha256` | ⬜ |
| J7 | iPhone 15 Plus | Matrix scrollbar + Meilenstein-Spalte sticky; Bottom-Bar über Safe-Area; kein Fokus-Zoom (16px); Tap ≥44px | ⬜ |

**Akzeptanz:** T0 + J1–J7 grün (Desktop **und** Mobile); Download-Integrität verifiziert.

---

## 7. Visual-Regression + A11y

`toHaveScreenshot()` je `/plan`, `/harness`, `/review` (beide Projekte; iPhone-Baselines 430×932) ·
`@axe-core/playwright` 0 critical/serious · Lighthouse A11y ≥ 95 (mobile) · Farbe nie alleiniger Bedeutungsträger.

---

## 8. CI-Pipeline (blockierende Gates)

1) Lint/Typecheck · 2) **Backend** `pytest` (Property ⬜, Golden ⬜, Schema ✅, **VER-PARITY** ⬜, Integration ✅) + Coverage · 3) FE-Build · 4) **E2E** (Desktop+Mobile) · 5) A11y/Lighthouse · 6) **(P2) Headless-Smoke**.
**Coverage:** Compiler/Rules/Schemas ≥ 90 % · API ≥ 80 % · E2E nach Journey-Abdeckung.

---

## 9. v0.9.2-Arbeitsplan (P0 → P2)

**P0 — sofort:**
1. **VER-PARITY-Test + Drift fixen** (`package.json` 0.9.0→0.9.2, `_COMPILER_ID`→0.9.2). Sauberes Release zuerst.
2. `e2e/`-Gerüst + `playwright.config.ts` (Desktop + iPhone 15 Plus) + `fixtures/seed.ts`.
3. **T0** (Parität) + **J2** (Legende) + **J5** (RACI) — sichern die frischen v0.9-Features.
4. `strategies.py` + Properties **INV-1, 2, 3, 7, 12**.

**P1 — kurzfristig:** J1, J3, J4, J7 · INV-4,5,6,8,9,10,11 · Schema-Negativfälle C-1/C-2/C-3 · API-Ergänzungen · A11y/Visual.
**P2 — mittelfristig:** J6 · Golden (`syrupy`) · Headless-Smoke · Last/Perf (optional).

---

## 10. Struktur & Befehle

```text
planner/
├── api/tests/
│   ├── strategies.py · test_compiler_properties.py        # neu (INV)
│   ├── test_version_parity.py                             # neu (VER-PARITY)
│   ├── test_artifacts_golden.py                           # P2 (syrupy)
│   └── test_harness_schema.py                             # vorhanden — Negativfälle erweitern
└── e2e/                                                   # NEU
    ├── playwright.config.ts · fixtures/seed.ts
    ├── journeys/t0_parity.spec.ts … j7_iphone.spec.ts
    ├── a11y/axe.spec.ts · __screenshots__/
```
```bash
cd planner/api && pip install hypothesis syrupy        # KEIN jsonschema
pytest -q --cov=app --cov-report=term-missing
cd planner && npm i -D @playwright/test @axe-core/playwright @lhci/cli && npx playwright install
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

---

## 11. Arbeitsauftrag an Claude Code

1. **Explore → Plan:** §0 gegen aktuellen Code re-validieren (Versionsstrings + Feature-Status ändern sich).
2. **P0 zuerst:** Versions-Drift fixen + VER-PARITY → E2E-Gerüst → T0/J2/J5 → INV-1/2/3/7/12.
3. `schema_check` nur **erweitern** (dependency-frei), Listen gegen aktuelle Doku pinnen.
4. **Verifikation (höchster Hebel):** Mutationsprobe je Invariante; adversariale Subagent-Review des Test-Diffs.

**Definition of Done v0.9.2:** Versionsstrings konsistent auf **0.9.2** + VER-PARITY grün · §3 (P0-Invarianten) + §6 (T0, J2, J5 mind.) grün · E2E-Gerüst + iPhone-Projekt · Schema-Gate blockierend · Mutationsprobe bestanden · iPhone-Screenshots + Lighthouse-A11y ≥95 im PR · PR verlinkt diese Datei + v0.9-Brief.

## Leitplanken (Reminder)
Deterministischen Kern exakt, LLM-Pfade über Eigenschaften · kein externes `jsonschema` · keine brüchigen Selektoren ·
Schema gegen offizielle Claude-Code-Doku · keine 100%-Claims · kein „DACH" · keine Secrets in Fixtures.

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Versionsabhängiges gegen die aktuelle Claude-Code-Doku verifizieren (BP-MD §9).*
