# Teststrategie — zgpm.aegira.ai (Release v0.92)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Datum:** 2026-06-03
**Ersetzt:** `TESTSTRATEGIE_v0.9_2026-06-03.md` · **Begleitdokument:** `HANDOVER_Claude-Code_v0.9_Umsetzung_2026-06-03.md`
**Umsetzbar in Claude Code** — jede Sektion hat Dateipfade, Befehle und Akzeptanzkriterien.

> Stack (verifiziert, Stand v0.9.0): Next.js/React/TS-Frontend · FastAPI/pydantic-Backend mit
> **deterministischem** Compiler · `pytest`-Suite inkl. dependency-freiem Schema-Gate · Playwright (MCP) im Repo.

---

## 0. Aktueller Status der App (Stand 2026-06-03, lokal v0.9.0)

Geprüft gegen den Code (nicht aus dem Gedächtnis). Der Live-Deploy hängt teils hinterher (s. Hinweis).

| Bereich | Status | Beleg |
|---|---|---|
| RACI als Standard + Toggle „RACI ⇄ PVM" + Code-Legende | ✅ implementiert | `components/PlanViews.tsx` (`PVM_TO_RACI`, `RACI_TITLE`, `role=radiogroup`, mobile Chip-Legende) |
| Safe-Area / iPhone-Viewport | ✅ implementiert (**auch live**) | `tokens.css env(safe-area-inset-*)`, `layout.tsx viewportFit:"cover"` |
| Canonical Hook-/Settings-Schema | ✅ implementiert | `harness/templates.py` (PreToolUse/permissionDecision), `defaultMode` |
| **Schema-Validierungs-Gate (dependency-frei)** | ✅ implementiert | `harness/schema_check.py` (`SchemaError`); lehnt `thinking_budget`/`subagents_path` hart ab |
| Determinismus (gleicher Plan → gleicher Zip-Hash) | ✅ getestet | `api/tests/test_harness_schema.py` (E4) |
| `.mcp.json`-Generierung | ✅ implementiert | `templates.py`, `compiler.py`, `schema_check.py` |
| Reifegrad/`AutonomyLevel` | ✅ implementiert | `schemas/harness.py`, `compiler.py`, `app/projects/[id]/harness/page.tsx` |
| **E2E (Playwright-Journeys)** | ⬜ **fehlt** | kein `e2e/`, keine `playwright.config.*`, keine `@playwright/test`-Deps |
| **Property-based (`hypothesis`)** | ⬜ **fehlt** | nur Determinismus + Schema getestet; keine INV-Suite |
| Golden/Snapshot der Datei-Inhalte | ⬜ fehlt | kein `syrupy` |
| Visual-Regression + A11y (axe/Lighthouse) | ⬜ fehlt | keine FE-Test-Deps |
| Headless-Smoke (echter Claude-Code-Lauf) | ⬜ fehlt | — |

**Deploy-Lag:** `viewport-fit=cover` ist live aktiv, der RACI-Toggle war im Live-Build aber **nicht** sichtbar
(lokal vorhanden). → **Test T0 (Deploy-Parität)** unten aufnehmen.

**Fazit für v0.92:** Der *deterministische Kern* ist bereits durch Schema-Gate + Determinismus abgesichert.
Der **Schwerpunkt von v0.92 verschiebt sich auf die fehlenden Stufen**: Property-based (Kern härten) und
End-to-End/Visual/A11y (Funktionalität + iPhone aus Nutzersicht).

---

## 1. Leitidee (Pyramid / Test-Trophy)

Zwei Hälften, zwei führende Methoden:
1. **Deterministischer Kern** (Compiler, Rules-Engine, YAML, Artefakt-Schema) → Unit + **Property-based** + Golden + Determinismus *(Schema+Determinismus ✅, Property ⬜)*.
2. **Gegateete User-Journey** (Gate 1→2→3, RACI-Edit, HITL, Export) → **End-to-End mit Playwright** *(⬜)*.

Verteilung: **~70 % Unit/Property/Contract · ~20 % API-Integration · ~10 % E2E.**
**Anti-Muster:** Rules-Engine über die UI testen · exakte Strings bei LLM-Ausgaben assert-en
(Compiler ist deterministisch → exakt; LLM-Pfade → Eigenschaften) · brüchige Selektoren (nur `getByRole`/`data-testid`).

---

## 2. Teststufen & Werkzeuge (Status-markiert)

| Stufe | Werkzeug | Ort | Status |
|---|---|---|---|
| Unit + Property | `pytest` + **`hypothesis`** | `api/tests/` | ⬜ neu |
| Golden/Snapshot | `pytest` + `syrupy` | `api/tests/` | ⬜ neu |
| Contract/Schema | `pytest` + **`schema_check.py` (intern, dependency-frei)** | `api/tests/` | ✅ vorhanden, erweitern |
| API-Integration | `fastapi.testclient` | `api/tests/` | ✅ vorhanden (`test_harness*.py`) |
| **E2E** | **Playwright (TS)** | `e2e/` | ⬜ neu |
| Visual + A11y | Playwright + `@axe-core/playwright` + `@lhci/cli` | `e2e/` | ⬜ neu |
| Headless-Smoke | Claude-Code-Sandbox | CI | ⬜ neu (P2) |

> **Wichtig:** KEIN externes `jsonschema` einführen — das Projekt hat sich bewusst für ein
> dependency-freies `schema_check.py` entschieden. v0.92 **erweitert dieses Modul**, statt es zu ersetzen.

**Neue Abhängigkeiten:** Backend `hypothesis`, `syrupy`. Frontend `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.

---

## 3. Compiler-Properties (Kern härten — höchste Priorität v0.92)

Property-based mit `hypothesis`: Generator baut **gültige Pläne**, prüft Invarianten über tausende Varianten.
**Datei:** `api/tests/test_compiler_properties.py` (neu) · Generator `api/tests/strategies.py` (neu).

| ID | Invariante | Status |
|---|---|---|
| INV-1 | Jeder Meilenstein ≥ 1 `A` | ⬜ |
| INV-2 | Genau ein `F`/`L` pro Meilenstein | ⬜ |
| INV-3 | `e` nie ohne `E` | ⬜ |
| INV-4 | Ampel propagiert nach oben (MRL→Meilenstein→Projekt) | ⬜ |
| INV-5 | Graph hat immer Orchestrator + Evaluator + HITL | ✅ teilweise (`test_harness.py`), als Property verallgemeinern |
| INV-6 | Alle Harness-Pfade absolut ab `$HARNESS_ROOT` | ⬜ |
| INV-7 | **Determinismus**: gleicher Plan → gleicher `zip_sha256` | ✅ (`test_harness_schema.py`) — in Property-Form ziehen |
| INV-8 | `iteration` monoton; `MAX_HARNESS_ITERATIONS = 25` nie überschritten | ⬜ |
| INV-9 | Evaluator-Optimizer: max. 3 Runden, dann HITL | ⬜ |
| INV-10 | Anti-Muster sichtbar: `anti.ueber-spawning`/`vage-delegation`/`fehlender-checkpoint`/`harness.kein-evaluator` | ⬜ |
| INV-11 | Skill-Manifest nur bei Katalog-Skills; `community`/`experimental` + skripttragend → `needs_gate` | ⬜ |
| INV-12 | RACI-Accountable-Achse: genau ein `F/L` ⇔ genau ein `A`(RACI) | ✅ Code da (`PVM_TO_RACI`), als Property absichern |

```python
@given(plan=valid_plans())
def test_inv2_exactly_one_F_or_L(plan):
    g = compile_graph(project_for(plan), plan)
    for m in plan.milestones:
        assert len([r for r in m.responsibilities if r.code in ("F","L")]) == 1
```
**Akzeptanz:** INV-1…12 grün; Mutationsprobe (eine Regel künstlich brechen → passender Test rot).

---

## 4. Contract-/Schema-Tests — vorhandenes Gate erweitern

`schema_check.py` validiert bereits `settings.json`/Hooks/Frontmatter/`plugin.json`/`.mcp.json` gegen
hinterlegte Mengen (erlaubte Settings-Keys, Hook-Events, `defaultMode`-Werte). **v0.92:**

- **C-1** Negativfälle ergänzen: für **jeden** Artefakttyp ein bewusst falsches Feld → `SchemaError` (Mutationsproben).
- **C-2** Abdeckung je Artefakt vervollständigen (auch `checksums.txt`-Round-Trip: jede Datei existiert, Hash stimmt).
- **C-3** `schema_check` gegen die **aktuelle** Claude-Code-Doku gegenprüfen (Event-/Key-Listen sind versionsabhängig, BP-MD §9) und Quelle als Kommentar pinnen.
- **Datei:** `api/tests/test_harness_schema.py` (erweitern) + ggf. `schema_check.py` ergänzen.
- **Akzeptanz:** CI-**Gate** bleibt blockierend; jede falsche Feldmutation wird rot.

---

## 5. API-Integration (vorhanden, gezielt ergänzen)

Auf `fastapi.testclient` (Fixtures `client`, `gate2_project`). Endpunkte verifiziert:
`/plan` → `/approve-plan` (Gate 2) → `/harness` → `/harness/revise` → `/harness/approve` (Gate 3) →
`/harness/files` (entpackte Dateien) bzw. `/harness/download` (ZIP).

| Test | Erwartung | Status |
|---|---|---|
| Compile ohne Gate 2 → 409 | ✅ vorhanden | `test_harness.py` |
| Graph hat Orchestrator/Evaluator/HITL | ✅ vorhanden | `test_harness.py` |
| Revise sequence/parallel/agent/skill, `iteration`+1 | ✅ vorhanden | `test_harness.py` |
| Revise über `MAX_HARNESS_ITERATIONS` sauber begrenzt | ⬜ ergänzen | — |
| Reifegrad/`AutonomyLevel` → `defaultMode` je Stufe | ⬜ ergänzen | neu in v0.9 |
| Irreversibles Tool erzwingt HITL-Knoten | ⬜ ergänzen (falls C2 umgesetzt) | — |

---

## 6. Playwright-E2E-Journeys (Hauptarbeit v0.92, führend für Funktionalität)

**Setup (neu).** `e2e/playwright.config.ts` mit zwei Projekten:
- **Desktop** 1440×900.
- **iPhone 15 Plus** (custom device): `viewport {width:430,height:932}`, `deviceScaleFactor:3`, `isMobile:true`, `hasTouch:true`, Safari-UA.

`baseURL` aus `PLAYWRIGHT_BASE_URL`. **Locator-Politik:** `getByRole`/`getByText`; stabile Anker via
`data-testid` im UI ergänzen (Teil der Umsetzung). **Test-Daten:** Seed über die API
(`/v1/projects` → `/plan` → `/approve-plan`), Zustand definiert, dann UI-Journey.

| ID | Journey | Route(n) | Kern-Assertions | Status |
|---|---|---|---|---|
| **T0** | **Deploy-Parität** | live `baseURL` | gebaute Features sind live aktiv (z. B. RACI-Toggle vorhanden) | ⬜ neu |
| J1 | Projekt → Verständnis → Gate 1 | `projects/new`→`…/understanding`/`interview` | Gate-1-Badge „✓"; Weiter erst nach Pflichtfeldern | ⬜ |
| J2 | Plan + Matrix → Gate 2 | `…/plan` | Matrix rendert; **Code-Legende sichtbar**; Konsistenz-✓/⚠ korrekt; Gate-2-Freigabe setzt Status | ⬜ |
| J3 | Harness → revise → Gate 3 → Download | `…/harness` | Orchestrator+Evaluator+HITL; revise erhöht Iteration; Findings sichtbar; Gate-3 → Download; **`shasum -c checksums.txt` = OK** | ⬜ |
| J4 | HITL / rote Ampel hält Lauf | `…/review` | rote Ampel → Pause, HITL-Freigabe gefordert (stop-on-red) | ⬜ |
| J5 | RACI-Toggle + Legende | `…/plan` | Toggle „RACI ⇄ PVM" ändert nur Labels; „genau ein Accountable" = „genau ein F/L"; Konsistenz unverändert | ⬜ |
| J6 | Skill-Repository / Trust-Tier | `…/harness`/`admin` | `community`/`experimental`+skripttragend → HITL-Gate; Manifest mit `trust_tier`/`content_sha256` | ⬜ |
| J7 | iPhone 15 Plus – Bedienbarkeit | alle, Mobile-Projekt | Matrix horiz. scrollbar, Meilenstein-Spalte sticky; Bottom-Bar nicht vom Home-Indicator verdeckt; kein Fokus-Zoom (16px-Inputs); Tap ≥44px | ⬜ |

**Akzeptanz:** T0 + J1–J7 grün (Desktop **und** Mobile); Download-Integrität verifiziert.

---

## 7. Visual-Regression + A11y (neu)

- **Visual:** `expect(page).toHaveScreenshot()` je `/plan`, `/harness`, `/review` in beiden Projekten; iPhone-Baselines 430×932.
- **A11y:** `@axe-core/playwright` je Route — 0 critical/serious.
- **Lighthouse:** `@lhci/cli` — A11y ≥ 95 (mobile preset).
- Farbe nie alleiniger Bedeutungsträger (Ampel/RACI zusätzlich Symbol/Label).

---

## 8. CI-Pipeline (blockierende Gates)

`.github/workflows/test.yml`: 1) Lint/Typecheck · 2) **Backend** `pytest` (Property ⬜, Golden ⬜, Schema ✅, Integration ✅) + Coverage-Gate · 3) FE-Build · 4) **E2E** Playwright (Desktop+Mobile) · 5) A11y/Lighthouse · 6) **(P2) Headless-Smoke** (`--permission-mode dontAsk`).

**Coverage:** Compiler/Rules/Schemas ≥ 90 % · restliche API ≥ 80 % · E2E nach Journey-Abdeckung (T0, J1–J7).

---

## 9. v0.92-Arbeitsplan (status-getrieben, P0 → P2)

**P0 — sofort (größte offene Lücke schließen):**
1. `e2e/`-Gerüst + `playwright.config.ts` (Desktop + iPhone 15 Plus) + `fixtures/seed.ts` (`seedGate2Project`, `verifyChecksums`).
2. **T0 Deploy-Parität** + **J2** (Legende/Matrix) + **J5** (RACI-Toggle) — sichert die frisch gelandeten v0.9-Features.
3. `strategies.py` + `test_compiler_properties.py` mit **INV-1, 2, 3, 7, 12** (die regelkritischen).

**P1 — kurzfristig:**
4. Journeys **J1, J3, J4, J7** (Gate-Fluss + iPhone).
5. Restliche Invarianten **INV-4, 5, 6, 8, 9, 10, 11**.
6. Schema-Negativfälle **C-1/C-2/C-3**; API-Ergänzungen (Iterations-Limit, AutonomyLevel→defaultMode).
7. A11y/Visual (§7) inkl. Lighthouse-Gate.

**P2 — mittelfristig:**
8. **J6** (Skill-Trust-Tier), Golden/Snapshot (`syrupy`), Headless-Smoke, Last/Perf (optional).

---

## 10. Verzeichnisstruktur & Befehle

```text
planner/
├── api/tests/
│   ├── strategies.py                 # hypothesis-Generatoren (neu)
│   ├── test_compiler_properties.py   # INV-1…12 (neu)
│   ├── test_artifacts_golden.py      # syrupy (P2)
│   └── test_harness_schema.py        # vorhanden — Negativfälle erweitern
└── e2e/                              # NEU
    ├── playwright.config.ts          # Projekte: desktop + iphone15plus (430×932)
    ├── fixtures/seed.ts              # seedGate2Project(), verifyChecksums()
    ├── journeys/t0_parity.spec.ts … j7_iphone.spec.ts
    ├── a11y/axe.spec.ts
    └── __screenshots__/
```
```bash
# Backend
cd planner/api && pip install hypothesis syrupy   # KEIN jsonschema (schema_check ist intern)
pytest -q --cov=app --cov-report=term-missing
# E2E
cd planner && npm i -D @playwright/test @axe-core/playwright @lhci/cli && npx playwright install
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

---

## 11. Arbeitsauftrag an Claude Code

1. **Explore → Plan:** Status-Tabelle (§0) gegen den aktuellen Code re-validieren (Code ändert sich).
2. **P0 zuerst** (§9): E2E-Gerüst → T0/J2/J5 → INV-1/2/3/7/12. Diese schützen die jüngsten v0.9-Änderungen.
3. `schema_check` nur **erweitern** (dependency-frei), Event-/Key-Listen gegen aktuelle Doku pinnen.
4. **Verifikation (höchster Hebel):** Mutationsprobe je Invariante (künstlich brechen → Test rot → zurücknehmen); adversariale Review des Test-Diffs durch Subagent.

**Definition of Done v0.92:** §3 (P0-Invarianten) + §6 (T0, J2, J5 mind.) grün; E2E-Gerüst + iPhone-Projekt vorhanden;
Schema-Gate weiter blockierend; Mutationsprobe bestanden; iPhone-Screenshots + Lighthouse-A11y ≥95 im PR;
PR verlinkt diese Datei + den v0.9-Brief. Versionsstrings konsistent (Compiler/`package.json`/Changelog).

## Leitplanken (Reminder)
Deterministischen Kern exakt prüfen, LLM-Pfade nur über Eigenschaften · kein externes `jsonschema` ·
keine brüchigen Selektoren · Schema gegen offizielle Claude-Code-Doku verifizieren · keine 100%-Claims ·
kein „DACH" · keine Secrets in Fixtures.

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Versionsabhängiges gegen die aktuelle Claude-Code-Doku verifizieren (BP-MD §9).*
