# HANDOVER → Claude Code — Systemlogik-Korrektur: PVM/Cost-Roster ↔ Harness-Team-Divergenz

> **Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` (Planner-App)
> **Erstellt:** 2026-06-04 · **Auslöser:** Konsistenzprüfung des kompilierten Harness `sales-prototype_20260602_4ba4b3`
> **Schweregrad:** hoch (innere Plan-Inkonsistenz; PVM verweist auf Agenten, die der Harness nicht hat)
> **Typ:** Bug + Strukturkorrektur (Single Source of Truth) — **kein** UI-Bug
> **Sprache:** DE (Doku) · EN (Code-Identifier) — siehe `CLAUDE.md`

---

## 1 — Auftrag (eine Zeile)

Die Systemlogik der Planner-App so korrigieren, dass die **PVM-/Cost-/Milestone-Ebene**
(`zgpm_composer.py`) und die **Harness-Team-Ebene** (`harness/catalog.py` + `compiler.py`)
**dasselbe Agenten-Roster** verwenden. Heute laufen sie auf zwei unabhängigen
Auswahlpfaden auseinander.

---

## 2 — Inputdaten (das geprüfte Projekt)

| Feld | Wert |
|---|---|
| Projekt | Sales Prototype |
| project_id | `prj_10342b39c323` |
| project_nature | `technical` |
| Kontext-Tags (PDF-Kopf) | `it · prototype-mvp` (→ Subtyp Frontend-/Prototyp-Projekt) |
| target_platform | `azure` |
| plan_version | 1 |
| plan_hash | `sha256:4ba4b3a2952e405b63a27d139ef99e512179c775439dad561fb218f840c83a1d` |
| compiled_by | `aegira-planner@0.4.0` |
| schema_version | `2.1.0-claude-native` |
| Scope | Frontend-Prototyp auf Basis verifywise.ai; UX-optimiert, Moodboard/Logo AEGIRA; **kein Backend** |

Artefakt-Quelle der Befunde: kompilierter Harness-Ordner
`31_MVP_CONCEPT_ADVANCED/200_ZGPM_AGENT_HARNESS/sales-prototype_20260602_4ba4b3/`
sowie die Planner-Druckansicht (PDF „AEGIRA — Agent Operating Model Planner").

---

## 3 — Befund (Symptom)

Im kompilierten Plan existieren **zwei widersprüchliche Agenten-Roster**:

**Roster A — Harness-Team (korrekt, projektspezifisch)**
Quelle: PDF S. 2/4, `orchestration.yaml`, `.claude/agents/*.md`, `CLAUDE.md`
→ PMO-Orchestrator · Architektur · Implementierung · **UX/Design** · **Methodik** · Risiko · Reviewer/QA · **Test-Agent (E2E)** · Projektleiter (HITL)

**Roster B — PVM/Cost/Milestones (generisch, falsch für dieses Projekt)**
Quelle: `plan/pvm.yaml`, `plan/cost.yaml`, `plan/milestones/*.yaml`
→ PMO-Agent · **Research/Analyse-Agent** · Architektur · Implementierung · **Security-Agent** · **DevOps/Deploy-Agent** · Risiko · Reviewer/QA · Fachbereich

### Konkrete Auswirkungen

1. **Accountable-(A)-Rolle zeigt auf Geister-Agenten.** In `plan/milestones/*.yaml`:
   - M01 → A = `Research/Analyse-Agent` → **existiert nicht** im Harness
   - M04 (Clickflows testen) → A = `Security-Agent` → existiert nicht; fachlich richtig wäre `Test-Agent (E2E)`
   - M05 (Azure-Deploy) → A = `DevOps/Deploy-Agent` → existiert nicht
2. **Token-Budget falsch verteilt.** `plan/cost.yaml` (Summe 84.000, rechnerisch korrekt)
   budgetiert Research/Analyse, Security, DevOps/Deploy (alle nicht vorhanden) und vergibt
   **kein** Budget für die real laufenden UX/Design-, Methodik- und Test-Agenten.
3. **PVM-Validierung im Lauf bricht.** Reviewer/QA- und Methodik-Gate prüfen PVM-Regeln je
   Knoten gegen Rollen, die zur Laufzeit nicht existieren (vgl. Risiko PRL-1).

### Was korrekt ist (zur Abgrenzung — nicht anfassen)

Milestones-Texte/Termine/Ampeln, Projektrisiken PRL-1..4, plan_hash/Version, HITL-Punkte (7),
Stages/Flow und das Harness-Team selbst stimmen PDF ↔ Harness exakt überein. Der Defekt liegt
**ausschließlich** in der Roster-Quelle der PVM/Cost/Milestone-Erzeugung.

---

## 4 — Root Cause (zwei unabhängige Auswahlpfade)

Es gibt zwei voneinander getrennte Agenten-Auswahlmechanismen, die nie abgeglichen werden:

### Pfad 1 — Plan-Komposition (PVM/Cost/Milestones)
`planner/api/app/planning/zgpm_composer.py`

- **Zeilen 88–110:** statisches `_PHASE_AGENTS: dict[str, list[str]]`, gekeyt **nur auf
  `project_nature`** (`concept` / `technical` / `hybrid-concept-tech`).
  Für `nature="technical"` → `[Research/Analyse, Architektur, Implementierung, Security, DevOps/Deploy]`.
- Zeile 116 `_phase_agents_unique(nature)` und Zeile 125 `_roles_for(nature)` → speisen die PVM-Matrix.
- Zeile 177/189 `_build_milestones_from_outline` → setzt `A` je Meilenstein aus `_PHASE_AGENTS`.
- Zeile ~296–299 Cost-Logik → budgetiert exakt dieses statische Roster
  (PMO = `8000 + 1500 * n_milestones` = 15.500 ✓ bestätigt, dass cost.yaml von hier stammt).
- **Verräterischer Kommentar Zeile 86:** „Labels stammen 1:1 aus dem v0.4-Agentenkatalog
  (harness/catalog.py)" — diese 1:1-Kopplung ist **gedriftet** und nie verdrahtet worden.

### Pfad 2 — Harness-Team-Auswahl (orchestration + agents)
`planner/api/app/harness/catalog.py` → `defaults_for(project_type, project_subtype)` (Zeile 299)

- Wählt Agenten nach **`project_type` UND `project_subtype`** aus `_CATALOG`.
- Für den it/Prototyp-Subtyp → UX/Design-, Methodik-, Test-Agent etc.
- `compiler.py` kompiliert daraus `orchestration.yaml` + `.claude/agents/*.md`.

### Kern des Problems
Pfad 1 kennt **nur `nature`**, Pfad 2 kennt **`type` + `subtype`**. Beide leiten Agenten
unabhängig ab. Sobald `subtype` das Team verändert (hier: Frontend-Prototyp → UX/Test statt
Security/DevOps), divergieren PVM/Cost vom realen Harness. Es gibt **keine gemeinsame Quelle**
und **keine Invariante**, die Gleichheit erzwingt.

---

## 5 — Betroffene Dateien

| Datei | Rolle | Änderung |
|---|---|---|
| `planner/api/app/planning/zgpm_composer.py` | erzeugt PVM/Cost/Milestones | **Primär** — Roster-Quelle umstellen |
| `planner/api/app/harness/catalog.py` | `defaults_for()` Team-Auswahl | als Single Source of Truth exponieren |
| `planner/api/app/harness/compiler.py` | kompiliert Harness | Datenfluss „selected team → composer" prüfen |
| `planner/api/app/harness/schema_check.py` | Schema-/Invariantenprüfung | **neue Cross-Layer-Invariante** ergänzen |
| `planner/api/tests/test_compiler_properties.py` / `test_invariants_extended.py` / `test_zgpm_composer_coverage.py` | Tests | Regressionstest ergänzen |

---

## 6 — Zielzustand & Akzeptanzkriterien

**Single Source of Truth:** Das Agenten-Team wird **einmal** bestimmt
(`catalog.defaults_for(type, subtype)`) und sowohl an die Harness-Kompilierung **als auch** an
`zgpm_composer` (PVM/Cost/Milestone-A-Zuweisung) übergeben.

Akzeptanzkriterien (alle müssen erfüllt sein):

1. **AC-1 Roster-Identität:** Die Menge der ausführenden Agenten in `pvm.yaml` / `cost.yaml` /
   `milestones/*.yaml` ist eine Teilmenge des Harness-Teams aus `orchestration.yaml` /
   `.claude/agents/`. Keine Rolle in der PVM, die nicht als Agent existiert.
2. **AC-2 A-Zuordnung fachlich plausibel:** M04 (Test/Clickflows) → `Test-Agent (E2E)`;
   keine `Security-/DevOps-/Research-`Zuweisung, wenn der Agent nicht im Team ist.
3. **AC-3 Cost-Abdeckung:** Jeder budgetierte Agent existiert; jeder ausführende Worker des
   Teams hat eine Budgetzeile. Summe bleibt konsistent (`token_budget_gesamt`).
4. **AC-4 Invariante + Test:** `schema_check` schlägt fehl, wenn PVM-Rollen ⊄ Harness-Team.
   Property-/Golden-Test deckt mind. `technical+prototype-mvp` ab und reproduziert den alten Bug
   als Regressionsschutz.
5. **AC-5 Determinismus & Hash:** Re-Kompilierung desselben Inputs bleibt deterministisch;
   `plan_hash`-Logik unverändert (nur Inhalt korrigiert).

**Nicht-Ziele:** Milestone-Texte/Termine, PRL-1..4, HITL-Punkte, Stages, Branding/UI nicht ändern.

---

## 7 — Empfohlenes Vorgehen

1. **Plan vor Code** (`CLAUDE.md`-Regel): kurzen Fix-Plan in `docs/` ablegen, dann implementieren.
2. `defaults_for()` so erweitern/aufrufen, dass das selektierte Team **als Liste** verfügbar ist,
   bevor `zgpm_composer.compose()` läuft.
3. In `zgpm_composer`: `_PHASE_AGENTS`-Logik ersetzen — statt statischer `nature`-Map die
   **Phasen→Worker-Zuordnung aus dem realen Team** ableiten (Mapping Phase→passender Agent über
   die `klass`/`subtypes`-Felder des Katalogs, nicht über hartkodierte Namen).
4. `_default_ms_responsibilities` / Cost-Schätzer auf das übergebene Team umstellen.
5. Cross-Layer-Invariante in `schema_check.py`; Regressionstest ergänzen.
6. Lokal `pytest` (FastAPI-Suite unter `planner/api/tests/`) grün, dann Beispielprojekt
   `technical+prototype-mvp` neu kompilieren und gegen AC-1..5 verifizieren.

---

## 8 — Verbindliche Leitplanken (AEGIRA-Constitution)

- AEGIRA ist **Trust-Infrastructure**, keine Compliance-Software. Keine 100%-Claims.
- Rechtsräume **DE · EU27-Rest · UK · CH** — niemals „DACH".
- Maturity = **AIMS** (ISO 42001 × CMMI v3).
- Produktnamen eingefroren: **AI Navigator / AI Guardian / AI Commander**.
- Keine Secrets im Klartext; nur `.env.example` pflegen.
- Dieses Repo ist **Zone 3** — darf nicht nach `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` schreiben.

---

## 9 — Belege (Quell-Referenzen)

- Harness Roster B: `…/sales-prototype_20260602_4ba4b3/plan/pvm.yaml`, `plan/cost.yaml`, `plan/milestones/M01–M05.yaml`
- Harness Roster A: `…/sales-prototype_20260602_4ba4b3/orchestration.yaml`, `.claude/agents/*.md`, `CLAUDE.md`
- Root Cause Pfad 1: `planner/api/app/planning/zgpm_composer.py:86–128, 177, 189, 296–299`
- Root Cause Pfad 2: `planner/api/app/harness/catalog.py:299–331`
- Planner-Druckansicht: PDF „AEGIRA — Agent Operating Model Planner" (5 S., gedruckt 2026-06-04)
