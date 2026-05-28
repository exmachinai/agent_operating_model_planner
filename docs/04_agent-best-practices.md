# 04 — Agent Best Practices (verbindlich)

> **Status: BINDEND.** Jeder Harness, den der Planner ausgibt, muss diesen Regeln entsprechen. Der Reviewer-Agent und der Harness-Compiler enforcen sie. Abweichungen erfordern einen HITL-Override mit Begründung.
>
> Quelle: Synthese aus Anthropic „Building Effective Agents" (Dez 2024), „How we built our multi-agent research system" (Jun 2025), Cognition „Don't Build Multi-Agents" (Jun 2025), Claude-Code-Subagent-/Skill-Patterns (Mai 2026). Vollständige Quellen siehe Ende.

---

## 1. Warum dieses Dokument existiert

Der Harness führt einen Plan aus, indem Agenten parallel und sequenziell Arbeit verrichten. **Die Architektur dieser Agentenstruktur entscheidet** über Erfolg oder Misserfolg des Plans — nicht die LLM-Qualität allein. Wir folgen den industriellen Best Practices der Agent-Builder, die heute Produktionssysteme betreiben (Anthropic, Cognition), und kodifizieren das hier als verbindlichen Referenzrahmen.

**Zwei Konsequenzen für jeden vom Planner erzeugten Harness:**

1. Pflicht-Patterns aus diesem Dokument sind eingebaut.
2. Anti-Patterns aus diesem Dokument sind ausgeschlossen, mit harten Checks im Reviewer-Agent.

---

## 2. Fünf Grundprinzipien

Aus der Synthese aller Quellen kristallisieren sich fünf Prinzipien heraus, die wir uns verbindlich auferlegen:

| # | Prinzip | Konsequenz |
|---|---|---|
| **P1** | **Simplicity over sophistication** | Beginne mit dem einfachsten System, das funktioniert. Komplexität nur wenn nachweisbar besser. |
| **P2** | **Transparency** | Planungs- und Reasoning-Schritte sind sichtbar, persistiert, auditierbar. |
| **P3** | **Agent-Computer Interface (ACI) first** | Tool-Definitionen werden so sorgfältig geprompt-engineered wie Prompts. Tools sind poka-yoke. |
| **P4** | **Share context — full traces, not messages** | Subagenten erhalten den vollständigen Trace der Vorgänger, nicht nur Einzelnachrichten. |
| **P5** | **Actions carry implicit decisions** | Parallele Agenten können nur dann nebenläufig arbeiten, wenn ihre Entscheidungen nicht kollidieren. Bei Kollisionsrisiko: sequentiell. |

P4 und P5 stammen aus dem Cognition-Manifest und sind die schärfste Erkenntnis der letzten 18 Monate Produktions-Erfahrung. Sie definieren, wann Multi-Agent **nicht** funktioniert.

---

## 3. Wann Multi-Agent — und wann nicht

### 3.1 Multi-Agent ist die richtige Wahl, wenn …

- Die Aufgabe ist **breitensuche-artig**: Mehrere unabhängige Teil-Untersuchungen, die parallel laufen können.
- Die Aufgabe ist **token-intensiv**: Eine einzelne Kontextfenster-Bilanz reicht nicht.
- Die Aufgabe hat **klare Trennungslinien**: Subdomains lassen sich definieren, ohne dass sich die Outputs widersprechen können.
- Der **Wert je Run** rechtfertigt 4–15× erhöhten Tokenverbrauch (Anthropic-Benchmark: Multi-Agent verbraucht typisch 15× Tokens vs. Chat).

Beispiele: Research-Tasks, Discovery-Phasen, breit angelegte Risikoanalysen, **Planungs-Phasen** (unser Fall).

### 3.2 Single-Threaded ist die richtige Wahl, wenn …

- Die Aufgabe hat **tight dependencies**: Jede Aktion baut auf der vorigen auf.
- Mehrere parallele Outputs würden **inkonsistente Annahmen** treffen (Cognitions „Flappy Bird"-Beispiel).
- Die Aufgabe ist **codingartig**: Aufwand wird in eine geteilte Datei/Repo geschrieben.
- Der Reviewer kann inkonsistente parallele Outputs **nicht zuverlässig reparieren**.

Beispiele: Code-Implementierung, Refactoring, Dokumentationsschreiben gegen ein bestehendes Werk, **Ausführungs-Phasen** (im Harness die Aktivitäten innerhalb eines Meilensteins).

### 3.3 Mapping auf unseren Harness

| Phase | Architektur | Begründung |
|---|---|---|
| **Plan-Erzeugung** (Planner-App) | Orchestrator-Worker mit 5 spezialisierten Subagenten + Reviewer | Breitensuche, klare Subdomains (MSP, PVM, Skills, Risiken) |
| **Plan-Validierung** | Evaluator-Optimizer-Loop (Reviewer + Iteration) | Klare Eval-Kriterien (ZGPM-Regeln) |
| **Aktivitäts-Ausführung** im Harness | Single-Threaded mit Tool-Use innerhalb eines Meilensteins | Tight dependencies pro Meilenstein |
| **Cross-Meilenstein-Parallelisierung** | Erlaubt, **wenn** Vorgänger-Nachfolger sauber getrennt sind | Anthropic Multi-Agent Research validated |
| **Reviewer-Schritte** | Separater LLM-Call (Sectioning-Pattern) | Anthropic: Guardrails getrennt vom Core-Response |

---

## 4. Pflicht-Patterns (eingebaut in jeden Harness)

### 4.1 Orchestrator-Worker für Planung

Ein **Lead-Agent** (PMO-Agent) zerlegt den Projektauftrag in Phasen + Meilensteine und delegiert Sub-Tasks an **spezialisierte Worker** (Architecture, Skill-Mapping, Risk). Jeder Worker erhält:

- die ursprüngliche User-Query **wortgetreu**,
- den Lead-Plan + bisherigen Trace,
- ein **konkretes Objective**,
- ein **Output-Format-Schema**,
- die zulässigen **Tools**,
- klare **Task-Boundaries**.

**Verboten:** vage Anweisungen wie „research X". Anthropic-Lehre: Subagenten interpretieren vage Tasks divergierend.

### 4.2 Evaluator-Optimizer (Reviewer-Loop)

Der **Reviewer-Agent** prüft jeden Output gegen klare Kriterien (ZGPM-Regeln, Konsistenz, McK-Methodentreue). Bei FAIL: Rückgabe zum Worker mit explizitem Verbesserungshinweis. Maximum 3 Iterationen, danach HITL-Eskalation.

### 4.3 Parallel-Tool-Calling

Innerhalb eines Worker-Agents werden Tool-Calls **parallel** ausgeführt, wo möglich (z.B. `github_list_repos` + `github_search_code` + `github_list_milestones` gleichzeitig). Anthropic-Daten: bis zu 90% Zeitersparnis.

### 4.4 Extended Thinking für Planung, Interleaved Thinking für Tool-Eval

Lead-Agent nutzt **Extended Thinking** für die Strategie-Planung. Subagenten nutzen **Interleaved Thinking** nach Tool-Calls, um Resultate zu bewerten und nächste Schritte zu refinen.

### 4.5 Filesystem-Artifact-Pattern

Subagenten schreiben große Outputs **direkt ins Plan-Verzeichnis** (z.B. `plan/activities/M03.yaml`) und melden dem Lead nur einen leichtgewichtigen Reference-Pointer. Spart Tokens, vermeidet „Telephone-Spiel".

### 4.6 Checkpoint + Resume

Jeder Run persistiert State nach **jedem** Knoten in `.harness/<run-id>/state.json`. Crash + Restart → automatischer Resume vom letzten validen Checkpoint. Pflicht — keine Ausnahme.

### 4.7 Skill-Granularität (Claude-Code-Pattern)

- **Skill** für wiederverwendbares Wissen + Tools (z.B. `zgpm-compose`, `risk-traffic-light`).
- **Subagent** für isolierten Kontext bei verbose Operationen (z.B. Code-Suche, Log-Analyse).
- **Hook** für deterministische Enforcement (z.B. `stop_on_red`-Hook bei roter Risikoampel).

Anthropic-Mai-2026-Lehre: **Subagents erben keine Parent-Skills.** Falls ein Subagent ein Skill braucht, wird der Skill-Inhalt beim Spawn explizit übergeben.

### 4.8 Sectioning für Guardrails

Hard Guardrails (Constitution-Safety-Guard, EU-AI-Act-Klassifikation, PII-Check) laufen als **separate LLM-Calls**, nicht als Anhang an den Worker-Prompt. Anthropic: Vermischung schadet beiden Aufgaben.

### 4.9 HITL-Approval an definierten Punkten

Approval-Pflicht (siehe USERGUIDE.md):

- Meilenstein-Abschluss (PVM = `E` oder `L`),
- Rote Risikoampel,
- Constitution-Safety-Guard-Treffer,
- LLM-Budget-Überschreitung,
- Reviewer-FAIL nach 3 Iterationen.

### 4.10 End-State Evaluation

Statt Turn-by-Turn-Validierung evaluieren wir nur den **End-State** je Meilenstein gegen die Definition of Done. Anthropic-Lehre: Bei stateful Agenten ist Process-Validierung brüchig.

### 4.11 Klare Tool-Beschreibungen mit Beispielen

Tool-Definitionen enthalten zwingend:

- klares Objective,
- Parameter-Constraints,
- gute und schlechte Beispiel-Aufrufe,
- Edge-Cases,
- klare Abgrenzung zu ähnlichen Tools,
- erwartetes Output-Schema.

Anthropic SWE-bench-Lehre: Tool-Doku ist wichtiger als Prompt-Doku.

### 4.12 Poka-Yoke-Parameter

Tool-Parameter werden so gestaltet, dass sie schwer falsch zu nutzen sind:

- **absolute** statt relativer Pfade (Anthropic-Lehre),
- Enums statt freier Strings, wo möglich,
- explizite required-Flags,
- Default-Werte für unkritische Optionen.

---

## 5. Anti-Patterns (konsequent ausgeschlossen)

Diese Muster sind in vom Planner erzeugten Harness-Strukturen **verboten**. Der Reviewer-Agent flaggt sie hart. HITL-Override möglich, aber dokumentationspflichtig.

| # | Anti-Pattern | Warum verboten | Quelle |
|---|---|---|---|
| **A1** | Peer-to-Peer-Agent-Discussion („Agenten diskutieren, bis Einigung") | Cognition: Zerstreuung von Entscheidungsbefugnis, fragil | Cognition |
| **A2** | Parallele Subagenten ohne geteilten Kontext | Cognition Flappy-Bird-Effekt: inkonsistente Outputs | Cognition |
| **A3** | Subagenten, die Code in geteilte Dateien schreiben | Tight-Dependency, gehört single-threaded | Cognition + Anthropic |
| **A4** | Vage Delegations-Instruktionen („recherchiere X") | Anthropic: Subagenten interpretieren divergent | Anthropic Multi-Agent |
| **A5** | 50 Subagenten für einfache Queries | Anthropic-Failure-Mode: Overspawning | Anthropic Multi-Agent |
| **A6** | Routing-Logik im Prompt statt im Code | Anthropic: Routing soll deterministisches Workflow-Element sein | Anthropic Effective |
| **A7** | Tools mit relativen Pfaden in stateful Agenten | Anthropic SWE-bench: Pfadfehler nach cd | Anthropic Effective |
| **A8** | Diffs als Tool-Output-Format (statt Whole-File-Rewrite) | Anthropic: zu fehleranfällig | Anthropic Effective |
| **A9** | JSON-escaped Code in Tool-Args | Anthropic: Escaping-Overhead frisst Modell-Aufmerksamkeit | Anthropic Effective |
| **A10** | Single-LLM-Call macht Guardrails UND Core-Response | Anthropic Sectioning: getrennt = besser | Anthropic Effective |
| **A11** | Keine Retry/Checkpoint-Logik | Anthropic: Errors kompoundieren in stateful Agents | Anthropic Multi-Agent |
| **A12** | Sequentielle Tool-Calls, wo parallel möglich | Anthropic: bis zu 90% Zeitverlust | Anthropic Multi-Agent |
| **A13** | Versteckte Reasoning-Schritte (kein Extended Thinking, keine Logs) | P2 Transparenz, Debugging unmöglich | Anthropic Effective |
| **A14** | Tools ohne Beispiele und Edge-Cases in der Beschreibung | Anthropic ACI: Tool-Doku ≈ Prompt-Doku | Anthropic Effective |
| **A15** | Subagenten, die Skills aus dem Parent-Kontext „erben" | Anthropic Mai 2026: Skills werden explizit injiziert | Anthropic Claude Code |
| **A16** | Lange/spezifische Suchqueries als Default | Anthropic: erst breit, dann eng | Anthropic Multi-Agent |
| **A17** | Endlos-Loops ohne Stop-Conditions | Anthropic: max-Iterations ist Pflicht | Anthropic Effective |
| **A18** | Framework-Abstraktion ohne SDK-Verständnis | Anthropic: häufige Fehlerquelle | Anthropic Effective |
| **A19** | Token-Budgets ohne Validation | Anthropic: Multi-Agent verbrennt 15× Tokens | Anthropic Multi-Agent |
| **A20** | Multi-Agent ohne klare Wert-vs-Kosten-Rechnung | Anthropic: nur lohnenswert bei hohem Task-Wert | Anthropic Multi-Agent |
| **A21** | Asynchrone Subagent-Koordination ohne State-Konsistenz-Modell | Anthropic: Coordination-Cost > Speed-Gain | Anthropic Multi-Agent |
| **A22** | Verzicht auf End-State-Eval bei stateful Tasks | Anthropic: Process-Eval brüchig | Anthropic Multi-Agent |
| **A23** | Tool-Set-Überlappung ohne klare Abgrenzung | Anthropic: führt zu falscher Tool-Wahl | Anthropic Multi-Agent |
| **A24** | Skills, die zu breit triggern | Skill-Hygiene: enger Scope, präzise Description | Anthropic Claude Code |
| **A25** | „Long-context = unlimited" Annahme | Cognition + Anthropic: 200k-Limit, Kompression nötig | Cognition |

---

## 5a. Pflicht-Discovery vor jeder Planung — Zielplattform

Bevor der PMO-Agent Phasen und Meilensteine zerlegen darf, ist eine **Pflicht-Discovery der technischen Zielplattform** notwendig. Sie wird beim Setup jedes Harness explizit erfragt und im Plan persistiert. Sie steuert nachgelagert:

- die Auswahl der Skills (z.B. `azure-bicep-template` vs. `aws-cdk-template`),
- die Referenzen auf MCP-Server (z.B. `azure-mcp`, `aws-mcp`, `kubernetes-mcp`),
- die Deployment-Patterns im Harness,
- das Risiko-Katalog-Set des Risk-Agent (z.B. Azure-AI-Foundry-Quota vs. AWS-Bedrock-Region-Verfügbarkeit),
- die Compliance-Defaults (Datenresidenz, Hyperscaler-Verträge).

Pflicht-Erst-Frage im Discovery-Dialog ist die **Projekt-Natur**:

| Projekt-Natur | Bedeutung |
|---|---|
| `concept` | Reines Konzept-/Strategie-/Methodik-/Doku-Projekt. Kein technisches Deployment vorgesehen. Beispiele: Strategie-Paper, Whitepaper, Schulungskonzept, Operating-Model-Design, Governance-Framework. |
| `technical` | Projekt mit konkreter Software-/Infrastruktur-Komponente. Folgefrage: Zielplattform (siehe unten). |
| `hybrid-concept-tech` | Strategischer Hauptteil plus kleinerer Tech-Anteil (z.B. Proof-of-Concept). Folgefrage: Zielplattform. |

**Bei `concept`**: keine Plattform-Folgefrage. Skills werden auf Methodik-/Doku-Set reduziert (`zgpm-compose`, `markdown-writer`, `docx-export`, `pptx-export`, `mck-pyramid`, `mece-check`). Risk-Agent fokussiert auf inhaltliche und prozessuale Risiken (Stakeholder, Quellen, Methodik-Verstoß), nicht auf technische.

**Bei `technical` oder `hybrid-concept-tech`**: Zweite Pflicht-Frage zur Zielplattform:

| Option | Folgekonfiguration |
|---|---|
| `azure` | Default-Region EU (Sweden Central / West Europe); Skills: Bicep, Container Apps, AI Foundry; MCPs: `azure-mcp`, `azure-foundry-mcp` |
| `aws` | Default-Region eu-west-1 / eu-central-1; Skills: CDK/CloudFormation; MCPs: `aws-mcp`, `bedrock-mcp` |
| `gcp` | Default-Region europe-west*; Skills: Terraform/Deployment Manager; MCPs: `gcp-mcp` |
| `on-prem` | Skills: Kubernetes, Helm, Argo; MCPs: `kubernetes-mcp` |
| `hybrid-cloud` | Kombination aus Azure/AWS/GCP plus On-Prem; Deployment-Strategie wird zusätzlich erfragt |
| `multi-cloud` | Mindestens zwei Hyperscaler; Compliance-Risiken werden besonders eng geprüft |
| `claude-code-only` | Nur Subagenten/Skills, keine Cloud-Infrastruktur — der Harness selbst ist die „Plattform" |

Speicherort: `plan/project.yaml`:

```yaml
project_nature: concept | technical | hybrid-concept-tech
target_platform: azure | aws | gcp | on-prem | hybrid-cloud | multi-cloud | claude-code-only | null
```

Reviewer-Agent prüft die Konsistenz mit den ausgewählten Skills und MCPs.

**Anti-Pattern:** Projekt-Natur oder Plattform werden implizit aus dem ersten Tool-Call abgeleitet. Verboten — beide Entscheidungen müssen explizit, dokumentiert und auditierbar sein.

---

## 6. Pflicht-Agenten-Inventar (Planungs-Phase)

Der Planner-Compiler erzeugt **mindestens** diese fünf Agenten plus den HITL-PM:

| Agent | Pattern-Rolle | Verantwortung | Tools (typisch) |
|---|---|---|---|
| **PMO-Agent** | Orchestrator (Lead) | Zerlegt User-Auftrag in Phasen + Meilensteine (ZGPM-MSP); delegiert | `zgpm-compose`, `github_*` (read), `extended_thinking` |
| **Architecture-Agent** | Worker (specialist) | Leitet Rollenmodell und PVM aus MSP + Auftragskontext ab | `pvm-validate`, `extended_thinking` |
| **Skill-Mapping-Agent** | Worker (specialist) | Mappt Aktivitäten auf Skill-Bedarfe + erzeugt SKILL.md-Stubs | `skill-template`, `mcp-registry-search` |
| **Risk-Agent** | Worker (specialist) | Befüllt PRL + MRL aus Anti-Pattern-Bibliothek + Domänenwissen | `risk-traffic-light`, `extended_thinking` |
| **Reviewer-Agent** | Evaluator-Optimizer | Konsistenz-Checks (ZGPM-Regeln, McK-MECE, Anti-Pattern-Scan) | `zgpm-rules-engine`, alle Read-Tools |
| **HITL-PM** | Human Supervisor | Approvals an definierten Stellen | n/a — Notification-Channels |

**Optional erzeugbar** (vom Reviewer-Agent bei Bedarf vorgeschlagen):

- **Cost/Effort-Agent** — bei großen Plänen mit Pivot-Bedarf.
- **Compliance-Agent** — bei regulierten Domänen (EU AI Act, ISO 42001, DSGVO, DORA, NIS-2).
- **Methodology-Guard-Agent** — bei explizitem McK-/ZGPM-Treue-Anspruch (für unseren Use-Case Pflicht).

---

## 7. Ausführungs-Phase im Harness (Subagent-Patterns)

Der Harness führt den Plan aus. Jeder Meilenstein bekommt **einen** Lead-Subagenten (PVM-`A`-Inhaber) plus Tool-Use innerhalb seines Kontexts. **Nicht** mehrere Subagenten, die in derselben Datei arbeiten.

Cross-Meilenstein-Parallelisierung ist erlaubt, **wenn**:

- die Meilensteine **keinen Vorgänger-Nachfolger-Pfad** teilen,
- **keine geteilten Output-Pfade** (Dateien) existieren,
- der Reviewer-Agent die Outputs konsolidieren kann.

Anders: sequenziell.

---

## 8. Tool-Design-Pflichten (ACI)

Jedes Tool im Harness erfüllt:

1. **Naming** — `{service}_{action}_{resource}` (snake_case, service-prefixed).
2. **Description** — klares Objective + Parameter + Return-Schema + Gut/Schlecht-Beispiele + Edge-Cases.
3. **Annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` korrekt gesetzt.
4. **Input-Validation** — Zod (TS) oder Pydantic (Py), `strict`-Mode, keine `any`.
5. **Pagination** — alle List-Tools: `limit`, `offset`, `has_more`, `next_offset`.
6. **Response-Format** — `markdown` (default) und `json` (für programmatische Caller).
7. **Character-Limit** — Truncation bei 25k mit klarem Hinweis auf nächsten Schritt.
8. **Actionable Errors** — jeder Error-Pfad sagt, was als nächstes zu tun ist.
9. **Absolute Paths** — überall, wo Pfade Parameter sind.
10. **Self-Test** — jedes Tool hat einen `_test`-Eintrag in `tools/_tests/`, der den Happy-Path und ein Fehler-Szenario abdeckt.

---

## 9. Context-Engineering-Regeln

1. **Vollständiger Trace an Worker** — jeder Worker bekommt ursprünglichen User-Prompt + Lead-Plan + bisherigen Trace. Nicht nur Einzelnachricht.
2. **Memory-Persist beim Lead** — Lead-Plan in `memory/lead_plan.md` schreiben, bevor Subagenten gespawnt werden. Schützt vor Context-Window-Truncation.
3. **Kontext-Kompression bei >70% Context-Fill** — separater Compression-Agent oder explizite Summary-Anweisung an den Lead. Cognition-Pattern.
4. **Subagent-Filesystem-Output** — bei großen Outputs nur Referenz an Lead, voller Inhalt im Filesystem.
5. **Geteilter Workspace** — alle Plan-YAMLs liegen unter `plan/`, alle Logs unter `.harness/<run-id>/logs/`, alle Memory-Snapshots unter `.harness/<run-id>/memory/`.

---

## 10. Evaluations-Pflichten

Pro Harness werden mindestens **drei** Eval-Sets gepflegt:

1. **Unit-Evals** — pro Tool ein Smoke-Test (Happy + Error).
2. **End-State-Evals** — pro Meilenstein eine Definition-of-Done als prüfbarer Soll-Zustand (Anthropic-Pattern).
3. **Plan-Konsistenz-Evals** — ZGPM-Regeln (≥1 A, genau 1 F/L, „e" nie allein), McK-MECE der Phasen, Risiko-Ampel-Konsistenz.

Eval-Methodik:

- **Start mit 20 Beispielen**, nicht warten bis Hunderte vorliegen (Anthropic-Multi-Agent-Lehre).
- **LLM-as-Judge mit Rubrik**: Genauigkeit, Vollständigkeit, Source-Qualität, Tool-Effizienz, alles 0.0–1.0 plus Pass/Fail.
- **Manuelle Human-Eval** für Edge-Cases. Pflicht: mindestens 5 manuelle Reviews je Release.

---

## 11. Production-Reliability-Pflichten

1. **Rainbow-Deployment** für Runtime-Updates — nicht abrupt umstellen.
2. **Token-Budget-Cap** je Run (in `.env`), Hard-Stop bei Überschreitung.
3. **Observability** — vollständiges Tracing aller Agenten-Entscheidungen (ohne User-PII).
4. **Long-Horizon-Conversation-Management** — Auto-Summarize completed phases, Spawn fresh Subagents mit Handoff.
5. **Error-Recovery** — Tool-Fail dem Agenten als Info geben, nicht silent retryen.

---

## 12. Wert-vs-Kosten-Schwelle

Multi-Agent-Setup ist nur lohnend, wenn **alle drei** gelten:

- Task-Wert > 4× Single-Agent-Kosten (Anthropic-Faustregel),
- Task ist breitensuche-artig oder kontext-explodierend,
- Outputs lassen sich ohne Konflikte parallelisieren.

Sonst: Single-Threaded-Linear. Auch wenn es weniger spektakulär aussieht.

---

## 13. Was der Reviewer-Agent prüft (Checkliste)

Bei jedem Plan-Build und jedem Harness-Build wird durchlaufen:

```
[ ] P1 — Architektur ist so einfach wie möglich?
[ ] P2 — Reasoning-Schritte sichtbar/persistiert?
[ ] P3 — Alle Tools entsprechen ACI-Regeln (§8)?
[ ] P4 — Worker erhalten vollen Trace (§9.1)?
[ ] P5 — Keine konfligierenden parallelen Entscheidungen (§3.2 violations)?
[ ] ZGPM — ≥1 A je MS/Aktivität, genau 1 F/L, „e" nie allein
[ ] MECE — Phasen + Ergebnispfade orthogonal
[ ] Anti-Patterns A1–A25 — keiner vorhanden
[ ] Eval-Sets — Unit + End-State + Konsistenz vorhanden
[ ] Token-Budget — definiert und enforced
[ ] HITL-Approval-Punkte — vollständig
[ ] Constitution-Safety-Guard — aktiv
```

Bei FAIL: Eintrag in `.harness/<run-id>/reviewer.log` mit Begründung und Fix-Vorschlag. Bei wiederholtem FAIL: HITL-Eskalation.

---

## 14. Mapping zur AEGIRA-Constitution

Diese Best Practices sind **kompatibel** mit der Constitution:

- Keine 100%-Garantien — Reviewer prüft Outputs, garantiert sie aber nicht absolut.
- AIMS-Maturity — entspricht der Maturity-Bewertung der Eval-Sets.
- Trust-Infrastructure — Audit-Trail durch volle Observability gegeben.
- Keine Constitution-Zone-2-Writes ohne Acknowledgement (siehe `mcp/github-pat-mcp-server/src/guard.ts`).

---

## 15. Versions-Notiz

Schema-Version dieses Dokuments: **1.0** (28.05.2026).

Änderungen an diesem Dokument berühren die Reviewer-Agent-Regeln und brauchen daher einen formalen PR mit Methodology-Guard-Review.

---

## Quellen

Primär:

- Anthropic Engineering, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) (Dez 2024) — Workflows-vs-Agents-Unterscheidung, 5 Pattern (Prompt-Chaining, Routing, Parallelization, Orchestrator-Worker, Evaluator-Optimizer), drei Kern-Prinzipien, Tool-Design-Best-Practices.
- Anthropic Engineering, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (Jun 2025) — Lead-Agent + Parallel-Subagent-Architektur, 8 Prompt-Prinzipien, Tool-ACI, Eval-Strategie, Production-Reliability.
- Cognition AI, [Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents) (Jun 2025) — Zwei Kern-Prinzipien (Share Context, Actions = Decisions), Multi-Agent-Brüchigkeit, Context-Engineering, Claude-Code-Subagent-Pattern als Beispiel.

Sekundär:

- Anthropic Engineering, [Best practices for Claude Code](https://www.anthropic.com/engineering/claude-code-best-practices) — Subagent + Skill + Hook-Granularität.
- [Introduction to subagents](https://anthropic.skilljar.com/introduction-to-subagents) — Skill-Inheritance-Limitation.
- [Claude Code: Hooks, Subagents, and Skills — Complete Guide](https://ofox.ai/blog/claude-code-hooks-subagents-skills-complete-guide-2026/) (2026) — moderner Mental Model.
- [A Mental Model for Claude Code: Skills, Subagents, and Plugins](https://levelup.gitconnected.com/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05) — Skill-Discovery-Patterns.
- [Claude Code in Enterprise Codebases](https://pasqualepillitteri.it/en/news/2794/claude-code-enterprise-codebase-anthropic-best-practices) (Mai 2026) — Anthropic-Enterprise-Rollout-Lessons.
- [9 Tips for Building Claude Agent Skills](https://medium.com/@tahirbalarabe2/9-tips-for-building-claude-agent-skills-3bca85c47a26) — Skill-Description-Hygiene.
- [Claude Code Best Practices: The Working Developer's Playbook for 2026](https://beginnersinai.org/claude-code-best-practices/) — Produktions-Patterns.
- [Claude Code Skills Complete Guide: SKILL.md, MCP, Subagents & Teams (2026)](https://duet.so/guides/claude-code-skills-complete-guide).
- [Claude Code Agents & Subagents: Complete Guide to Autonomous AI Coding (2026)](https://skillsplayground.com/guides/claude-code-agents/).

Standards / Background:

- [Model Context Protocol Specification](https://modelcontextprotocol.io) — Tool-/Resource-/Prompt-Konventionen.
- LangGraph Multi-Agent Patterns Dokumentation — Supervisor-/Worker-Patterns.

Methodisch parallel gehalten (nicht 1:1 übernommen):

- McKinsey-Prinzipien — MECE-Strukturierung, Pyramid Principle (in Meilenstein-Statussen), Hypothesis-driven Activity-Design.
- PwC ZGPM (Glasner et al.) — siehe `docs/01_zgpm-method.md`.
