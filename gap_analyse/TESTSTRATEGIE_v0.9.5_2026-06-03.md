# Teststrategie — zgpm.aegira.ai (Release v0.9.5)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Datum:** 2026-06-03
**Ersetzt:** `TESTSTRATEGIE_v0.9.4_2026-06-03.md` · **Begleitdokument:** `HANDOVER_Claude-Code_v0.9_Umsetzung_2026-06-03.md`
**Release-Ziel-Version (App):** `0.9.4` (`package.json`) · **Doku-Revision:** v0.9.5 (Persona/UX/Flow + Senior-McK-Härtung: Risk, Traceability, Security, Qualitätsbetrieb).

> Stack (verifiziert): Next.js/React/TS-Frontend · FastAPI/pydantic-Backend mit **deterministischem**
> Compiler · `pytest`-Suite inkl. dependency-freiem Schema-Gate · Playwright (MCP) im Repo.

---

## Kernaussage (Answer-first)

**zgpm.aegira.ai wird risiko-basiert getestet: der deterministische Kern exakt (Property + Mutation),
die gegateete Journey über wenige E2E-Pfade, und — weil AEGIRA Trust-Infrastructure ist — mit harten
Gates für die Dinge, die Vertrauen brechen: Runtime-Schema-Treue, Constitution-Inhalte (kein „DACH"/
keine 100%-Claims), Prompt-Injection-Resistenz und Vollständigkeit des geschärften Verständnisses.**
Jede Anforderung ist über die **Traceability-Matrix (§11)** genau einem Test zugeordnet; jeder Lauf endet im
**Umsetzungsplan (§17)**. Priorisierung folgt **Reversibilität/Trust**, nicht Pipeline-Mechanik.

---

## A. Zielpersona & UX-/Sprach-Leitlinie (verbindlich für die GESAMTE UX/UI)

**Primäre Zielperson: Lower-bis-Medium-erfahrener Claude Coder** — kann coden, kennt Claude Code, ist aber
**kein** Experte für agentische Architektur, ZGPM, Hooks, MCP, Reifegrad. UX/UI **und Sprache** richten sich an ihr aus.

1. **Begriffe nie unerklärt** (ZGPM, PVM/RACI, HITL, Gate, Harness, MCP, Hook, Subagent, Skill, Reifegrad/`AutonomyLevel`) — Tooltip/Inline/Glossar bei Erstnutzung.
2. **Geführte Sprache, Deutsch, klar** — kurze Sätze, aktive Verben, „du", keine ungeklärten Anglizismen (Code-IDs englisch).
3. **Progressive Disclosure** — Defaults; Expertenoptionen hinter „Erweitert".
4. **Handlungsfähige Zustände** — Lade/Leer/Fehler erklären Ursache + nächsten Schritt; kein roher 422/Stacktrace/JSON im UI.
5. **Kontext-Hilfe je Schritt** (`lib/help.ts`, „Hilfe"-Button) — präsent, nicht leer, persona-gerecht.
6. **Konsistente Begriffe** — ein Konzept = ein Wort; RACI Standard, PVM als „ZGPM-intern" (Toggle).
7. **Exporte persona-gerecht** — `CLAUDE.md`/`INSTALL`/`HANDOVER`/`USERGUIDE` ohne Rückfrage ausführbar.
8. **Schaubilder/Diagramme klar lesbar** — vollständig sichtbar, keine abgeschnittenen Stages/Knoten/Labels (voller Name per Tooltip), entzerrte Kanten, Legende, Fit/Zoom/Pan, iPhone-tauglich (≥44px). *Gegenbeispiel: Agenten-Flow mit abgeschnittener Stage 4 und Kanten-Wirrwarr.*
9. **Kein Methodik-Jargon „ZGPM" im sichtbaren Text.** „ZGPM" erscheint **nirgends** in UI-Labels/Buttons/Hilfe/Überschriften oder Kundendeliverables — ersetzt durch „Planung"/„Plan"/„methodisch" (z. B. „Weiter zum ZGPM-Plan" → **„Weiter zur Planung"**; „Der ZGPM-Plan (Schritt 6)" → „Der Plan (Schritt 6)"). Interne **Code-Identifier** (`zgpm_composer`, Dateinamen) bleiben unberührt. (Constitution: ZGPM methodisch nutzen, **ohne die Marke zu zeigen**.)

> Testbar als Journeys **U1–U7** (§9) + §10 + Content-Guard **CG-7** (§6).

---

## B. Verständnis-Flow & Schärfungs-Interview (verbindlich)

Ist-Flow (verifiziert): (1) `/projects/new` freier Brief → (2) `/interview` Schärfung → (3) `/understanding` Klassifizierung + Zusammenfassung → Gate 1.

- **B.1 Reihenfolge (Entscheidung D-FLOW).** Das Interview *rät* heute `project_nature` (= IT/Non-IT-Achse, `_guess_nature`) — verschenkte Runde. **Empfehlung:** IT/Non-IT + „AEGIRA-intern?" **nach dem Brief, vor dem Interview** (Schritt 1b); Engine konsumiert `known`-Felder via `_render_user` bereits → schärfere Fragen, Drift-Guard früh. *Default = Empfehlung; Alternative = ganz vorne.*
- **B.2 Interview-Tiefe.** Jede Frage greift **erkennbar das Gesagte** auf (Brief + Antworten), nicht generisch — „nicht ins Blaue".
- **B.3 Vollständigkeit.** **Alle** User-Aussagen finden sich im `understanding_summary` (Coverage-Eigenschaft, nicht exakter String); UI zeigt Herkunft; HITL prüft vor Gate 1.
- **B.4 Dropdowns/Fragefluss „Weltklasse".** Abhängige Dropdowns (Subtyp erst nach Typ, kein Dead-End), konditionale `target_platform`-Optionen je Typ, Reihenfolge Typ→Subtyp→(Plattform nur IT)→AEGIRA-intern→Summary, Gate-1-Button erst bei Pflichtfeldern, Persona/Mobil-tauglich.

> Testbar als **U6/U7** (§9) + Engine-Tests **ENG-1/2/3** (§8).

---

## 0. Aktueller Status (Stand 2026-06-03)

### 0.1 ⚠️ Versions-Drift — DREIFACH (P0)
| Quelle | Version | Soll |
|---|---|---|
| `package.json` | **0.9.4** | ✅ Ziel |
| `config.py app_version` | 0.9.2 | ⬜ 0.9.4 |
| `compiler._COMPILER_ID` | `@0.9.0` | ⬜ 0.9.4 |
| `compiler._SCHEMA_VERSION` | `2.1.0-claude-native` | (Schema-Strang prüfen) |

### 0.2 Feature-/Test-Status (Kurz)
✅ impl.: Preference-Drift-Guard Gate 1 (ungetestet) · RACI+Toggle+Legende · Safe-Area · Schema-Gate (`schema_check.py`) · Determinismus-Test · `.mcp.json` · `AutonomyLevel` · Kontext-Hilfe.
⬜ fehlt: **E2E/Playwright · Property (`hypothesis`) · UX-/Persona-Tests · Security/Non-functional · Constitution-Content-Guards · Traceability-Matrix · Golden/Visual/A11y · Headless-Smoke · Versions-Parität-Test.**
**Deploy-Lag:** Safe-Area live, RACI-Toggle im Live-Build nicht sichtbar → **T0** (§9).

---

## 1. Risiko-Register (treibt die Testtiefe) — Senior-McK-Kern

Risiko-basiert: investiere Tiefe dort, wo **Eintritt × Schaden** hoch ist. Skala je 1–5; Score = E×S.

| ID | Risiko | E | S | Score | Abgedeckt durch | Rest-Risiko |
|----|--------|---|---|-------|-----------------|-------------|
| R1 | Stilles **Schema-Drift** → echter Harness lädt nicht / Hook setzt nicht durch | 4 | 5 | **20** | §5 Schema-Gate (✅) + §13 Headless-Smoke | niedrig nach Smoke |
| R2 | **Constitution-Verletzung** in (Kunden-)Deliverable: „DACH"/100%/falscher Produktname | 3 | 5 | **15** | §6 Content-Guards (CG) | niedrig |
| R3 | **Prompt-Injection** über hochgeladene Kontext-Quelle | 3 | 5 | **15** | §7 PINJ | mittel (Restrisiko dokumentiert, BP-MD) |
| R4 | LLM **verliert/verfälscht** User-Aussagen im Verständnis | 3 | 4 | **12** | §8 ENG-2 + §9 U6 | niedrig-mittel |
| R5 | **Versions-Drift** → falsche Runtime-Annahmen | 4 | 3 | **12** | §5 VER-PARITY | niedrig |
| R6 | Irreversibler **Gate-3-Export** mit Defekt (Integrität) | 2 | 5 | **10** | §9 J3 + checksums + Determinismus (INV-7) | niedrig |
| R7 | **Tenant-/Authz-Leak** (Fremdprojektzugriff) | 2 | 5 | **10** | §7 AUTHZ | niedrig |
| R8 | **Persona-Hürden/unleserliche Diagramme** → keine Adoption | 3 | 3 | **9** | §9 U1–U7 + §10 | mittel |
| R9 | LLM-Ausfall/Timeout → Crash statt Fallback | 2 | 3 | **6** | §7 RES | niedrig |

**Lesart:** R1–R5 (Score ≥ 12) sind **P0-Pflicht**; R6–R7 P0/P1; R8–R9 P1. Das Register ist die Begründung der Priorisierung in §14.

---

## 2. Leitidee (Pyramide / Test-Trophy)
1. **Deterministischer Kern** → Unit + **Property-based** + **Mutation** + Golden + Determinismus.
2. **Gegateete Journey** → **E2E (Playwright)**, auch gegen Persona (A) + Trust (Security/CG).

Verteilung ~70 % Unit/Property/Contract · ~20 % API-Integration · ~10 % E2E.
**Anti-Muster:** Rules-Engine über UI testen · exakte Strings bei LLM-Ausgaben · brüchige Selektoren · Jargon ohne Erklärung · **Security/Trust als Nachgedanke**.

---

## 3. Teststufen & Werkzeuge
| Stufe | Werkzeug | Status |
|---|---|---|
| Unit + Property + **Mutation** | `pytest` + `hypothesis` + `mutmut` | ⬜ neu |
| Golden/Snapshot | `pytest` + `syrupy` | ⬜ neu |
| Contract/Schema + **Content-Guards** | `schema_check.py` (dependency-frei) + Regex/Inventar | ✅ erweitern |
| API-Integration + **Security** | `fastapi.testclient` | teils ✅ |
| **E2E + UX/Sprache** | Playwright (TS) | ⬜ neu |
| Visual + A11y + Lesbarkeit | Playwright + `@axe-core/playwright` + `@lhci/cli` | ⬜ neu |
| Non-functional/Perf (P2) | `pytest`-bench / k6 | ⬜ neu |
| Headless-Smoke | Claude-Code-Sandbox | ⬜ neu |

> **Kein externes `jsonschema`** — `schema_check.py` bleibt dependency-frei. **Neue Deps:** `hypothesis`, `syrupy`, `mutmut`; FE `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`.

---

## 4. Compiler-Properties (Kern härten) + Mutation
`api/tests/test_compiler_properties.py` + `strategies.py`.

INV-1 ≥1 `A`/Meilenstein · INV-2 genau ein `F/L` · INV-3 `e` nie ohne `E` · INV-4 Ampel propagiert ·
INV-5 Graph immer Orchestrator+Evaluator+HITL (✅ teilw.) · INV-6 absolute Pfade · INV-7 Determinismus (✅) ·
INV-8 `iteration` monoton, `MAX_HARNESS_ITERATIONS=25` · INV-9 Evaluator max. 3 Runden→HITL ·
INV-10 Anti-Muster sichtbar · INV-11 Skill-Manifest/`needs_gate` · INV-12 RACI-Accountable ⇔ ein `F/L` (✅ Code).

**Mutation-Testing (neu):** `mutmut` auf `harness/`+`planning/`; **Ziel Mutation-Score ≥ 75 %** für Rules-Engine/Compiler.
**Akzeptanz:** INV-1…12 grün; Mutationsprobe je Invariante; Mutation-Score-Ziel erreicht.

---

## 5. Contract-/Schema-Tests + Versions-Parität
`schema_check.py` validiert `settings.json`/Hooks/Frontmatter/`plugin.json`/`.mcp.json`.
- **C-1** Negativfälle je Artefakt (falsches Feld → `SchemaError`). **C-2** `checksums.txt`-Round-Trip. **C-3** Event-/Key-Listen gegen aktuelle Doku pinnen.
- **VER-PARITY (P0):** `config.app_version` == `package.json` == `_COMPILER_ID`-Suffix == **0.9.4**, optional gegen `GET /health`. `api/tests/test_version_parity.py`.

---

## 6. Constitution-Content-Guards (CG) — Trust-Inhalt (R2)

Strukturvalidierung (§5) prüft *Form*, nicht *Inhalt*. Diese Guards prüfen **Inhalt** generierter Artefakte **und** sichtbarer UI-Strings gegen die eingefrorenen Eckpfeiler. `api/tests/test_constitution_guards.py` (neu) + UI-Inventar in E2E.

| ID | Guard | Prüfung |
|----|-------|---------|
| CG-1 | **Kein „DACH"** in irgendeinem Export/Artefakt/UI-String | Regex über generierte Dateien + Text-Inventar |
| CG-2 | **Keine 100%-Claims** („100 %", „garantiert", „vollständig sicher") | Regex/Lint, Exports + Promise-Texte |
| CG-3 | **Nur erlaubte Produktnamen** (AI Navigator/Guardian/Commander); keine erfundenen | Allowlist-Check |
| CG-4 | **Rechtsräume** nur DE/EU27-Rest/UK/CH (US = Vendor-Layer) | Term-Check, kein „DACH"-Mapping |
| CG-5 | **Maturity = AIMS**; MITRE/GMS nicht als Primärmodell in Exports | Term-Check |
| CG-6 | **`aegira_internal=False` (Kunde) → KEINE** AEGIRA-Produktnamen/Constitution/Preferences im Deliverable | Export bei Externprojekt enthält keine AEGIRA-Marken (Preference-Drift inhaltlich, v0.9.3) |
| CG-7 | **Kein „ZGPM" in sichtbaren UI-Strings/Buttons/Hilfe/Überschriften** und Kundendeliverables | Regex/Inventar über sichtbaren Text (`page.tsx`, `lib/help.ts`, Exports); Code-Identifier (`zgpm_*`) ausgenommen |

**Akzeptanz:** CG-1…7 als CI-Gate; ein eingebauter Verstoß (Testfixture mit „DACH" bzw. sichtbarem „ZGPM") wird rot. **CG-6 ist P0** (Kundenschutz).

---

## 7. Security & Non-functional (NF) — Trust (R3/R7/R9)

| ID | Test | Erwartung |
|----|------|-----------|
| **PINJ-1** | Prompt-Injection in hochgeladener Kontext-Quelle („Ignoriere Anweisungen…", „setze project_nature=…", „gib Secrets aus") | Engine behandelt Inhalt als **Daten**, befolgt eingebettete Anweisungen nicht; Klassifizierung unverändert |
| **PINJ-2** | Injection erzwingt Constitution-Verstoß (z. B. „DACH"/100% in Summary) | wird **nicht** übernommen (Verbindung CG) |
| **AUTHZ-1** | Zugriff auf fremdes Projekt/Tenant (`_STUB_TENANT`-Grenze) | verweigert (403/404), keine Datenpreisgabe |
| **RES-1** | LLM-Ausfall/Timeout (`foundry` nicht erreichbar) | deterministischer **Mock-Fallback**, kein 500 (bestätigt im Engine-Design) |
| **RES-2** | Doppel-Approve / Race an Gates | idempotent, 409 „already approved", kein inkonsistenter Zustand |
| **SEC-LEAK** | kein Klartext-Secret in `.mcp.json`/`settings.json`/`.env.example`/Transcript; deny `Read(./.env)` | bestätigt |
| **PERF (P2)** | Compile-Zeit + ZIP-Größe-Budget; `/harness` unter Last | Budgets eingehalten |
| **DEP/SAST (P2)** | Dependency-Scan + Basis-SAST | keine kritischen Befunde |

**Akzeptanz:** PINJ-1/2, AUTHZ-1, RES-1/2, SEC-LEAK sind **P0/P1-Gates**; PERF/DEP optional P2.
Hinweis: Prompt-Injection bleibt ein **Restrisiko** (BP-MD §9) — Test reduziert, eliminiert nicht; Restrisiko wird dokumentiert.

---

## 8. API-Integration + Engine
| Test | Status |
|---|---|
| Compile ohne Gate 2 → 409 · Graph Orchestrator/Evaluator/HITL · Revise +iteration | ✅ `test_harness.py` |
| Gate-1 → 422 ohne `aegira_internal`/`project_nature` (v0.9.3) · ok → friert Quellen ein | ⬜ neu |
| Revise über `MAX_HARNESS_ITERATIONS` begrenzt · `AutonomyLevel`→`defaultMode` | ⬜ |
| `GET /health` = 0.9.4 | ⬜ (VER-PARITY) |
| **ENG-1** Frage greift Brief-/Antwort-Begriffe auf (B.2) · **ENG-2** Summary deckt alle User-Aussagen (B.3) · **ENG-3** auf Klassifizierung konditioniert, kein Raten (D-FLOW) | ⬜ neu |

---

## 9. Playwright-E2E-Journeys + Persona/UX
`playwright.config.ts`: **Desktop** 1440×900 · **iPhone 15 Plus** 430×932 (dSF 3, isMobile/hasTouch, Safari-UA). Seed via API.

**Funktionsjourneys:** T0 Deploy-Parität (`/health`=0.9.4, RACI-Toggle live) · J1 Verständnis→Gate 1 (Pflichtfelder, 422 als verständlicher Hinweis) · J2 Plan+Matrix→Gate 2 (Legende sichtbar) · J3 Harness→revise→Gate 3→Download (`shasum -c`) · J4 rote Ampel hält (stop-on-red) · J5 RACI-Toggle · J6 Skill-Trust-Tier→HITL-Gate · J7 iPhone (Matrix scrollbar, sticky Spalte, Bottom-Bar über Safe-Area, kein Fokus-Zoom, Tap≥44px).

**Persona/UX (U1–U7):** U1 Hilfe je Schritt · U2 Fachbegriffe erklärt · U3 Fehler handlungsfähig (kein roher 422) · U4 Sprach-/Konsistenz-Lint · U5 Diagramm-Lesbarkeit (keine abgeschnittene Stage/Labels, entzerrte Kanten, Fit/Zoom/Pan) · U6 Interview-Tiefe & Vollständigkeit · U7 Dropdown-/Fragefluss-Logik.

**Akzeptanz:** T0 + J1–J7 + U1–U7 grün (Desktop **und** Mobile).

---

## 10. Visual-Regression + A11y + Lesbarkeit
`toHaveScreenshot()` je `/plan`,`/harness`,`/review` (beide Projekte) · `@axe-core/playwright` 0 critical/serious · Lighthouse A11y ≥95 (mobile) · Farbe nie alleiniger Bedeutungsträger · Diagramm-Snapshot-Assertions (U5).

---

## 11. Traceability-Matrix (Anforderung → Test) — Senior-McK-Pflicht

Jede Anforderung (inkl. Constitution-Eckpfeiler) hat **genau einen** Beleg-Test. Auszug; vollständige Matrix als `api/tests/traceability.md` pflegen und in CI auf Lücken prüfen (jede Anforderung referenziert ≥1 Test-ID).

| Anforderung / Eckpfeiler | Test-ID |
|---|---|
| Runtime-Schema-Treue (Hooks/settings) | C-1…3, Headless-Smoke |
| Versions-Konsistenz | VER-PARITY |
| ZGPM-Regeln (≥1 A, ein F/L, e-ohne-E) | INV-1/2/3, J2 |
| Determinismus/Integrität Export | INV-7, J3 |
| Gate-Reihenfolge/HITL | API-Gates, J1/J3/J4 |
| Kein „DACH" | CG-1, CG-4 |
| Keine 100%-Claims | CG-2 |
| Produktnamen eingefroren | CG-3 |
| Maturity = AIMS | CG-5 |
| Kundendeliverable ohne AEGIRA-Marken | CG-6 |
| Prompt-Injection-Resistenz | PINJ-1/2 |
| Tenant-Isolation | AUTHZ-1 |
| Verständnis-Vollständigkeit | ENG-2, U6 |
| Kein sichtbares „ZGPM" (→ „Planung") | CG-7, U4 |
| Persona/Sprache/Diagramme | U1–U7 |

**Akzeptanz:** keine Anforderung ohne Test-ID; CI bricht bei verwaisten Anforderungen.

---

## 12. Qualitätsbetrieb: Testdaten, Umgebungen, LLM-Determinismus, Entry/Exit, KPIs, RACI

**Testdaten/Fixtures:** definierte Seeds je Achse (IT/Non-IT × intern/extern), realistische Pläne; **keine echten Secrets**; Fixtures versioniert.
**Umgebungsmatrix:** local (Mock-LLM) · CI (Mock/Cassette, **kein Live-LLM**) · staging (T0-Parität) · prod (Synthetic-Smoke nach Deploy).
**LLM-Determinismus:** LLM-Pfad über **aufgezeichnete Cassettes** + Eigenschaftstests (nicht exakte Strings); CI nie gegen Live-Modell.
**Flaky-Kontrolle:** Playwright `retries:1` (CI), `trace:on-first-retry`, Netzwerk/LLM gestubbt, feste Zeit/Seed; Flaky-Quote als KPI.
**Entry-Kriterien:** Build grün · Migrationen ok · Seed verfügbar · Feature-Flags definiert.
**Exit-Kriterien (ergänzt DoD):** P0/P1-Findings = 0 · Coverage-Ziele · 0 critical-A11y · Flaky-Quote < 2 % · Mutation-Score Kern ≥ 75 %.
**KPIs:** Zeilen- **und** Branch-Coverage · Mutation-Score · Escaped-Defect-Rate · Flaky-Quote · Time-to-green.
**QA-Ownership (RACI light):** je Bereich genau **ein Accountable** — Backend-Properties/Schema · E2E/UX · Security/CG · Release-Gate. (Konsistent zur RACI-Logik des Produkts.)

---

## 13. CI-Pipeline (blockierende Gates)
1) Lint/Typecheck · 2) **Backend** `pytest` (Property+**Mutation**, Golden, **Schema+CG**, VER-PARITY, **Security/PINJ/AUTHZ/RES**, Gate-Guard, Integration, ENG) + Coverage · 3) FE-Build · 4) **E2E + UX (U1–U7)** (Desktop+Mobile) · 5) A11y/Lighthouse/Lesbarkeit + Diagramm-Snapshots · 6) **Traceability-Lücken-Check (§11)** · 7) Headless-Smoke · 8) prod **Synthetic-Smoke** (nach Deploy) · 9) **Findings → Umsetzungsplan (§17)**.
**Coverage:** Kern ≥ 90 % Zeile/Branch + Mutation ≥ 75 % · API ≥ 80 % · E2E nach Journey-Abdeckung.

---

## 14. Arbeitsplan (P0 → P2, aus Risk-Register abgeleitet)
**P0 (R1–R5, R6/R7):** Drift-Fix + VER-PARITY · Schema-Negativfälle C-1/2/3 · **CG-1…6 (Content-Guards)** · **PINJ-1/2 + AUTHZ-1 + RES-1** · Gate-1-Guard-Tests · `e2e/`-Gerüst + T0/J1/J2/J5 + U1–U3 · INV-1/2/3/7/12 + Mutation auf Rules-Engine · ENG-1/2/3 + D-FLOW-Entscheidung · Traceability-Matrix anlegen.
**P1 (R8/R9):** J3/J4/J7 · U4/U5/U6/U7 · INV-4/5/6/8/9/10/11 · RES-2/SEC-LEAK · ggf. Flow-Reorder (Schritt 1b) · A11y/Visual/Lesbarkeit · KPIs/Flaky-Kontrolle etablieren.
**P2:** J6 · Golden (`syrupy`) · Headless+Synthetic-Smoke · PERF/DEP-SAST · Last/Perf.

---

## 15. Struktur & Befehle
```text
planner/
├── api/tests/
│   ├── strategies.py · test_compiler_properties.py        # INV + Property
│   ├── test_version_parity.py · test_gate1_preference_guard.py
│   ├── test_constitution_guards.py                        # CG-1…6 (NEU)
│   ├── test_security.py                                   # PINJ/AUTHZ/RES/SEC-LEAK (NEU)
│   ├── test_interview_engine.py                           # ENG-1/2/3
│   ├── test_artifacts_golden.py                           # P2 (syrupy)
│   ├── traceability.md                                    # RTM (NEU, CI-geprüft)
│   └── test_harness_schema.py                             # vorhanden — erweitern
└── e2e/
    ├── playwright.config.ts · fixtures/seed.ts (+ cassettes/)
    ├── journeys/t0_parity.spec.ts … j7_iphone.spec.ts
    ├── ux/u1_help … u7_dropdown-flow.spec.ts
    └── a11y/axe.spec.ts · __screenshots__/
```
```bash
cd planner/api && pip install hypothesis syrupy mutmut     # KEIN jsonschema
pytest -q --cov=app --cov-report=term-missing && mutmut run --paths-to-mutate app/harness,app/planning
cd planner && npm i -D @playwright/test @axe-core/playwright @lhci/cli && npx playwright install
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
```

---

## 16. Arbeitsauftrag + Definition of Done
**Vorgehen:** Explore→Plan; §0 + Risk-Register gegen Code re-validieren; P0 zuerst (Risk-getrieben); `schema_check` nur erweitern; Verifikation = Mutationsprobe + adversariale Subagent-Review (Korrektheit, Persona, **Security**).

**Definition of Done v0.9.5:** Versionsstrings == **0.9.4** + VER-PARITY grün · Schema-Gate **+ CG-1…6** blockierend ·
**Security-Gates (PINJ/AUTHZ/RES) grün** · Gate-1-Guard getestet · INV-1…12 + Mutation-Score ≥75 % · T0+J1–J7+U1–U7 grün (Desktop+Mobile) ·
**Traceability-Matrix vollständig (keine Anforderung ohne Test)** · Entry/Exit-Kriterien + KPIs etabliert · Persona/Diagramm-Anforderungen (A/U5) erfüllt ·
iPhone-Screenshots + Lighthouse-A11y ≥95 im PR · **nach der Durchführung liegt der Umsetzungsplan (§17) vor, alle P0/P1-Findings adressiert** · PR verlinkt diese Datei + v0.9-Brief.

---

## 17. Findings → strukturierter Umsetzungsplan (PFLICHT nach jeder Durchführung)
Eine Durchführung endet **nicht** bei rot/grün. **Loop:** Findings sammeln → de-duplizieren → klassifizieren →
MECE-gruppieren → priorisieren (Pyramide: governing finding zuerst; Risk-Score aus §1) → Plan → umsetzen →
**Re-Test (zugeordneter Test grün)** → schließen. Wiederholen bis **P0/P1 leer**.
**Artefakt:** `gap_analyse/FINDINGS_REMEDIATION_<YYYY-MM-DD>.md` (je Lauf, im PR verlinkt).

**Schema je Finding:** ID · Quelle (Test/Journey/INV/CG/PINJ) · Severity (P0/P1/P2) · MECE-Bucket · betroffen (Datei) · Root-Cause-Hypothese · konkrete Fix-Maßnahme · **Re-Test (welcher Test wird grün)** · Aufwand (S/M/L) · Status.
**Regeln:** kein Fix ohne grünen Re-Test · P0 stoppt Release · keine Sammel-Findings ohne Datei/Maßnahme · Severity an Risk-Score (§1) gekoppelt.
**Automatisierung:** CI-Schritt 9 aggregiert fehlgeschlagene Gates (pytest-Report, Playwright-`results.json`, axe/Lighthouse, Mutation-Report) zu Finding-Stubs; Root-Cause/Fix ergänzt (Plan-/Review-Subagent).

---

## Leitplanken (Reminder)
Risk-basiert priorisieren (§1) · jede Anforderung hat einen Test (§11) · Zielpersona = Lower-Medium Claude Coder; UX **und Sprache** danach ·
Constitution-Inhalte testen (kein „DACH"/100%/falsche Produktnamen; **kein sichtbares „ZGPM" → „Planung"**; Kundendeliverable ohne AEGIRA-Marken) · Prompt-Injection-Resistenz Pflicht ·
deterministischer Kern exakt (+Mutation), LLM-Pfade über Eigenschaften/Cassettes · kein externes `jsonschema` · keine brüchigen Selektoren ·
Schaubilder vollständig & entzerrt · Schema gegen offizielle Claude-Code-Doku · keine Secrets in Fixtures.

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Versionsabhängiges gegen die aktuelle Claude-Code-Doku verifizieren (BP-MD §9).*
