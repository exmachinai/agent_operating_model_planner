# Teststrategie — zgpm.aegira.ai (Release v0.9)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Datum:** 2026-06-03
**Begleitdokument:** `gap_analyse/HANDOVER_Claude-Code_v0.9_Umsetzung_2026-06-03.md` (v0.9-Brief)
**Umsetzbar in Claude Code** — jede Sektion hat Dateipfade, Befehle und Akzeptanzkriterien.

> Stack (verifiziert): Next.js/React/TypeScript-Frontend · FastAPI/pydantic-Backend mit
> **deterministischem** Plan→Harness-Compiler · bestehende `pytest`-Suite · Playwright im Repo.

---

## 1. Leitidee (Pyramid / Test-Trophy)

Die App hat zwei grundverschiedene Hälften — jede braucht eine andere führende Methode:

1. **Deterministischer Kern** (Compiler, ZGPM/PVM-Rules-Engine, YAML-Emit): rein, LLM-frei,
   „gleicher Plan → gleicher ZIP-Hash". → **Unit + Property-based + Golden + Determinismus.**
2. **Gegateete User-Journey** (Gate 1→2→3, Plan/RACI-Edit, HITL, Export): Mehrschritt-Fluss.
   → **End-to-End mit Playwright** auf wenigen kritischen Pfaden.

Verteilung (Richtwert): **~70 % Unit/Property/Contract · ~20 % API-Integration · ~10 % E2E.**
Viele schnelle Tests am Kern, wenige hochwertige E2E für Vertrauen — nicht „alles E2E".

**Anti-Muster (verboten):** Rules-Engine über die UI testen · exakte Strings bei LLM-Ausgaben
assert-en (der Compiler ist deterministisch → exakt; LLM-Pfade → Eigenschaften/Constraints prüfen) ·
brüchige CSS-Selektoren (nur `getByRole`/`data-testid`).

---

## 2. Teststufen, Werkzeuge, Geltungsbereich

| Stufe | Was | Werkzeug | Ort | Geschwindigkeit |
|---|---|---|---|---|
| Unit + Property | Compiler-Invarianten, Rules-Engine, Slugify, YAML | `pytest` + **`hypothesis`** | `api/tests/` | ms |
| Golden/Snapshot | erzeugte Datei-Inhalte (CLAUDE.md, agent.md, YAML) | `pytest` + `syrupy` | `api/tests/` | ms |
| Contract/Schema | generierte Artefakte (settings.json, Hooks, .mcp.json, Frontmatter) | `pytest` + `jsonschema` | `api/tests/schema/` | ms |
| API-Integration | Gate-Enforcement, Revise, Approve, Download | `pytest` + `fastapi.testclient` | `api/tests/` | ms–s |
| **E2E (führend für Funktionalität)** | kritische Journeys über echte UI | **Playwright (TS)** | `e2e/` | s |
| Visual + A11y | iPhone 15 Plus, Safe-Area, Kontrast, ARIA | Playwright + `@axe-core/playwright` + Lighthouse-CI | `e2e/` | s |
| Nicht-funktional (P2) | Last auf `/harness`-Compile, ZIP-Größe | `pytest`-Benchmark / k6 (optional) | `perf/` | min |

**Neue Abhängigkeiten:** Backend `hypothesis`, `jsonschema`, `syrupy` (pytest). Frontend
`@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.

---

## 3. Compiler-Properties (Kern — höchster ROI)

Property-based mit `hypothesis`: ein Strategie-Generator baut **gültige Pläne** (Phasen, Streams,
Meilensteine, PVM-Rollen, Risiken) und prüft Invarianten über tausende Varianten statt Einzelfälle.

**Datei:** `api/tests/test_compiler_properties.py` (neu) · Generator in `api/tests/strategies.py`.

| ID | Invariante (Property) | Quelle |
|---|---|---|
| INV-1 | Jeder Meilenstein hat **≥ 1 `A`** | `schemas/plan.py`, `PlanViews.RaciMatrix` |
| INV-2 | Jeder Meilenstein hat **genau ein `F`/`L`** | docs/01 |
| INV-3 | `e` kommt **nie ohne `E`** vor | docs/01 |
| INV-4 | Risiko-Ampel **propagiert nach oben** (MRL→Meilenstein→Projekt); rot bleibt rot | `zgpm_composer` |
| INV-5 | Graph enthält **immer** Orchestrator, Evaluator und HITL-Knoten | `test_harness.py` (bestätigt) |
| INV-6 | Alle Pfade im Harness sind **absolut** ab `$HARNESS_ROOT` (keine relativen) | docs/04, `templates` |
| INV-7 | **Determinismus:** gleicher Plan → bit-identischer `zip_sha256` (zweimal kompilieren) | `compiler` Docstring |
| INV-8 | `iteration` ist streng monoton; **`MAX_HARNESS_ITERATIONS = 25`** wird nie überschritten | `schemas/harness.py` |
| INV-9 | Reviewer/Evaluator-Optimizer: **max. 3 Runden**, dann HITL-Knoten | docs/04 |
| INV-10 | Anti-Muster werden als Findings sichtbar: `anti.ueber-spawning` (>5 parallel), `anti.vage-delegation`, `anti.fehlender-checkpoint`, `harness.kein-evaluator` | `compiler._detect_anti_patterns` |
| INV-11 | Skill-Manifest nur bei gewählten Katalog-Skills; `community`/`experimental` + skripttragende Skills → `needs_gate` | `schemas/harness.py` |
| INV-12 | RACI-Mapping ist verlustfrei umkehrbar auf der **Accountable-Achse**: genau ein `F/L` ⇔ genau ein `A`(RACI) | v0.9 D2/D3 |

**Beispiel (Pseudocode):**
```python
@given(plan=valid_plans())
def test_inv2_exactly_one_F_or_L(plan):
    graph = compile_graph(project_for(plan), plan)
    for m in plan.milestones:
        fl = [r for r in m.responsibilities if r.code in ("F", "L")]
        assert len(fl) == 1

@given(plan=valid_plans())
def test_inv7_determinism(plan):
    a = build_zip(project_for(plan), plan)
    b = build_zip(project_for(plan), plan)
    assert a.zip_sha256 == b.zip_sha256
```
**Akzeptanz:** INV-1…12 als eigene Tests grün; ein bewusst eingebauter Regel-Bruch lässt den
zugehörigen Test rot werden (Mutationsprobe).

---

## 4. Contract-/Schema-Tests (sichert v0.9 P0.4)

Jeder **generierte** Artefakttyp validiert gegen ein hinterlegtes JSON-Schema. Schließt die
P0-Schema-Lücke (Hooks/settings.json) ab und verhindert, dass „erfundene" Felder durchrutschen.

**Dateien:** `api/tests/schema/test_artifacts_schema.py`, Schemata unter `api/tests/schema/_schemas/`.

| Artefakt | Prüfung |
|---|---|
| `.claude/settings.json` | gegen Claude-Code-Settings-Schema (offizielle Doku als Referenz) |
| `.claude/hooks/*` bzw. `hooks`-Block | Events `PreToolUse/PostToolUse/Stop`, Matcher, Exit-Code-2-Semantik |
| `.claude/agents/*.md` | Frontmatter `name`/`description`/`model`/`tools` vorhanden & valide |
| `.mcp.json` | nur `${ENV}`-Referenzen, kein Klartext-Secret, Transport `http`/`stdio` |
| `plugin.json` | `name`/`version`/`agents`/`commands` konsistent zur Agentenliste |
| `checksums.txt` | jede gelistete Datei existiert, Hash stimmt (Round-Trip) |

**Akzeptanz:** `pytest api/tests/schema` grün; CI-**Gate** (blockierend). Ein falsches Feld → rot.

---

## 5. API-Integrationstests (Gate-Logik)

Auf `fastapi.testclient` (Fixtures `client`, `gate2_project` aus `conftest.py` bestehen bereits).

| Test | Erwartung | Endpoint |
|---|---|---|
| Compile ohne Gate 2 | **409** | `POST /v1/projects/{id}/harness` |
| Plan generieren | 201, ZGPM-konform | `POST /v1/projects/{id}/plan` |
| Plan freigeben (Gate 2) | Projektstatus „freigegeben" | `POST /v1/projects/{id}/approve-plan` |
| Revise sequence/parallel/agent/skill | `iteration`+1, Graph ändert sich | `POST …/harness/revise` |
| Harness freigeben (Gate 3) | `status=compiled`, `zip_sha256` gesetzt | `POST …/harness/approve` |
| Download | gültiges ZIP, `checksums.txt` ok | `GET …/harness/download` |
| Revise über `MAX_HARNESS_ITERATIONS` | sauber begrenzt (kein Endlos) | `POST …/harness/revise` |
| Skill-Registry release/block | Freigabe übersteuert Default-Tier | `skills`-Router |

**Akzeptanz:** alle grün; Gate-Übergänge nur in zulässiger Reihenfolge möglich.

---

## 6. Playwright-E2E-Journeys (führend für Funktionalität)

**Setup.** `e2e/playwright.config.ts` mit zwei Projekten: **Desktop** (1440×900) und
**Mobile iPhone 15 Plus** (custom device: `viewport {width:430,height:932}`, `deviceScaleFactor:3`,
`isMobile:true`, `hasTouch:true`, Safari-UA). `baseURL` aus `PLAYWRIGHT_BASE_URL`
(lokal `http://localhost:3000`, sonst Staging). **Locator-Politik:** `getByRole`/`getByText`;
für stabile Anker `data-testid` im UI ergänzen (Teil der Umsetzung).

**Test-Daten:** Seed-Projekt über die API anlegen (`request.post('/v1/projects', …)` →
`/plan` → `/approve-plan`), nicht per UI-Klickstrecke — UI-Journeys starten vom definierten Zustand.

| ID | Journey | Schritte (Route) | Kern-Assertions |
|---|---|---|---|
| **J1** | Projekt → Verständnis → Gate 1 | `projects/new` → `…/understanding`/`interview` | Gate-1-Badge „✓"; Weiter-Button erst nach Pflichtfeldern aktiv |
| **J2** | Plan + PVM/RACI → Gate 2 | `…/plan` | Matrix rendert; **Code-Legende sichtbar (P0.1)**; Konsistenz-✓/⚠ korrekt; „Review & Freigabe (Gate 2)" setzt Status |
| **J3** | Harness bauen → revise → Gate 3 → Download | `…/harness` | Orchestrator+Evaluator+HITL-Knoten sichtbar; revise erhöht Iteration; Findings sichtbar; Gate-3-Freigabe → Download-ZIP; **`shasum -c checksums.txt` = OK** |
| **J4** | HITL / rote Ampel hält Lauf | `…/review` | rote Ampel → Lauf pausiert, HITL-Freigabe gefordert (stop-on-red sichtbar) |
| **J5** | RACI-Toggle + Legende (D2/D3) | `…/plan` | Toggle „RACI ⇄ PVM" ändert nur Labels; „genau ein Accountable" = „genau ein F/L"; Konsistenz unverändert |
| **J6** | Skill-Repository / Trust-Tier | `…/harness` bzw. `admin` | `community`/`experimental` + skripttragend → HITL-Gate; Manifest enthält `trust_tier`/`content_sha256` |
| **J7** | iPhone 15 Plus – Bedienbarkeit | alle obigen Routen, Mobile-Projekt | Matrix horizontal scrollbar, Meilenstein-Spalte sticky; Bottom-Bar nicht vom Home-Indicator verdeckt (Safe-Area, P0.5); kein Fokus-Zoom (16px-Inputs); Tap-Ziele ≥44px |

**Beispiel (J3, gekürzt):**
```ts
test("J3 compile → approve → download integrity", async ({ page, request }) => {
  const id = await seedGate2Project(request);          // API-Setup
  await page.goto(`/projects/${id}/harness`);
  await page.getByRole("button", { name: /kompilieren|harness bauen/i }).click();
  await expect(page.getByText(/orchestrator/i)).toBeVisible();
  await page.getByRole("button", { name: /freigabe|gate 3/i }).click();
  const dl = await page.waitForEvent("download");
  // ZIP entpacken + checksums.txt prüfen (Node fs/child_process im Test)
  expect(await verifyChecksums(await dl.path())).toBe(true);
});
```
**Akzeptanz:** J1–J7 grün auf Desktop **und** Mobile-Projekt; Downloads-Integrität verifiziert.

---

## 7. Visual-Regression + Barrierefreiheit

- **Visual:** `await expect(page).toHaveScreenshot()` je Schlüsselansicht (`/plan`, `/harness`, `/review`)
  in beiden Projekten; Baselines unter `e2e/__screenshots__/`. iPhone-Baselines bei 430×932.
- **A11y:** `@axe-core/playwright` (`AxeBuilder`) je Route — **0 critical/serious** Violations.
- **Lighthouse:** `@lhci/cli` — **A11y ≥ 95** auf `/plan`, `/harness`, `/review` (mobile preset).
- **Pflicht:** Farbe nie alleiniger Bedeutungsträger (Ampel/RACI zusätzlich Symbol/Label) wird per Axe + Review geprüft.

---

## 8. CI-Pipeline (blockierende Gates)

`.github/workflows/test.yml` — Stufen, jede blockierend:

1. **Lint/Typecheck** (`ruff`/`mypy`, `eslint`/`tsc`).
2. **Backend** `pytest -q` inkl. Property-, Golden-, Schema-, Integrationstests + Coverage-Gate.
3. **Build** Frontend.
4. **E2E** `npx playwright test` (Desktop + Mobile), Trace/Screenshot-Artefakte bei Fehlern.
5. **A11y/Lighthouse** (mobile preset).
6. **(P2) Headless-Smoke:** exportierten Harness in Claude-Code-Sandbox `--permission-mode dontAsk`
   laden (Agenten/Hooks laden fehlerfrei) — v0.9 P2.9.

**Coverage-Ziele:** Compiler/Rules-Engine/Schemas **≥ 90 %**; restliche API **≥ 80 %**; E2E nach Journey-Abdeckung (J1–J7), nicht nach Zeilen.

---

## 9. Mapping auf den v0.9-Brief (P0 → P2)

| v0.9-Aufgabe | Absichernder Test |
|---|---|
| P0.1 Legende | J2, J5 (Legende sichtbar/ohne Hover) |
| P0.2/P0.3 Hook-/settings-Schema | §4 Contract/Schema-Suite |
| P0.4 Schema-Gate | §4 als CI-Gate |
| P0.5 Safe-Area | J7 + Visual (iPhone) |
| P1.2 `.mcp.json` | §4 (`${ENV}`, kein Secret) |
| P1.5 Reifegrad-Selektor | §5 (Modus je Stufe) + J3 |
| P1.6 Irreversibilitäts-Flag | INV-10/§5 (HITL erzwungen) |
| P1.8/P1.9 RACI | J5 + INV-12 |
| P1.10–P1.13 mobile UX/A11y | J7 + §7 |
| P2.11 Determinismus | INV-7 |

---

## 10. Verzeichnisstruktur (umsetzbar in Claude Code)

```text
planner/
├── api/tests/
│   ├── strategies.py                 # hypothesis-Generatoren für gültige Pläne
│   ├── test_compiler_properties.py   # INV-1…12
│   ├── test_artifacts_golden.py      # syrupy-Snapshots der Datei-Inhalte
│   └── schema/
│       ├── _schemas/*.json
│       └── test_artifacts_schema.py  # Contract-Tests (P0.4)
└── e2e/
    ├── playwright.config.ts          # Projekte: desktop + iphone15plus (430×932)
    ├── fixtures/seed.ts              # seedGate2Project(), verifyChecksums()
    ├── journeys/j1_understanding.spec.ts … j7_iphone.spec.ts
    ├── a11y/axe.spec.ts
    └── __screenshots__/
```

**Befehle:**
```bash
# Backend
cd planner/api && pip install -r requirements-dev.txt   # + hypothesis jsonschema syrupy
pytest -q --cov=app --cov-report=term-missing
# E2E
cd planner && npm i -D @playwright/test @axe-core/playwright @lhci/cli && npx playwright install
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

---

## 11. Arbeitsauftrag an Claude Code (Reihenfolge)

1. **Explore → Plan:** bestehende Suite lesen (`api/tests/conftest.py`, `test_harness*.py`), Lücken vs. §3–§7 notieren.
2. **P0-Sicherung zuerst:** §4 Contract-Suite + INV-7 (Determinismus) + J2 (Legende) — sie schützen die riskantesten v0.9-Änderungen.
3. `strategies.py` + `test_compiler_properties.py` (INV-1…12).
4. `e2e/`-Gerüst + `playwright.config.ts` (Desktop + iPhone 15 Plus) + `fixtures/seed.ts`.
5. Journeys J1–J7, dann A11y/Visual (§7).
6. CI-Workflow (§8) mit blockierenden Gates.
7. **Verifikation (höchster Hebel):** Mutationsprobe — je eine Invariante künstlich brechen, prüfen dass der passende Test rot wird; danach zurücknehmen. Adversariale Review des Test-Diffs durch Subagent.

**Definition of Done:** §3–§8 implementiert; alle Gates grün; Mutationsprobe bestanden;
iPhone-15-Plus-Screenshots + Lighthouse-A11y ≥95 im PR; Coverage-Ziele erreicht; PR verlinkt diese Datei + den v0.9-Brief.

## Leitplanken (Reminder)
Deterministischen Kern exakt prüfen, LLM-Pfade nur über Eigenschaften · keine brüchigen Selektoren ·
keine Schema-Felder raten (offizielle Claude-Code-Doku als Referenz) · keine 100%-Claims · kein „DACH" ·
keine Secrets in Testdaten/Fixtures.

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Versionsabhängiges gegen die aktuelle Claude-Code-Doku verifizieren.*
