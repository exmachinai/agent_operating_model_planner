# 20 — Single Source of Truth: RACI ↔ Harness-Team-Konsistenz (Top-Level Agent Harness)

> **Status:** in Umsetzung · **Auslöser:** HANDOVER PVM/Roster-Divergenz (2026-06-04) + McK-Konsistenz-Audit
> **Ziel:** Aus allen Gates fließen die Informationen 1:1 konsistent in den Agent-Harness; das Deliverable kann sich strukturell nicht mehr widersprechen (audit-ready).
> **Methode:** ZGPM + McKinsey (MECE, Pyramid, Hypothesen-getrieben). Plan vor Code (CLAUDE.md).

## 1 — Problem (verifiziert, file:line)

Zwei voneinander entkoppelte Agenten-Quellen mit zwei Taxonomien:

- **Pfad 1 (Plan):** `zgpm_composer._PHASE_AGENTS` keyed auf `project_nature` → erzeugt RACI/Cost/Meilensteine.
- **Pfad 2 (Harness):** `catalog.defaults_for(project_type, project_subtype)` → erzeugt orchestration.yaml + Agenten.

Folge im kompilierten Projekt: 3 Geister-Accountables (M01 Research, M04 Security, M05 DevOps existieren nicht im Team), 3 reale Agenten (UX, Methodik, Test) ohne Budget, Namens-Drift (PMO-Agent ≠ PMO-Orchestrator), keine Cross-Layer-Invariante.

## 2 — Entscheidungen (Product Owner, 2026-06-04)

1. `project_nature` wird **deterministisch aus `project_type/subtype` abgeleitet** (eine Klassifikationsachse).
2. **RACI statt PVM** durchgängig; „Fachbereich" entfällt → in RACI ist die Stakeholder-Rolle „Projektleiter (HITL)".
3. Kanonischer PMO-Name nur `pmo-orchestrator` / „PMO-Orchestrator".
4. Phase→Agent-Fallback: nächster Worker nach `klass`, sonst PMO-Orchestrator als Accountable.
5. Token-Budget je Agent als **fester Katalog-Wert** (nicht formelbasiert).
6. Cross-Layer-Verletzung = **harter Gate-3-Blocker**; `schema_check` in den **Live-Compile-Pfad** verdrahten.
7. Zusätzliche Gate-Outputs in den Harness emittieren: `project_type/subtype`, `risk_narrative`, `overall_ampel`, Reviewer-Verdikt, Leitplanken-Screen-Ergebnis, `evidence_sources`.
8. Katalog-Skills als **echte ausführbare SKILL.md**; **Manifest == Platte** als harte Invariante.
9. DB: **additive** Schema-Felder (Cosmos schemalos), keine destruktive Migration; fehlende Felder werden beim nächsten Kompilieren neu berechnet.
10. Alles in einem Zug umsetzen + deployen. Altes Artefakt bleibt historisch; ein neues erstellt der User selbst.

## 3 — Zielarchitektur

**Eine Team-Quelle:** `catalog.defaults_for(type, subtype)` liefert das `team: list[CatalogAgent]`. Dieses Team wird an **beide** Erzeuger übergeben:

```
project ──▶ classify(type, subtype) ──▶ nature := nature_for(type, subtype)
                      │
                      └─▶ team := catalog.defaults_for(type, subtype)   ← SSOT
                                   │
                 ┌─────────────────┴───────────────────┐
                 ▼                                       ▼
   zgpm_composer.compose(project, …, team)     compiler.compile_graph(project, plan, team)
   → RACI-Rollen, Cost (feste Katalog-Budgets),  → orchestration.yaml, .claude/agents/*
     Meilenstein-Accountable aus team
                 └─────────────┬───────────────────────┘
                               ▼
              schema_check.validate_team_covers_raci(plan, graph)  ← harte Invariante
```

**Kanonische Identität:** `catalog.id` ist überall der Join-Key; Labels nur fürs Rendering.

**Phase→Agent-Mapping:** Pro Phase ein bevorzugter Agent über `klass`/`kind`/`subtypes`; Accountable = passender Worker, sonst (Fallback) `pmo-orchestrator`.

## 4 — Arbeitspakete (Reihenfolge, jeweils Tests grün)

- **AP1 Katalog-Budgets + Nature-Ableitung:** `CatalogAgent.token_budget` (fester Wert je Agent); `catalog.nature_for(type, subtype)`; `catalog.phase_agent_for(team, phase)`-Helfer. *(additiv, risikolos)*
- **AP2 Composer-SSOT:** `compose()/revise()/apply_milestone_ops()` nehmen `team`; `_PHASE_AGENTS` entfällt; RACI-Rollen + Accountable + Cost aus `team`; `_PMO` → `pmo-orchestrator`; „Fachbereich" entfällt.
- **AP3 RACI-Rename:** `pvm_roles → raci_roles`, `pvm.yaml → raci.yaml`, Codes auf R/A/C/I; Backend + Frontend + Templates + Help-Texte + Tests.
- **AP4 Single Orchestration + Compiler:** Compiler bekommt `team` (statt erneut `defaults_for`); `compile_graph(project, plan, team)`; ein Aufruf-Pfad in den Routern.
- **AP5 Invarianten (Gate-3-hart, live):** `validate_team_covers_raci`, `validate_budget_coverage`, `validate_skill_manifest_matches_disk` → als `fail`-Findings in `_detect_anti_patterns`; im Compile-Pfad aufgerufen.
- **AP6 Audit-Outputs emittieren:** `plan/project.yaml` (+type/subtype), `risk_narrative`, `overall_ampel`, Reviewer-Verdikt, Leitplanken-Screen, `evidence_sources` in Harness-Dateien.
- **AP7 Skills real + Manifest==Platte:** echte ausführbare SKILL.md; Manifest deckt exakt die vorhandenen Skill-Ordner.
- **AP8 DB additive Felder + graceful:** Team-Fingerprint/RACI/Budgets persistieren; fehlende Felder neu berechnen. `plan_hash` um Team-Fingerprint erweitern.
- **AP9 10 Simulationen als Golden-Tests** (Szenario-Matrix) + Regression für `it/prototype-mvp`.
- **AP10 Re-Kompilieren, E2E grün, deploy.**

## 5 — Akzeptanzkriterien

- AC-1 RACI-Identität: ausführende Rollen ⊆ Harness-Team (per `catalog.id`).
- AC-2 Accountable fachlich plausibel (kein Geister-Agent).
- AC-3 Budget-Deckung: jeder Worker hat Budget, jedes Budget hat Agenten; Summe konsistent.
- AC-4 Invariante hart + Tests (10 Szenarien + Regression).
- AC-5 Determinismus: gleicher Input → gleicher `plan_hash` (jetzt inkl. Team-Fingerprint).
- AC-6 Vollständigkeit: alle in §2.7 genannten Gate-Outputs im Deliverable.
- AC-7 Skills real + Manifest==Platte.

## 6 — Leitplanken (Constitution)

Trust-Infrastructure, keine 100%-Claims · Rechtsräume DE/EU27-Rest/UK/CH · AIMS · Produktnamen eingefroren · Zone-3 (kein Write nach Zone 2) · DE Doku / EN Identifier.
