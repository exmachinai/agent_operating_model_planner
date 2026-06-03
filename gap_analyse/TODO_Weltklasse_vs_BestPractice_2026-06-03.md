# TODO — zgpm.aegira.ai zum Weltklasse-Tool für Claude-Agentenstrukturen

**Stand:** 2026-06-03 · **Prüfgrundlage:** `Best-Practice_Agentische-Entwicklung_Artefakte-und-HITL.md`
gegen den live deployten Stand (`zgpm.aegira.ai`) + Quellcode
(`planner/api/app/harness/{compiler,templates,catalog,skill_catalog}.py`,
`planner/components/PlanViews.tsx`).
**Methode:** McKinsey — Pyramid (Kernaussage → MECE-Gruppen), hypothesengetrieben, MECE-Buckets.

---

## Kernaussage (Governing Thought)

zgpm.aegira.ai ist bereits ein **methodisch überdurchschnittlicher Harness-Compiler**:
Orchestrator-Worker + Evaluator-Optimizer, Stage-Muster (chain/section/route/vote),
Agenten-Katalog mit Modell-Tiering und Least-Privilege-Tools, Guardrail-Schicht,
Skill-Trust-Tiers + Audit-Manifest, Anti-Pattern-Detection, Integritäts-Hashes, HITL-Punkte.

Zum **Weltklasse-Tool** fehlen im Kern vier Dinge — sie schließen ~80 % der Lücke:

1. **Runtime-Schema-Treue** — der generierte `.claude/`-Output nutzt teils erfundene
   Schemata (Hooks, settings.json). Risiko: läuft in echtem Claude Code nicht / setzt nichts durch.
2. **Artefakt-Vollständigkeit** — `.mcp.json`, `.claude/rules/`, Permission-Modi fehlen.
3. **RACI-Standardisierung** — die PVM-Matrix ist international nicht anschlussfähig und ohne Code-Legende.
4. **Reifegrad-/Autonomie-Steuerung** — Maturity ist nicht an Permission-Modi gekoppelt (nur Kosten via ModelStrategy).

> Prinzip der Best-Practice-MD (§7): **Autonomie an Reversibilität festmachen, nicht an Pipeline-Mechanik.**
> Das ist der rote Faden für Bucket C.

---

## Coverage-Überblick (Ist)

| Best-Practice-Feature (MD) | Status | Beleg |
|---|---|---|
| `CLAUDE.md` Projekt-Memory (Schicht 2) | ✅ | `templates.claude_md()` inkl. Constitution-Leitplanken |
| `.claude/skills/` + Trust-Tiers (7) | ✅ stark | echte SKILL.md, `_manifest.json`, Security-Gate |
| `.claude/agents/` Subagents (8) | ✅ stark | `description`=Delegations-Trigger, single-responsibility, min. Tools, Modell-Tiering |
| Workflows/Orchestrierung (§2) | ✅ stark | Stages chain/section/route/vote, manager/handoff |
| Guardrails (§6) | ✅ | Katalog: relevance, safety, PII, moderation, tool-risk, output-validation |
| HITL & Reversibilität (§6) | ✅ | HITL-Knoten, stop-on-red, High-Risk→HITL, Budget>80% |
| Anti-Pattern-Detection (docs/04) | ✅ | über-spawning, vage-delegation, fehlender-checkpoint, kein-evaluator |
| Integrität/Audit | ✅ | `checksums.txt`, zip-SHA, `audit-log`-Hook |
| `.claude/settings.json` (5) | ⚠️ Schema | nicht-kanonische Keys (`subagents_path`, `thinking_budget`, custom `hooks`) |
| Hooks (9) | ⚠️ Schema | erfundenes Schema (`trigger:"before_tool"`, `action:"block"`) statt Events/Exit-Code 2 |
| Commands→Skills (§1/§4) | ⚠️ veraltet | `.claude/commands/*.md` als Primärformat (MD: Skills empfohlen, Skill gewinnt bei Kollision) |
| `.mcp.json` (10) | ❌ | nur ENV in `.env.example`, keine `.mcp.json` |
| Permission-Modi + `ask`-Liste (§4) | ❌ | nur allow/deny, kein `defaultMode` |
| `.claude/rules/*.md` (3) | ❌ | nicht erzeugt |
| Maturity↔Permission-Kopplung (§7) | ❌ | nur ModelStrategy (Kosten ≠ Autonomie) |
| Credential-/Transcript-Hygiene (§4) | ⚠️ | deny rm/curl/wget, aber kein `.env`-Read-deny, kein `cleanupPeriodDays`/`SKIP_PROMPT_HISTORY` |
| Sandbox/Devcontainer (§4/§8) | ❌ | kein `.devcontainer/` |
| Cowork-Spezifika/OTel (§5) | ⚠️ | nur dokumentiert (HANDOVER) — App-Layer, nicht datei-erzwingbar |
| RACI-Standard / PVM-Code-Legende | ❌ | Codes nur als Hover-Tooltip; keine sichtbare Code-Legende (live bestätigt) |

---

## Offene Entscheidung (vor Umsetzung von Bucket D)

**D1 — RACI-Strategie.** Empfehlung: **PVM bleibt interne ZGPM-Wahrheit (Rules-Engine),
RACI wird die angezeigte/exportierte Standardsprache** (Toggle für Methodik-Puristen).
So bleibt die Constitution (ZGPM-Methodentreue, Konsistenzregeln) gewahrt **und** das Tool
wird international anschlussfähig. Mapping (Anzeige):

| ZGPM-PVM | → RACI | Begründung |
|---|---|---|
| A — führt aus | **R** (Responsible) | ausführend |
| L — leitet & steuert / F — steuert Fortschritt | **A** (Accountable) | „genau ein F/L" == „genau ein Accountable" — sauberer 1:1-Anker |
| E — entscheidet / e — entscheidet mit / B — wird beteiligt | **C** (Consulted) | Entscheidungs-/Mitsprache-Beteiligung |
| I — wird informiert / V — ist verfügbar | **I** (Informed) | passiv eingebunden |

Informationsverlust (E/L-Trennung, V) wird über das interne PVM-Modell aufgefangen — daher Toggle statt Ersatz.
*Falls stattdessen vollständiger Ersatz von PVM durch RACI gewünscht ist: das ändert die Rules-Engine
und berührt die Constitution — separat freigeben.*

---

## Bucket A — Runtime-Schema-Treue (P0, „läuft es real?")

> **Hypothese:** Der schönste Harness ist wertlos, wenn echtes Claude Code die Datei-Schemata ignoriert.
> Enforcement (Hooks) ist laut MD das einzige *deterministische* Trust-Instrument — ein falsches Schema = keine Durchsetzung.

| # | TODO | Schließbar? / Fit | Prio | Aufwand | Dateien |
|---|---|---|---|---|---|
| A1 | Hook-Schema an offizielle Hooks-Referenz angleichen: Events (`PreToolUse`/`PostToolUse`/`Stop`), Matcher, Handler `command`, Blockieren via **Exit-Code 2**. `constitution-guard` als `PreToolUse`-`deny` (greift auch im bypass + rekursiv für Subagents). | Ja / **essenziell** | **P0** | M | `templates.hook_files()`, `settings_json()` |
| A2 | `settings.json` gegen echtes Claude-Code-Schema validieren; nicht-kanonische Keys (`subagents_path`, `skills_path`, `commands_path`, `memory_path`, `thinking_budget`, `$schema`-URL) ersetzen/entfernen. | Ja / essenziell | **P0** | M | `templates.settings_json()` |
| A3 | Golden-File-Test: kompilierten Harness gegen JSON-Schema der Claude-Code-Settings/Hooks prüfen (CI-Gate). | Ja / essenziell | **P0** | M | `api/tests/` (neu) |
| A4 | Schema-Versions-Inkonsistenz beheben: `changelog_md` sagt `2.0.0-claude-native`, `compiler._SCHEMA_VERSION` = `2.1.0-claude-native`. | Ja / Hygiene | P1 | S | `compiler.py`, `templates.changelog_md()` |
| A5 | Versionspflege automatisieren: `runtime_requirements` (`claude_code>=0.8`, `cowork>=0.4`) gegen reale aktuelle Versionen prüfen (MD §9 warnt vor Versionsdrift). | Ja / Trust | P2 | S | `templates.plan_version_json()` |

---

## Bucket B — Artefakt-Vollständigkeit (P1, 14-Schichten-Abdeckung)

> **Hypothese:** Das Tool deckt die Team-committeten Schichten gut ab; es fehlen genau die Schichten,
> die MCP-Bindung und feingranulare Steuerung tragen. Persönliche/lokale Schichten (4,6,11–13) sind
> bewusst *kein* Harness-Inhalt (portabel ≠ persönlich) — das ist korrekt und bleibt offen-by-design.

| # | TODO | Schließbar? / Fit | Prio | Aufwand | Dateien |
|---|---|---|---|---|---|
| B1 | `.mcp.json` generieren (Schicht 10): `${ENV}`-Referenzen, Transport `http`/`stdio`. Daten liegen vor: `CatalogSkill.required_mcps`, `ToolSpec`. | Ja / **hoch** (Tool hat die Daten) | **P1** | S–M | neue `templates.mcp_json()`, `compiler.build_files()` |
| B2 | `.claude/rules/*.md` (Schicht 3): pfad-/themenskopierte Regeln, z. B. Zone-Regeln (Zone-2-Write-Verbot, Naming `YYMMDD_HHMM_USER-XXX`). | Ja / hoch | P1 | M | neue `templates.rule_files()` |
| B3 | Permission-Modi + `ask`-Liste in `settings.json`: `defaultMode`, `ask`-Patterns; „Protected Paths" respektieren. Auswertung deny→ask→allow dokumentieren. | Ja / hoch | **P1** | M | `templates.settings_json()` |
| B4 | Commands → Skills migrieren: die 7 `/run-harness …` als Skills (`disable-model-invocation` wo nötig) statt `.claude/commands/`; Commands höchstens als Legacy mit Hinweis. | Ja / mittel | P1 | M | `templates.command_files()` → `skill_files()`, `plugin_json()` |
| B5 | `AGENTS.md` optional (nur bei Cross-Tool-Target): per `@import` aus `CLAUDE.md` referenzieren/symlinken. Gated über `project.target_platform`. | Ja / **kontextabhängig** | P2 | S | `templates`, `project`-Schema |
| B6 | `.devcontainer/` optional für IT-Harnesses (Non-Root), Voraussetzung für `acceptEdits`/`auto` laut §8. Gated über `target_platform`/Reifegrad. | Ja / kontextabhängig | P2 | M | neue Template-Gruppe |

---

## Bucket C — Governance, Trust & Reifegrad (P1, AEGIRA-Kern)

> **Hypothese:** AEGIRA ist Trust-Infrastructure — Governance ist das Alleinstellungsmerkmal.
> Der größte Hebel ist die **Reifegrad-/Autonomie-Achse** (MD §7), die heute fehlt: sie verbindet
> Permission-Modus, Hook-Strenge, Sandbox und HITL-Dichte zu einem nachweisbaren Autonomie-Level.

| # | TODO | Schließbar? / Fit | Prio | Aufwand | Dateien |
|---|---|---|---|---|---|
| C1 | **Reifegrad-/Autonomie-Selektor (Stufe 1–4)** statt nur Kosten-ModelStrategy. Stufe setzt: `defaultMode` (default→acceptEdits→auto), Hook-Strenge, Sandbox-Pflicht, HITL-Dichte. Kopplung an AIMS-Maturity. | Ja / **sehr hoch** (AEGIRA-Eckpfeiler) | **P1** | L | `harness`-Schema (`AutonomyLevel`), `compiler`, `settings_json()` |
| C2 | Reversibilitäts-Klassifikation je Tool sichtbar machen → harte Gates nur an irreversiblen Punkten (MD: ~0,8 % der Aktionen irreversibel). `ToolRisk=high` → Pflicht-HITL bereits da; um „irreversibel"-Flag erweitern. | Ja / hoch | P1 | M | `schemas.harness.ToolSpec`, `catalog` |
| C3 | Credential-/Transcript-Hygiene: deny `Read(./.env)`/Secret-Globs, `cleanupPeriodDays`, `CLAUDE_CODE_SKIP_PROMPT_HISTORY` in `settings.json`/`.env.example`. | Ja / hoch | P1 | S | `templates.settings_json()`, `env_example()` |
| C4 | OTel-/Telemetrie-Hinweis operationalisieren: Cowork-Audit-Lücke (MD §5/§9) explizit in HANDOVER + optionalem `otel`-Konfig-Snippet adressieren; der `audit-log`-Hook bleibt die datei-seitige Kompensation. | Teilweise / ehrlich begrenzt | P2 | S | `templates.handover_md()` |
| C5 | Stopping-Conditions vereinheitlichen: `MAX_HARNESS_ITERATIONS=25` (Build) vs. Reviewer „max 3 Runden" — als bewusste, dokumentierte Schwellen ausweisen (MD §2: Stopping-Conditions). | Ja / Klarheit | P2 | S | `schemas.harness`, Doku |

> **Bewusst begrenzt (kein Datei-Fit):** Cowork-Ask/Act-Modi, Folder-Zonen, Delete-Schutz, Projects/Memory
> sind **App-/Host-Layer** und nicht per ZIP erzwingbar (MD §5: „Virtualisierungsgrenze, keine Prompt-Anweisung").
> → Gehört in Anwender-Doku/HANDOVER, nicht in den Harness. Nicht als Lücke, sondern als Scope-Grenze führen.

---

## Bucket D — Methodik & UX (P1/P2, Anschlussfähigkeit)

> **Hypothese:** Ein Weltklasse-Tool spricht die Standardsprache seiner Nutzer (RACI, sichtbare Legenden)
> und macht seine Methode (McKinsey: MECE, Pyramid, hypothesengetrieben) im Output sichtbar — nicht nur intern.

| # | TODO | Schließbar? / Fit | Prio | Aufwand | Dateien |
|---|---|---|---|---|---|
| D1 | **PVM-Code-Legende einblenden** (Sofort-Fix): Code→Bedeutung-Tabelle unter die Matrix (Daten in `PVM_TITLE`/`PVM_LABEL` vorhanden, nur nicht gerendert). | Ja / **trivial** | **P0** | S | `components/PlanViews.tsx`, `app/projects/[id]/plan/page.tsx` |
| D2 | **RACI-Anzeige** gemäß Entscheidung D1: RACI-Badges als Standard + Legende, PV↔RACI-Toggle; interne ZGPM-Rules unverändert. | Ja / hoch (s. D1-Entscheid) | **P1** | M | `PlanViews.tsx`, `lib/api.ts`, `templates.plan_pvm()` |
| D3 | RACI-Konsistenz-Check anzeigen: „genau ein Accountable" (== genau ein F/L), „≥1 Responsible" — bestehende Inline-Validierung auf RACI-Labels mappen. | Ja / hoch | P1 | S | `PlanViews.tsx` |
| D4 | McKinsey-Prinzipien im Reviewer sichtbar als eigene Findings ausweisen (MECE-Lücken, Pyramid/Hypothese) — heute nur in `harness-snap`/Prompt erwähnt. | Ja / mittel | P2 | M | `compiler._detect_anti_patterns()`, Reviewer-Skill |
| D5 | Export der Matrix (RACI/PVM) als eigenständiges Artefakt (CSV/MD) im ZIP für Audit-Ablage. | Ja / mittel | P2 | S | `templates`, `compiler.build_files()` |

---

## Bucket E — Verifikation & Qualität (P0/P1, „höchster Hebel")

> **Hypothese (MD §4/§8):** „Give Claude a way to verify its work" ist der höchste Hebel.
> Das Tool prüft Pläne (Rules-Engine), aber den **kompilierten Harness-Output** noch nicht gegen reale Runtime-Schemata.

| # | TODO | Schließbar? / Fit | Prio | Aufwand | Dateien |
|---|---|---|---|---|---|
| E1 | Schema-Validierungs-Suite (s. A3): jeder generierte Artefakttyp gegen offizielles Schema. | Ja / essenziell | **P0** | M | `api/tests/` |
| E2 | Smoke-Test „echter Lauf": exportierten Harness in einer Claude-Code-Sandbox `--permission-mode dontAsk` headless starten, prüfen ob Hooks/Agenten laden. | Ja / hoch | P1 | L | CI-Job |
| E3 | Adversariale Review als fester Schritt (frischer Kontext, nur Korrektheit) auf den kompilierten Harness — analog MD-Empfehlung. | Ja / hoch | P1 | M | Reviewer-Subagent |
| E4 | Determinismus-Test: derselbe Plan → bit-identischer ZIP-Hash (Eigenschaft laut `compiler`-Docstring) als Regressionstest. | Ja / Trust | P2 | S | `api/tests/` |

---

## Priorisierte Reihenfolge (Pyramid → Aktion)

1. **P0 / diese Woche:** D1 (Legende, trivial) → A1, A2 (Schema-Treue) → A3/E1 (Validierungs-Gate).
   *Begründung: ohne korrektes Schema ist alles andere kosmetisch.*
2. **P1 / kurzfristig:** B1 (.mcp.json), B3 (Permission-Modi), C1 (Reifegrad-Achse), D2/D3 (RACI), B4 (Commands→Skills), C3 (Hygiene).
3. **P2 / mittelfristig:** B2/B5/B6, C2/C4/C5, D4/D5, E2/E3/E4.

**Schwellen (MD §8), die Stufenwechsel kippen:** Stufe 2→3 erst, wenn E1/E2 (deterministische Verifikation) steht;
`auto`/`acceptEdits` nur mit Sandbox (B6); `bypass` nur im internetlosen Container.

---

*Erstellt für exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust. Keine 100%-Claims; Stand gegen die jeweils aktuelle Claude-Code-Doku verifizieren (MD §9).*
