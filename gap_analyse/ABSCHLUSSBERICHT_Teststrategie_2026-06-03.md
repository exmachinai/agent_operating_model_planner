# Abschlussbericht — Teststrategie v0.9.5 (P0 + P1 + P2)

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` · **Datum:** 2026-06-03
**Grundlage:** `gap_analyse/TESTSTRATEGIE_v0.9.5_2026-06-03.md`
**Begleitend:** `gap_analyse/FINDINGS_REMEDIATION_2026-06-03.md` · `planner/api/tests/traceability.md`

---

## Kernaussage (Answer-first)

**Die risiko-priorisierte Teststrategie ist über P0, P1 und P2 umgesetzt und auf `main` gemergt.
Die Backend-Suite wuchs von 76 auf 117 grüne Tests (0 xfailed). Drei reale Findings wurden im
selben Zug behoben (Versions-Drift, Marken-Leak in Kundendeliverables, Gate-3-Idempotenz);
ein vierter Punkt ist als by-design dokumentiert. E2E (Playwright) ist als isoliertes,
lauffähiges Gerüst inkl. T0-Parität gelegt; die UI-Journeys/Personas und die mutmut-Vollkampagne
sind als CI-/Folgearbeit klar umrissen.** Jede P0-Anforderung ist über die Traceability-Matrix
genau einem Test zugeordnet.

---

## 1. Umfang & Methode

- **Stack (verifiziert):** FastAPI/pydantic-Backend mit deterministischem Compiler; Next.js-Frontend.
- **Lokaler Lauf:** `planner/api/.venv/bin/python -m pytest` (Python 3.12.13, pytest 9.0.3).
- **CI-Gates (alle grün):** Backend-pytest+Schema-Gate · Frontend tsc/eslint · CodeQL (3×).
- **Verfahren:** Explore→Plan→Implement; jeder Test sofort lokal grün, dann CI; Findings im
  §17-Loop (sammeln → fixen → grüner Re-Test → schließen).
- **PRs:** #62 (P0) · #63/#64 (CG-6-Schärfung/Fix) · #65 (P1+P2).

## 2. Ergebnisse je Stufe

### P0 (Risiko R1–R7) — vollständig
| Bereich | Datei | Tests |
|---|---|---|
| Versions-Parität | `test_version_parity.py` | 5 |
| Gate-1-Guard + Preference-Drift | `test_gate1_preference_guard.py` | 4 |
| Constitution-Guards CG-1/2/3/5/6 | `test_constitution_guards.py` | 7 |
| Security PINJ/AUTHZ/RES-1 | `test_security.py` | 5 |
| Compiler-Determinismus INV-7 + Struktur | `test_compiler_properties.py` | 4 |

### P1 — umgesetzt (Backend) + E2E-Gerüst
| Bereich | Datei | Inhalt |
|---|---|---|
| Erweiterte Invarianten | `test_invariants_extended.py` | INV-8 (Iterations-Cap 409), INV-6 (absolute Pfade), INV-10 (Anti-Muster), INV-4 (stop-on-red), INV-11 (Skill-Manifest/Trust-Tier) |
| Resilienz + Secret-Leak | `test_resilience_secleak.py` | RES-2 (Doppel-Approve alle Gates), SEC-LEAK (keine Klartext-Secrets, `deny Read(./.env)`, MCP nur `${ENV}`) |
| E2E (Playwright) | `planner/e2e/` | T0-Parität + Smoke **lauffähig** (Desktop 1440×900 + iPhone 15 Plus); Seed-Helper; J1–J7/U1–U7 als Backlog |

### P2 — umgesetzt / konfiguriert
| Bereich | Artefakt | Status |
|---|---|---|
| Property-based | `test_property_hypothesis.py` (hypothesis) | ✅ grün |
| Golden/Snapshot | `test_golden_structure.py` + `__snapshots__/` (syrupy) | ✅ grün |
| Mutation-Testing | `setup.cfg` (mutmut, Compiler-Kern) | ⚙️ konfiguriert — Vollkampagne als CI-Job |

**Suite-Wachstum:** 76 → **117 passed, 0 xfailed**. Neue Dev-Deps gepinnt
(`hypothesis`, `syrupy`, `mutmut`); kein externes `jsonschema` (Schema-Gate bleibt dependency-frei).

## 3. Findings & Behebung (§17)

| ID | Risk | Severity | Befund | Behebung | Re-Test |
|---|---|---|---|---|---|
| **F-VER** | R5 | P0 → ✅ | Versions-Drift: `app_version=0.9.2`, `_COMPILER_ID=@0.9.0` vs `package.json=0.9.4` | beide auf `0.9.4` | `test_version_parity` |
| **F-CG6** | R2 | P0 → ✅ | Kundendeliverable (extern) trug interne Produktnamen + AEGIRA-Scaffold-Branding | bei `apply_preferences=False` markenfrei: keine Produktnamen, Namespace `agent-harness`, neutrale Attribution. **„AEGIRA" als Plattformname bleibt (Positivliste).** | `test_cg6_*` (3) |
| **F-RES2** | R9 | P1 → ✅ | Gate 3 ohne Doppel-Approve-Schutz (nicht idempotent) | 409-Guard `gate3_approved_at` | `test_res2_gate3_*` |
| **F-INV7** | R1/R6 | P3 — doku | Re-Compile bit-identisch außer Audit-Zeitstempel | by-design (Provenance); Test prüft „modulo Zeitstempel" | `test_inv7_compile_reproducible_*` |
| **F-INV9** | R1 | P2 — doku | „Evaluator max. 3 Runden" ist Prompt-Constraint, nicht API-enforced | bewusst in Agent-Missionen/Skills, nicht in der API-Schicht | — |

## 4. Restrisiko / offen

- **E2E-Journeys (J1–J7) + Persona (U1–U7) + A11y/Visual** sind als Backlog mit Seed-Helper gelegt,
  brauchen aber stabile `data-testid`-Selektoren im Frontend und einen laufenden App-Stack im CI.
- **mutmut-Vollkampagne** (Score-Gate ≥75 %) ist konfiguriert, aber als CI-Job zu fahren
  (je Mutant ein pytest-Lauf — nicht interaktiv).
- **AUTHZ** ist gegen den Stub-Tenant getestet; echte Multi-Tenancy ist Phase-2.
- **Deploy-Lag:** Die Fixes (CG-6, Gate-3, Versions-Default) sind auf `main`, aber **noch nicht in Prod**
  (läuft auf `v0.9.7-28`).

## 5. Handlungsempfehlungen (priorisiert)

1. **Sofort — Deploy `v0.9.8`** (P0-Wirkung): damit externe Kunden markenfreie Deliverables und
   Gate-3-Idempotenz **live** erhalten. Build zieht von MCR (Docker-Hub-frei).
2. **CI härten (P1):** `Backend`-Job um Coverage-Schwelle ergänzen; eigenen **E2E-Job** (App+API hochfahren,
   `planner/e2e` ausführen, T0+Smoke blockierend) sowie einen **mutmut-Job** (nightly, Score-Report).
3. **Frontend-Hooks für E2E (P1):** `data-testid` an Gate-Buttons, RACI-Matrix, Hilfe-Panel, Dropdowns —
   danach J1–J7 + U1–U7 aus dem Seed-Helper aufbauen (Desktop **und** iPhone).
4. **A11y/Visual (P1/P2):** `@axe-core/playwright` (0 critical/serious) + `toHaveScreenshot()` +
   Lighthouse-A11y ≥95 (mobile) auf `/plan`,`/harness`,`/review`.
5. **INV-9 absichern (P2):** „max. 3 Runden" entweder im Harness-Runtime erzwingen oder als
   getesteten Prompt-Constraint in den Agent-Missionen pinnen.
6. **AUTHZ Phase-2:** echte Tenant-Isolation statt Stub, dann AUTHZ-Tests gegen Cross-Tenant-Zugriff.

## 6. Bezug zum Gesamt-Engagement (2026-06-03)

Dieser Test-Strang lief nach der **Docker-Hub-Rate-Limit-Lösung** (Migration der Base-Images auf
**Microsoft Azure Linux / MCR**, live `v0.9.7-28`, vollständig Docker-Hub-frei) und deren Cleanup.
Die Versions-, Marken- und Idempotenz-Fixes aus diesem Strang sind die nächste Deploy-Charge.

---

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Versionsabhängiges gegen die
aktuelle Claude-Code-Doku verifizieren (BP-MD §9).*
