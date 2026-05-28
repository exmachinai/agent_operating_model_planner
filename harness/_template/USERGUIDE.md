# User Guide — Agent-Harness

> Bedienungsanleitung. Lies das nach `INSTALL.md`.
> **Wo der Harness läuft:** in **Claude Code**. Dort werden Subagenten gespawnt, Skills aktiviert, Hooks gefeuert.
> **Woher du Hilfe bekommst:** aus **Cowork**. Dort wird installiert, konfiguriert, erklärt, troubleshootet.
> Du brauchst kein ZGPM-Vorwissen — die wichtigsten Konzepte stehen auf einer halben Seite.

---

## Inhalt

1. [Was ist dieser Harness?](#was-ist-dieser-harness)
2. [Grundkonzepte in 5 Minuten](#grundkonzepte-in-5-minuten)
3. [Quick Start — der erste Run](#quick-start--der-erste-run)
4. [Slash-Commands](#slash-commands)
5. [Anatomie des Harness](#anatomie-des-harness)
6. [Plan-YAML editieren](#plan-yaml-editieren)
7. [HITL-Workflows](#hitl-workflows)
8. [Risiko-Dashboard lesen](#risiko-dashboard-lesen)
9. [Checkpoint / Resume](#checkpoint--resume)
10. [Eigenen Subagenten hinzufügen](#eigenen-subagenten-hinzufügen)
11. [Eigenes Skill hinzufügen](#eigenes-skill-hinzufügen)
12. [Eigenen Hook hinzufügen](#eigenen-hook-hinzufügen)
13. [Export zurück nach Excel](#export-zurück-nach-excel)
14. [Häufige Aufgaben — Cookbook](#häufige-aufgaben--cookbook)
15. [Glossar](#glossar)

---

## Was ist dieser Harness?

Der Harness ist die **ausführbare Form eines ZGPM-Projektplans**. Statt einer Excel-Datei voller Tabellen liegt der Plan hier als YAML vor. **Claude Code** oder **Cowork** lesen ihn, registrieren die mitgelieferten Subagenten und Skills, und führen den Plan Schritt für Schritt aus. Du als **HITL-PM** (Human-in-the-Loop-Projektleiter) entscheidest die Meilensteine, die Agenten erledigen die Aktivitäten.

Drei Dinge passieren parallel:

1. **Claude Code / Cowork** orchestriert den Ablauf — welcher Meilenstein als nächstes, wer macht was.
2. **Subagenten** (aus `.claude/agents/`) führen Aktivitäten in isolierten Kontexten aus.
3. **Du** wirst nach den Approval-Regeln aus der PVM gerufen, wenn ein Meilenstein zur Freigabe ansteht oder ein rotes Risiko aufblitzt.

---

## Grundkonzepte in 5 Minuten

Aus ZGPM (siehe `docs/01_zgpm-method.md` für Details):

| Begriff | Bedeutung | Beispiel |
|---|---|---|
| **Meilenstein** | Zustand, der bis zu einem Datum erreicht sein muss | „API-Architektur freigegeben" |
| **Aktivität** | Arbeit, die vor dem Meilenstein erledigt sein muss | „OpenAPI-Spec entwerfen" |
| **Phase** | Zeitabschnitt im Projekt | „Discovery", „Design", „Build", „Hardening" |
| **Ergebnispfad** | Vertikaler Stream gleichartiger Ergebnisse | `P` Personen, `S` Systeme, `O` Organisation |
| **PVM** | Verantwortlichkeitsmatrix Mensch ↔ Agent ↔ Rolle | s. Tabelle unten |
| **Risiko-Ampel** | rot / gelb / grün, propagiert nach oben | rot ⇒ HITL-Stop |

Die PVM-Codes (ZGPM-Original):

| Code | Bedeutung | Wer das typischerweise ist |
|---|---|---|
| `A` | führt aus | Subagent oder Mensch |
| `L` | leitet an + steuert Fortschritt | HITL-PM |
| `F` | steuert Fortschritt (ohne Anleitung) | Reviewer-Agent oder Lead |
| `E` | entscheidet | HITL-PM |
| `e` | entscheidet mit | Stakeholder |
| `B` | wird beteiligt | beliebig |
| `I` | wird informiert | beliebig |
| `V` | ist verfügbar | Reserve-Ressource |

Pflicht-Regeln: **≥ 1 A pro Meilenstein**, **genau ein F oder L pro Meilenstein**, **e nie ohne E**.

---

## Quick Start — der erste Run

Der Harness läuft **in Claude Code**:

```bash
cd <harness-folder>
claude
> /run-harness
```

Wenn du via Cowork installiert hast, kannst du den Run auch von dort starten — Cowork öffnet dann Claude Code im richtigen Ordner und sendet `/run-harness`. Die eigentliche Arbeit passiert in Claude Code.

**Was passiert dann?**

1. ZGPM-Konsistenz-Validierung (sollte grün sein, sonst → „Plan-YAML editieren").
2. PMO-Agent lädt MSP + PVM, plant Strategie via Extended Thinking, persistiert Lead-Plan in `memory/lead_plan.md`.
3. Erster offener Meilenstein wird betreten.
4. Der für `A` zuständige Subagent (oder du als Mensch) bekommt die Aktivitätenliste.
5. Bei Aktivitätsende: Reviewer-Agent prüft, dann HITL-PM-Approval (falls in PVM = `E` oder `L`).

**Wenn du eingebunden wirst**, erscheint im Chat:

```
─────────────────────────────────────────
HITL-APPROVAL REQUIRED — Meilenstein M03
─────────────────────────────────────────
„Datenschutzkonzept abgeschlossen"
Phase: Hardening · Ergebnispfad: O
Risiko: gelb (siehe risks.yaml#R07)
Aktivitäten: 4/4 abgeschlossen
Reviewer: PASS mit 1 Hinweis
Aufwand: 3.5 MT (geplant: 3.0)
─────────────────────────────────────────
Approve? — yes / changes / stop
```

`yes` schließt den Meilenstein, der nächste wird automatisch gestartet.

---

## Slash-Commands

Vom Harness bereitgestellt (aus `.claude/commands/`):

| Command | Zweck |
|---|---|
| `/run-harness` | Startet oder setzt den Run fort |
| `/run-harness --dry-run --only M02` | Trockenlauf für einen einzelnen Meilenstein |
| `/run-harness --headless` | Unbeaufsichtigt, HITL via Webhook |
| `/validate-plan` | ZGPM-Konsistenz-Check ohne Run |
| `/reset-milestone M03` | Setzt einen Meilenstein zurück |
| `/risk-view` | Konsolen-Dashboard der Risikoampeln |
| `/export-excel` | ZGPM-kompatibler XLS-Export |
| `/usage-report` | Token- und Tool-Call-Übersicht des aktuellen Runs |
| `/show-plan M02` | Plan-Details für einen Meilenstein |
| `/explain <command>` | In-App-Hilfe zu einem Command |

---

## Anatomie des Harness

Was wo liegt:

| Pfad | Was | Du editierst… |
|---|---|---|
| `plan/*.yaml` | dein Projektplan | gelegentlich (mit Vorsicht) |
| `CLAUDE.md` | Operating Instructions, geladen beim Start | wenn Constitution-Anpassung nötig |
| `.claude/agents/*.md` | Subagent-Definitionen | um Verhalten zu tunen |
| `.claude/skills/*/SKILL.md` | wiederverwendbare Fähigkeiten | um neue Tools/Methoden zu ergänzen |
| `.claude/commands/*.md` | Slash-Commands | für eigene Custom-Workflows |
| `.claude/hooks/` | Deterministische Enforcement-Regeln | für Quality Gates und Stops |
| `.claude/settings.json` | Model, MCP-Server, Hook-Liste | je nach Umgebung |
| `.claude/plugins/aegira-harness/` | Cowork-Plugin-Manifest | selten |
| `memory/` | Lead-Plan-Persistenz | NIE — vom Harness selbst verwaltet |
| `.env` | Secrets | je nach Umgebung |
| `.harness/` | State, Logs, Checkpoints | NIE — vom Harness selbst verwaltet |

---

## Plan-YAML editieren

**Best Practice:** Plan-Änderungen NICHT händisch im YAML — sondern entweder

- im Planner-App durchführen (saubere Versionierung, Validierung), oder
- mit dem Skill `zgpm-edit-plan` (validiert beim Speichern).

Wenn du trotzdem direkt editierst:

1. Backup machen (`cp -r plan plan.bak.$(date +%s)`).
2. Datei ändern.
3. **Vor dem nächsten Run** validieren via Slash-Command:
   ```
   /validate-plan
   ```
   Bei Fail: Fehler lesen, fixen. **Niemals** ein invalides YAML starten — der Harness ist strikt und bricht früh ab.

Häufige Edits:

| Was | Wo | Hinweis |
|---|---|---|
| Datum verschieben | `plan/msp.yaml` → `meilensteine[].geplant` | Vorgänger-Nachfolger prüfen |
| Verantwortlichen tauschen | `plan/pvm.yaml` → `matrix[<M>].<R>` | Pflicht-Regeln checken |
| Risiko ergänzen | `plan/risks.yaml` | Ampel-Farbe propagiert |
| Aktivität hinzufügen | `plan/activities/<MID>.yaml` | Aufwand auch in `effort.yaml` updaten |

---

## HITL-Workflows

Du wirst gerufen, wenn …

1. **Meilenstein-Approval** ansteht (PVM hat dich als `E` oder `L`).
2. **Risiko rot** wird (PRL oder MRL — Hook `stop-on-red.json` greift).
3. **Constitution-Safety-Guard** anspringt (Write auf geschützten Pfad).
4. **Reviewer-Agent FAIL** liefert (Konsistenz-Verletzung oder Qualität nicht in Ordnung).
5. **Token-Budget** überschritten (Hook `token-budget.json`).

Notification-Pfade konfigurierst du in `.env`:

```ini
HITL_NOTIFY_SLACK_WEBHOOK=https://hooks.slack.com/...
HITL_NOTIFY_EMAIL=mike@example.com
HITL_NOTIFY_TEAMS_WEBHOOK=https://outlook.office.com/...
```

Standardmäßig nur Chat-Output und Eintrag in `.harness/<run-id>/approvals.log`.

Approval-Optionen (immer):

- `yes` — approve, Meilenstein schließen, weiter
- `changes` — request changes, ein Korrekturlauf der zuständigen Subagents
- `comment` — kommentieren ohne Statusänderung
- `stop` — stop run, State persistieren

---

## Risiko-Dashboard lesen

```
/risk-view
```

zeigt eine Konsolen-Ansicht im Chat:

```
Meilensteinplan — Risiko-Übersicht
═══════════════════════════════════════════════════════
ID    Code  Phase     Meilenstein                Risiko
─────────────────────────────────────────────────────
M01   P1    Discovery Persona-Validierung abges. ●  gruen
M02   S1    Design    API-Architektur freigegeb. ●  gelb (R03,R07)
M03   O1    Hardening DSC-Konzept abgeschlossen  ●  rot   (R12)
─────────────────────────────────────────────────────
Gesamt: ●  rot — blockiert durch R12

R12 (rot): „BfDI-Genehmigung für DTIA fehlt"
  Maßnahme:  Termin mit BfDI-Referat 47 abgestimmt (15.06.)
  Eskaliert: M03 → HITL-PM
```

`docs/04_hitl-workflows.md` erklärt die Eskalations-Pfade im Detail.

---

## Checkpoint / Resume

Der Harness checkpointed nach jedem Subagent-Run in `.harness/<run-id>/state.json`. Wenn du Claude Code schließt oder Cowork pausierst, einfach `/run-harness` neu starten — der Run wird beim letzten validen Checkpoint aufgenommen.

Manueller Reset:

```
/reset-milestone M03
```

setzt nur einen Meilenstein zurück. Vorsicht — verlorene Approvals.

---

## Eigenen Subagenten hinzufügen

1. Datei anlegen: `.claude/agents/<name>-agent.md`.
2. Inhalt nach diesem Schema:

   ```markdown
   ---
   name: <name>-agent
   description: <was tut der Agent, wann wird er ausgewählt>
   model: claude-sonnet-4-6
   tools:
     - Read
     - Grep
     - github_*
   ---

   # <name>-agent

   ## Rolle
   Beschreibung des Verantwortungsbereichs.

   ## PVM-Default
   - Aktivität: A
   - Meilenstein: B

   ## Operating Instructions
   <wie geht der Agent vor>
   ```

3. In `plan/pvm.yaml` als Ressource zuordnen.
4. `/validate-plan` — muss grün sein.
5. Im nächsten `/run-harness` ist der Agent verfügbar.

Detailregeln: `docs/03_extension-guide.md` und `docs/04_agent-best-practices.md` (bindend).

---

## Eigenes Skill hinzufügen

1. Ordner anlegen: `.claude/skills/<skill-name>/`.
2. Darin `SKILL.md` mit YAML-Frontmatter:

   ```markdown
   ---
   name: <skill-name>
   description: <enger Scope, präzise Trigger-Bedingung>
   ---

   <Inhalt: Schritt-für-Schritt-Anleitung, Beispiele, Edge-Cases>
   ```

3. Subagenten oder Slash-Commands, die das Skill nutzen, im `tools:`-Block referenzieren.
4. Claude Code / Cowork entdeckt es beim nächsten Start automatisch.

**Wichtige Regel:** Beschreibung muss eng genug sein, dass das Skill nicht ständig fälschlich triggert — siehe `docs/04_agent-best-practices.md` §5 Anti-Pattern A24.

---

## Eigenen Hook hinzufügen

Hooks sind **deterministische** Enforcement-Regeln, die Claude nicht überspringen kann.

1. Datei in `.claude/hooks/<phase>/<name>.json` anlegen. Phasen: `pre-tool` / `post-tool` / `stop`.
2. Beispiel `pre-tool/token-budget.json`:

   ```json
   {
     "name": "token-budget",
     "trigger": "before_each_tool",
     "condition": "session.tokens_used > 500000",
     "action": "halt",
     "message": "Token budget exceeded — HITL approval required"
   }
   ```

3. In `.claude/settings.json` registrieren.

Hooks sind in Best-Practices Pflicht für: Constitution-Safety, Stop-on-red, Token-Budget. Siehe `docs/04_agent-best-practices.md`.

---

## Export zurück nach Excel

Wer ZGPM-Excel weiterhin als Single Source benutzt, kann den Plan zurückexportieren:

```
/export-excel
```

Output: ZGPM-kompatibles `.xls` (MSP + PVM + Aktivitäten-Sheets) unter `exports/aegira_plan_<YYYYMMDD>.xls`. Hinweis: Original-PwC-Makros sind **nicht** enthalten — nur die Datenstruktur.

---

## Häufige Aufgaben — Cookbook

**Wie pausiere ich einen Run?**
> Claude Code schließen oder Cowork-Tab schließen. State wird beim Schließen automatisch persistiert.

**Wie sehe ich, an welchem Knoten der Harness gerade hängt?**
> `/show-plan current` oder direkt: `cat .harness/<run-id>/state.json | jq .current_node`

**Wie führe ich nur einen einzelnen Meilenstein im Trockenlauf aus?**
> `/run-harness --dry-run --only M02`

**Wie zwinge ich einen Risk-Re-Eval?**
> `/run-harness --refresh-risk-only`

**Wie wechsle ich das LLM-Modell zur Laufzeit?**
> `.claude/settings.json` editieren (`model` ändern), `claude` neu starten / Cowork-Workspace reladen.

**Wie sehe ich Token-Verbrauch des bisherigen Runs?**
> `/usage-report`

**Wie gebe ich den Harness an einen Kollegen weiter?**
> Das Zip-Original weitergeben (nicht den entpackten Ordner — `.harness/`-State und `.env` würden mitgehen). Kollege folgt `INSTALL.md`.

**Wie debugge ich einen Subagenten, der „komisch" agiert?**
> Logs unter `.harness/<run-id>/logs/<subagent>.jsonl`. Tracing via `/run-harness --trace`.

---

## Glossar

| Begriff | Erklärung |
|---|---|
| **AEGIRA** | exmachinAIs AI-Trust-Infrastructure-Plattform (Constitution-Quelle) |
| **Aktivität** | konkrete Arbeit, die vor einem Meilenstein erledigt sein muss |
| **Claude Code** | Anthropic-CLI / IDE-Integration; primäre Runtime für den Harness |
| **Cowork** | Anthropic-Desktop-App für Tool-Integration und Non-Code-Workflows |
| **Compiler** | Werkzeug, das aus einem ZGPM-Plan ein Harness-Zip erzeugt |
| **Constitution** | AEGIRA-Grundnorm (im Knowledge-Repo); Top-Norm in diesem Repo |
| **Ergebnispfad** | vertikaler Stream gleichartiger Meilensteine (P, S, O, …) |
| **Harness** | dieser ausführbare Plan-Container |
| **HITL** | Human-in-the-Loop (du!) |
| **HITL-PM** | Projektleiter mit HITL-Rolle |
| **Hook** | deterministische Enforcement-Regel; nicht überspringbar |
| **Meilenstein** | Zustand, bis Datum X erreicht |
| **MCP** | Model Context Protocol; standardisierter Tool-Aufruf für Claude |
| **MRL** | Meilensteinrisikoliste |
| **MSP** | Meilensteinplan |
| **PRL** | Projektrisikoliste |
| **PVM** | Projektverantwortlichkeitsmatrix |
| **Phase** | Zeitabschnitt im Projekt |
| **Skill** | wiederverwendbare Fähigkeit (`SKILL.md`); wird kontextuell aktiviert |
| **Subagent** | spezialisierter Agent in eigener Kontext-Sandbox |
| **ZGPM** | „ZielGerichtetes Projekt-Management" (PwC-Methodik) |
