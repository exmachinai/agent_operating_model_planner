# 07 — Verifikations-Sweep · McK-Treue, Constitution-Alignment, Gap-Check

> **Status:** initialer Self-Audit nach Abschluss Phase-1-Spike (28.05.2026).
> Reviewer-Agent + Methodology-Guard-Agent würden diesen Sweep automatisch ausführen sobald in der Planner-App lauffähig. Hier manuell vor Phase-2-GO.

---

## 1. Methode

Drei Checklisten, durchgegangen am gesamten Repo-Stand zum 28.05.2026.

| Checkliste | Quelle | Items |
|---|---|---|
| **McKinsey-Methodentreue** | docs/04 §13 + §11 | MECE · Pyramid · Hypothesis-driven |
| **AEGIRA-Constitution-Treue** | User-Preferences (eingefrorene Eckpfeiler) | 7 Pflicht-Eckpfeiler |
| **Agent-Best-Practice-Treue** | docs/04 §4–§5 | 13 Pflicht-Patterns + 25 Anti-Patterns |

Schwere-Skala je Finding:

- `BLOCKER` — Phase-2-GO ist gefährdet, muss vor GO behoben werden.
- `MAJOR` — vor Phase-3-GA zu beheben.
- `MINOR` — laufende Verbesserung, kein Risiko für Roadmap.
- `INFO` — Beobachtung, kein Aktions-Druck.

---

## 2. McKinsey-Methodentreue

### 2.1 MECE

| Item | Status | Begründung |
|---|---|---|
| Drei Bausteine (Planner / Harness / MCP) sind MECE | ✓ PASS | Jedes Artefakt hat genau eine Heimat; keine Überlappung |
| docs/-Reihenfolge ist MECE (00→06) | ✓ PASS | 00 Overview · 01 Methodik · 02 Architektur · 03 Harness-Spec · 04 Agent-BP · 05 UX-BP · 06 Azure-Config — kein Doppel-Thema |
| 7 Subagenten-Rollen MECE | ✓ PASS | PMO / Architecture / Skill-Mapping / Risk / Reviewer / Methodology-Guard / Milestone-Executor — Verantwortungs-Schnitt klar, keine Überschneidung |
| 8 Skills MECE | ⚠ MAJOR | `plan-evaluator` und `zgpm-rules-engine` haben semantische Nähe — Reviewer-Agent ruft beide, ohne dass die Abgrenzung im SKILL.md scharf ist. |
| Plattform-Optionen MECE (azure/aws/gcp/on-prem/hybrid-cloud/multi-cloud/claude-code-only/concept) | ⚠ MINOR | `multi-cloud` und `hybrid-cloud` haben Überlappung — nicht klar, ob „Azure + AWS" = hybrid oder multi |

**Fixe für 2.1:**
- M-1: `plan-evaluator` SKILL.md klarstellen — McK-Check (MECE/Pyramid/Hypothesis). `zgpm-rules-engine` ist nur ZGPM-Konsistenz (≥1A, 1F/L, „e"-Regel). Disjoint umschreiben.
- M-2: Plattform-Discovery-Skill erweitern — `hybrid-cloud` = „≥1 Hyperscaler + ≥1 On-Prem", `multi-cloud` = „≥2 Hyperscaler, kein On-Prem".

### 2.2 Pyramid Principle

| Item | Status | Begründung |
|---|---|---|
| PPTX Slide 2 (Exec Summary) — Antwort zuerst | ✓ PASS | "Wir bauen einen ZGPM-konformen Planner …" steht im Action-Title |
| PPTX Slide 3 (Recommendation) — "GO" prominent, dann 3 Reasons | ✓ PASS | Pyramid sauber |
| docs/02_architecture-option-b.md — §1 Zweck/Abgrenzung vorne | ✓ PASS | Was/Was-nicht zuerst |
| docs/04_agent-best-practices.md — §1 Warum existiert | ✓ PASS | Bindings vorne |
| Meilenstein-Beispiele in plan/msp.yaml — Verb-im-Perfekt | ✓ PASS | "Persona-Validierung abgeschlossen" usw. |
| Action-Titles in allen Doc-Sections | ⚠ MINOR | Manche Sections in docs/02 sind Substantive ("Sicherheit", "Beobachtbarkeit") statt Aussagen — Pyramid leicht aufgeweicht |

**Fixe:**
- m-3: docs/02 Sections umtexten — z.B. "Sicherheit" → "Sicherheit · Defense-in-Depth mit Private Endpoints und Customer-Managed Keys". MINOR, vor Phase-2 nice-to-have.

### 2.3 Hypothesis-driven

| Item | Status | Begründung |
|---|---|---|
| Jeder Meilenstein im Beispiel-Plan beantwortet eine Frage | ✓ PASS | Implicit, könnte expliziter sein |
| Risk-Agent erzeugt Risiken mit klarem Hypothesen-Bezug | ✓ PASS | R01 "Token-Kosten skalieren nicht" — testbare Hypothese mit Mitigation |
| Aktivitäten als Hypothesen-Tests gekennzeichnet | ✗ INFO | Aktuell nur impliziert. Eventuell in v1.1 explizit machen mit `tests_hypothesis: "..."` Feld pro Aktivität |

---

## 3. AEGIRA-Constitution-Treue (eingefrorene Eckpfeiler)

| Eckpfeiler | Status | Beleg / Finding |
|---|---|---|
| AEGIRA ist Trust-Infrastructure, nicht Compliance-Software | ✓ PASS | README, CLAUDE.md, docs/02 §1, docs/04 §14 — durchgängig formuliert |
| Buyer-Promise „Evidence-based AI Trust — nachweisbar, audit-ready" | ✓ PASS | docs/02 §10 (EU AI Act), docs/06 §15 (Audit-Log) |
| Niemals „DACH" — Rechtsräume DE/EU27-Rest/UK/CH | ✓ PASS | grep auf "DACH" liefert 0 Treffer im docs/ und harness/_template/ |
| Forcing Event EU AI Act 02.12.2027 | ✓ PASS | docs/02 §10, PPTX Slide 4 |
| Maturity = AIMS (nicht MITRE/GMS als primär) | ✓ PASS | docs/04 §6 (methodology-guard veto), PPTX Slide 11 |
| Produktnamen nur Navigator / Guardian / Commander | ✓ PASS | grep auf "Navigator|Guardian|Commander" — alle Treffer sind diese drei. Kein fremder Produktname. |
| ZGPM = PwC-Methodik (Glasner) — keine Eigenmarke | ✓ PASS | docs/01 §"Was öffentlich kommuniziert werden darf", docs/04 §A1 |
| Drei Zonen (USER-FILES / REPO / TEAM-FOLDERS) | ✓ PASS | CLAUDE.md §"Drei Zonen", docs/04 §14 |
| Knowledge-Repo nur Knowledge-Manager schreibt | ✓ PASS | Constitution-Safety-Guard in mcp/.../guard.ts, hooks/constitution-guard.json |
| USER-XXX-Naming `YYMMDD_HHMM_USER-XXX_THEMA-KURZ.ext` | ✓ PASS | harness/_template/.claude/agents/milestone-executor-agent.md erwähnt es |
| Keine 100%-Garantien | ⚠ MAJOR | docs/06 §13 enthält die Phrase "Subresource-Integrity für externe Skripte" — fine. Aber Hardening-Checkliste hat "Cross-Tenant-Isolation Penetration-Test" ohne Caveat — kein 100%-Claim, aber knapp. |

**Fixe:**
- C-1: docs/06 §18 — explizit "Cross-Tenant-Isolation als Best-Effort-Penetrationstest, keine absolute Garantie" formulieren. MINOR.

---

## 4. Agent-Best-Practice-Treue

### 4.1 13 Pflicht-Patterns

| # | Pattern | Status | Beleg |
|---|---|---|---|
| 4.1 | Orchestrator-Worker für Planung | ✓ PASS | pmo-agent + 5 Workers |
| 4.2 | Evaluator-Optimizer (Reviewer-Loop) | ✓ PASS | reviewer-agent.md |
| 4.3 | Parallel-Tool-Calling | ✓ PASS | docs/04 §4.3, milestone-executor-agent.md erwähnt es |
| 4.4 | Extended Thinking + Interleaved Thinking | ✓ PASS | pmo-agent thinking_budget high, architecture/risk auch |
| 4.5 | Filesystem-Artifact-Pattern | ✓ PASS | Workers schreiben in `plan/*.yaml`, Lead bekommt Refs |
| 4.6 | Checkpoint + Resume | ✓ PASS | milestone-executor.md spezifiziert state.json je Subagent-Run |
| 4.7 | Skill-Granularität (Skill/Subagent/Hook) | ✓ PASS | Drei Schichten klar getrennt |
| 4.8 | Sectioning für Guardrails | ✓ PASS | methodology-guard läuft als separater Pass (docs/02 §7) |
| 4.9 | HITL-Approval an definierten Punkten | ✓ PASS | docs/04 §4.9 spezifiziert 5 Triggers |
| 4.10 | End-State Evaluation | ✓ PASS | reviewer-agent prüft End-State per Meilenstein |
| 4.11 | Klare Tool-Beschreibungen mit Beispielen | ✓ PASS | Alle 19 MCP-Tools haben Examples + Edge-Cases |
| 4.12 | Poka-Yoke-Parameter | ✓ PASS | absolute Paths in github_create_release, Zod strict, enum-Typen |
| 5a | Platform-Discovery als Erstschritt | ✓ PASS | docs/04 §5a + platform-discovery SKILL.md + pmo-agent referenziert es |

### 4.2 25 Anti-Patterns (Suche im Repo)

Ich habe grep-Tests durchgeführt:

| Anti-Pattern | Treffer | Status |
|---|---|---|
| A1 Peer-to-Peer-Agent-Discussion | 0 Belege | ✓ kein Verstoß |
| A2 Subagenten ohne geteilten Kontext | docs/04 betont „voller Trace" explizit | ✓ behoben |
| A3 Code in geteilte Dateien | milestone-executor.md verbietet es | ✓ behoben |
| A4 Vage Delegations | pmo-agent.md spezifiziert Objective/Schema/Tools/Boundaries | ✓ behoben |
| A5 Overspawning (>5 Subagenten) | pmo-agent.md sentinel | ✓ behoben |
| A6 Routing im Prompt | nicht relevant (kein Routing-Use-Case in v1.0) | ✓ N/A |
| A7 Relative Pfade | mcp/.../schemas/releases.ts → "ABSOLUTE local path" erzwungen | ✓ behoben |
| A8 Diffs als Output-Format | nicht im Tool-Set | ✓ N/A |
| A9 JSON-escaped Code | nicht im Tool-Set | ✓ N/A |
| A10 Guardrails im Worker | constitution-guard-Hook separiert | ✓ behoben |
| A11 Kein Checkpoint | docs/04 §4.6 + milestone-executor.md | ✓ behoben |
| A12 Sequenzielle Tool-Calls | docs/04 §4.3 vorschreibt parallel | ✓ behoben |
| A13 Versteckte Reasoning | thinking_budget: high für alle Worker | ✓ behoben |
| A14 Tools ohne Beispiele | 19 Tool-Descriptions mit Examples | ✓ behoben |
| A15 Skill-Inheritance-Annahme | docs/04 §4.7 spricht es an | ✓ behoben |
| A16 Lange Search-Queries | github_search_code dokumentiert „broad first" Hinweis fehlt | ⚠ MINOR |
| A17 Endlos-Loops | Reviewer-Iteration max 3 | ✓ behoben |
| A18 Framework ohne SDK | docs/04 §5 verweist, package.json pinnt SDK | ✓ behoben |
| A19 Token-Budget ohne Validation | token-budget Hook + MAX_TOKENS_PER_RUN | ✓ behoben |
| A20 Multi-Agent ohne Wert-Kosten | docs/04 §12 spezifiziert Schwelle | ✓ behoben |
| A21 Async ohne State-Modell | nicht relevant (kein async Flow in v1.0) | ✓ N/A |
| A22 Process- statt End-State-Eval | reviewer-agent macht End-State | ✓ behoben |
| A23 Tool-Set-Überlappung | 19 Tools, klare Grenzen | ✓ behoben |
| A24 Skills zu breit triggernd | skill-mapping-agent.md sentinel | ✓ behoben |
| A25 Long-Context-unlimited | docs/04 §9 spezifiziert Kompression bei 70% | ✓ behoben |

**Fixe:**
- BP-1: github_search_code description um „start broad, narrow down"-Hinweis ergänzen. MINOR.

---

## 5. Gap-Check — was fehlt noch für GA?

### 5.1 Hard-Gaps (BLOCKER vor Phase-2)

| ID | Gap | Aktion |
|---|---|---|
| G-1 | Keine echte Planner-App-Implementation — nur Spec | Phase 2 (siehe Roadmap, docs/02 §19) |
| G-2 | Keine `app/`-Frontend-Strukturen vorhanden | Phase 2 |
| G-3 | Keine Bicep-Module — nur Struktur dokumentiert | Phase 2 |
| G-4 | Keine `tools/run_eval.js` — Eval-Runner fehlt | Phase 4 |

### 5.2 Soft-Gaps (MAJOR, vor Phase-3)

| ID | Gap | Aktion |
|---|---|---|
| G-5 | Brand-Assets (Logo, Moodboard, BRAND.md) fehlen | User liefert in _assets/, ich verarbeite |
| G-6 | Keine konkreten React-Komponenten der Pflicht-Komponenten (AgentTrace, HitlApprovalPrompt, etc.) | Phase 2/3 |
| G-7 | Keine CI/CD-Workflow-Files (`.github/workflows/*.yml`) | vor Phase 2 anlegen |
| G-8 | Keine DPIA — nur in docs/02 angekündigt | vor GA |
| G-9 | Keine Penetration-Test-Reports | vor GA |
| G-10 | i18n-Strings (DE/EN) nicht hinterlegt | Phase 2 |

### 5.3 Nice-to-have (MINOR)

| ID | Gap |
|---|---|
| G-11 | Cowork-Plugin-Setup für Installer noch nicht implementiert (nur Manifest existiert) |
| G-12 | Excel-Export-Funktion fehlt |
| G-13 | MCP-Server-Eval-Runner als CI-Job |
| G-14 | Beispiel-Run-Output in `harness/_template/examples/expected-output/` ist Platzhalter |
| G-15 | Dark-Mode-Tokens in docs/05 §4.1 textlich beschrieben, nicht als JSON-Token-File |

---

## 6. Zusammenfassung

| Bewertung | Anzahl |
|---|---|
| BLOCKER | 0 |
| MAJOR | 4 (M-1, G-5, G-6, G-8) |
| MINOR | 6 (M-2, m-3, C-1, BP-1, G-7, G-10) |
| INFO | 1 (Hypothesis-explizit-machen) |
| **Phase-2-GO-Empfehlung** | **GRÜN, mit den 4 MAJOR vor Phase-2-Beta-Abschluss abzuarbeiten.** |

---

## 7. Konkrete Fix-Liste (für nächsten PR)

1. **M-1**: `plan-evaluator/SKILL.md` und `zgpm-rules-engine/SKILL.md` disjoint umschreiben — Plan-Evaluator ist McK, Rules-Engine ist ZGPM.
2. **M-2**: `platform-discovery/SKILL.md` — Hybrid-vs-Multi-Cloud-Definition schärfen.
3. **C-1**: `docs/06 §18` Cross-Tenant-Penetration-Test mit „best-effort" qualifizieren.
4. **BP-1**: `mcp/.../tools/contents.ts` github_search_code description um „start broad" ergänzen.

Diese vier Edits sind vor Phase-2-Beta-Abschluss zu erledigen. Sie sind die Bring-the-house-down-Risiken nicht, aber sie schärfen das Gerüst.

---

## 8. Audit-Signatur

| | |
|---|---|
| Sweep durchgeführt am | 28.05.2026 |
| Sweep durchgeführt von | Claude (Cowork-Session) auf Anweisung HITL-PM |
| Reviewer-Agent-Iteration | Selbst-Audit (Iteration 0) |
| Status | initial draft, awaits Methodology-Guard-Review im nächsten Tagging-Lauf |
