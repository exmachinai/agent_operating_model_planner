# 07 — Prozessablauf (User-Journey, McKinsey-optimiert)

> Kanonische Beschreibung des End-to-End-Prozesses, den der AEGIRA Agent Operating
> Model Planner für den Anwender durchläuft — von der formlosen Projektidee bis zum
> exportierten, lauffähigen Agent-Harness. Begleitdokument zum `AEGIRA_Planner_User_Guide.pptx`.
>
> Methodische Basis: ZGPM (`01_zgpm-method.md`), McKinsey-Prinzipien (MECE, Pyramid,
> Hypothesengeleitet), Agent-Best-Practices (`04_agent-best-practices.md`),
> UX-Norm (`05_ux-ui-best-practices.md`). Bei Konflikt gilt die Constitution.

## Leitidee

Agenten sind digitale Mitarbeiter. Wer sie wie ein Team behandelt — mit Plan, Rollen,
Fähigkeiten und Governance — baut bessere Systeme als wer rein technisch startet
(Prompt → Tool → Workflow). Der Prozess führt den Anwender deshalb **organisatorisch
zuerst**: Projektverständnis und Plan stehen vor der Technik. Die Technik wird aus dem
Plan abgeleitet, nicht umgekehrt.

## Drei Makro-Phasen, neun Schritte, drei Gates, drei Schleifen

Der Ablauf ist MECE in drei Makro-Phasen gegliedert. Jede Phase endet an einem harten
Freigabe-Gate (Human-in-the-Loop). Drei Rückkopplungs-Schleifen sind eingebaut und
jeweils begrenzt, damit der Prozess konvergiert.

| Makro-Phase | Schritte | Gate am Ende | Schleife in der Phase |
|---|---|---|---|
| **VERSTEHEN** | 1 Beschreiben · 2 Interview · 3 Verständnis | **Gate 1 — Verständnis-Freigabe** | Interview-Schleife (Rückfrage ↔ Antwort) |
| **PLANEN** | 4 Verwalten · 5 Leitplanken · 6 ZGPM-Plan · 7 Review | **Gate 2 — Plan-Freigabe** | Reviewer-Schleife (Evaluator-Optimizer, max. 3×) |
| **BAUEN** | 8 Harness · 9 Export | **Gate 3 — Harness-Freigabe** | Iterations-Schleife (Vorschlag ↔ Anpassung) |

```
VERSTEHEN ──► ◆Gate 1 ──► PLANEN ──► ◆Gate 2 ──► BAUEN ──► ◆Gate 3 ──► Claude Code
   ↺ Interview              ↺ Reviewer (max 3×)        ↺ Iteration
```

## Die neun Schritte im Detail

Jeder Schritt ist nach demselben didaktischen Muster dokumentiert: **Ziel · Eingabe ·
Was das System tut · Ausgabe/Artefakt · Kontrollpunkt**.

### Schritt 1 — Projekt in eigenen Worten beschreiben (VERSTEHEN)
- **Ziel:** Das System erfasst das Vorhaben formlos, in der Sprache des Anwenders.
- **Eingabe:** Freitext, keine Struktur und keine Fachbegriffe nötig.
- **System:** Liest mit, speichert nichts ohne Bestätigung, bereitet die erste Rückfrage vor.
- **Ausgabe:** Roh-Brief als Ausgangspunkt.
- **Kontrollpunkt:** Anwender klickt „Weiter“.

### Schritt 2 — Schärfungs-Interview nach McKinsey (VERSTEHEN)
- **Ziel:** Aus der Idee wird ein präzises Verständnis: Projektart, Umfang, Fähigkeiten.
- **Eingabe:** Antworten auf gezielte Rückfragen, eine nach der anderen.
- **System:** Fragt **MECE** (vollständig, überschneidungsfrei) und **hypothesengeleitet**
  nach — testet Annahmen, statt offen zu sammeln — und macht aktiv Vorschläge
  (Projektart, Skill-Set).
- **Ausgabe:** Strukturierte Annahmen + Vorschläge.
- **Kontrollpunkt:** Jeder Vorschlag ist annehmbar, änderbar oder verwerfbar (Interview-Schleife).

#### Schritt 2a — Zusätzlichen Kontext einspeisen (Datei-Upload / Cloud-Quelle)
Neben dem Dialog kann der Anwender weiteren Kontext zur **Schärfung der Fragestellung**
hinzufügen. Zwei Wege:
- **Datei-Upload** (Phase A, in-App): `.docx`, `.md`, `.pdf`, `.txt`, `.pptx`, `.xlsx`.
  Extrahiert werden **Fließtext und Tabellen**. Grenzen: **25 MB/Datei**, **max. 20
  Dokumente/Projekt**; harte Obergrenze ist das **Token-Budget** an Foundry
  (Cap ≈ **150 000 Tokens** geparster Text je Schärfungs-Runde, darüber Auswahl/Truncation).
- **Cloud-Quelle** (Phase B, später): lebende OAuth-Anbindung an SharePoint/OneDrive/
  Dropbox/Azure Blob, vor Gate 1 fortlaufend lesbar. Braucht App-Registrierung + Tenant-Secrets.

> **Umsetzung (Spike).** Phase B ist als ehrlicher Connector-Scaffold angelegt:
> `app/context/connectors.py` führt eine Registry der vier Anbieter mit Scopes und
> benötigten Env-Vars. `GET …/context/cloud/providers` meldet je Anbieter `configured`
> oder **`blocked`** samt fehlender Konfiguration; `POST …/context/cloud/connect`
> hebt bis zur OAuth-App-Registrierung bewusst **501** mit klarer Begründung — kein
> vorgetäuschter Halb-Connect. Die UI (Schritt 2) zeigt die Anbieter mit Status; die
> echte OAuth-/Lese-Implementierung folgt, sobald Registrierungen + Secrets vorliegen.

**Inhalt vs. Nachweis (Datenschutz, kritisch für AEGIRA):**
- **Inhalt** ist **ephemer** — geparst, an Foundry zur Schärfung gegeben (ohne Redigierung),
  danach **verworfen**; keine Persistenz der Bytes/Volltexte in Cosmos oder Blob. Damit ist
  DSGVO-Art.-17 trivial (es existiert keine dauerhafte Kopie).
- **Nachweis** ist **dauerhaft** — pro Quelle nur Metadaten als zitierbares Evidenz-Asset:
  Dateiname, Herkunft/URI, **SHA-256-Hash**, Größe, Format, geschätzte Tokens, wer/wann.
  Mandantenisoliert am Projekt.

**Gate- & Reversibilitäts-Logik:** Quellen sind **vor Gate 1 frei hinzufügbar/entfernbar**
und werden mit der Verständnis-Freigabe **eingefroren** (Hash-Snapshot, append-only) — der
ephemere Inhalts-Cache wird beim Freeze geleert. Die eingefrorenen Quellen erscheinen im
**ZGPM-Plan** und beim **Reviewer** als nachvollziehbare **Quellen-Referenz** (Buyer-Promise
„evidence-based"). Geltungsbereich endet mit dem exportierten Harness.

### Schritt 3 — Projektverständnis & Agentenstruktur freigeben (VERSTEHEN)
- **Ziel:** Eine pre-finale Zusammenfassung plus die Agenten, die den Plan bauen werden.
- **Eingabe:** Korrekturen an Details.
- **System:** Verdichtet alles (Pyramid: Kernaussage zuerst) und leitet die nötige
  **Planungs-Agentenstruktur** ab (Standard: PMO, Architecture, Skill-Mapping, Risk, Reviewer).
- **Ausgabe:** `project.yaml` mit `project_nature` (concept/technical/hybrid) und Zielplattform.
- **Kontrollpunkt:** **Gate 1.** Ohne Freigabe startet keine Planung.

### Schritt 4 — Projekte verwalten (PLANEN)
- **Ziel:** Jedes Projekt bleibt erhalten, in jeder Phase auffindbar.
- **Eingabe:** Öffnen, Kopieren (als Vorlage), Löschen.
- **System:** Speichert jede Phase als eigene, unveränderliche Version (append-only) und
  zeigt den Status `planning → reviewing → approved → compiled → archived`.
- **Ausgabe:** Versionierter Projektbestand.
- **Kontrollpunkt:** Löschen wird gesondert bestätigt.

### Schritt 5 — Leitplanken: was geht, was nicht (PLANEN)
- **Ziel:** Anwender versteht den erlaubten Rahmen, bevor geplant wird (Front-loaded Discovery).
- **System verweigert:** Waffen & gefährliches Dual-Use; Bio-/Chemie-/Nuklear-Gefahren;
  Diskriminierung & unfaire Benachteiligung; Malware, Exploits & Spoofing; nach EU AI Act
  **verbotene Praktiken** (z. B. Social Scoring, manipulatives/unterschwelliges Profiling,
  biometrische Massenüberwachung).
- **Was geht (Projektart):** `concept` (Methodik & Dokumente: docx-, pptx-, markdown-,
  MECE-, Pyramid-Skills), `technical` (Architektur & Code) oder `hybrid` (beides).
- **Kontrollpunkt:** Grenzfälle werden zur Prüfung an den Anwender **eskaliert**, nicht still entschieden.

### Schritt 6 — Der ZGPM-Plan entsteht (PLANEN)
- **Ziel:** Aus dem Verständnis bauen die Agenten einen vollständigen, methodischen Plan.
- **System:** **Orchestrator-Worker** — PMO zerlegt in Phasen & Meilensteine und delegiert;
  Worker füllen Rollen/PVM, Risiken (PRL/MRL), Aufwände parallel. Der **Reviewer** prüft
  gegen die ZGPM-Regeln (Evaluator-Optimizer, max. 3 Runden).
- **Ausgabe (vorgelegt als Screen / XLSX / PPTX / DOCX):**
  Gantt-Meilensteine, Risk-Matrix (Eintritt × Auswirkung), RACI/PVM, Zeitplanung,
  Kosten als **Token-Budget je Agent & Knoten**, Agenten-Ressourcen/Auslastung.
- **Kontrollpunkt:** Bei roter Risiko-Ampel oder ungelöstem Konflikt entscheidet der Anwender.

### Schritt 7 — Review & Edit am Bildschirm (PLANEN)
- **Ziel:** Der Anwender macht den Plan zu seinem Plan.
- **Eingabe:** Text direkt anklicken und ändern, Sprache umschalten (DE/EN), Werte anpassen.
- **System:** Zeigt jede Änderung als Vorher/Nachher (DiffViewer) und versioniert sie.
- **Ausgabe:** Neue, gültige Planversion (alte bleibt erhalten — Reversibilität).
- **Kontrollpunkt:** **Gate 2.** Erst die Freigabe macht die Version zum gültigen Plan.

> **Umsetzung (Spike).** Editierbar ist die fachliche Substanz — Meilenstein-Zustand
> und -Termin, Aktivitäts-Beschreibung und Aufwand (PT), Risiko-Beschreibung,
> Eintritt/Auswirkung und Maßnahme (PRL wie MRL). **Nicht** editierbar ist die
> PVM-Struktur; sie bleibt den ZGPM-Regeln vorbehalten und wird vom Reviewer geprüft.
> Ampeln setzt nicht der Anwender, sondern der Server leitet sie nach jeder Revision
> neu ab (Risiko aus E×A → MRL → Meilenstein → Projekt). Jede gespeicherte Revision
> ist eine neue, unveränderliche Version (`POST …/plan/revise`, append-only) mit
> eigenem `plan_hash`; der Diff vergleicht die letzten beiden Versionen. Gate 2
> (`POST …/approve-plan`) friert die freigegebene Version als Bauvorlage ein
> (`gate2_approved_at`, `approved_plan_version`, Status `approved`) und sperrt weitere
> Revisionen. Ein `HARD_FAIL` des Reviewers blockiert die Freigabe.

### Schritt 8 — Agent-Harness bauen & gestalten (BAUEN)
- **Ziel:** Aus dem Plan wird ein lauffähiges Agententeam, visuell nachvollziehbar.
- **System:** Kompiliert Rollen → Agenten, Aktivitäten → Aufgaben, Risiken → Quality-Gates
  (Hooks). Visualisiert den Graphen (PMO-Orchestrator, Worker, Konsistenz-Check, HITL-Knoten).
- **Eingabe:** Jedes Artefakt editierbar (`CLAUDE.md`, `SKILL.md`, Agenten, Plan-YAML).
  Im **Kommandofeld** Strukturwünsche formulieren: Sequenz, Parallel, neuer Skill, weiterer Agent.
- **Verhalten:** Das System macht neue Vorschläge — **x Iterationen** (Iterations-Schleife).
- **Kontrollpunkt:** Jede neue `SKILL.md` braucht Review; die Schleife endet erst mit Freigabe.

### Schritt 9 — Export: Zip + Setup für Claude Cowork (BAUEN)
- **Ziel:** Ein portables Paket, das ohne den Planner läuft (kein Vendor-Lock-in).
- **System:** Schnürt `CLAUDE.md`, `plan/`, `.claude/agents|skills|commands|hooks` und das
  Cowork-Plugin-Manifest (`.claude/plugins/aegira-harness/plugin.json`) in eine signierte
  `<slug>_<datum>_<hash>.harness.zip` (mit `checksums.txt`, `INSTALL.md`, `USERGUIDE.md`).
- **Ausgabe:** Download des Harness-Zip.
- **Kontrollpunkt:** **Gate 3.** Prüfsumme (`shasum -a 256 -c`) bestätigt Unverändertheit.
- **Danach:** Zip entpacken → `plugin.json` wird erkannt → `/run-harness` → Team läuft in Claude Code.

## Die drei harten HITL-Gates (nie übersteuerbar)

1. **Meilenstein-Sign-off** — jeder Phasenübergang erfordert manuelle Bestätigung.
2. **Rote Risiko-Ampel** — der Lauf stoppt; nur der Anwender gibt explizit frei.
3. **`SKILL.md`-Aufnahme** — jede neue Skill-Datei braucht HITL-Review.

## Warum dieser Ablauf nach McKinsey trägt

| Optimierung | Wirkung im Prozess |
|---|---|
| **MECE-Phasen** | Verstehen/Planen/Bauen — lückenlos und überschneidungsfrei. |
| **Hypothesengeleitet** | Das Interview testet Annahmen statt offenen Sammelns (Schritt 2). |
| **Pyramid Principle** | Jeder Meilenstein-Status nennt die Kernaussage zuerst. |
| **Front-loaded Discovery** | Projektart & Leitplanken vor der Planung geklärt (Schritt 5). |
| **Orchestrator statt Solo** | PMO delegiert; Worker arbeiten parallel — schneller, robuster. |
| **Evaluator-Loop mit Limit** | Reviewer prüft max. 3×, dann entscheidet der Mensch — keine Endlosschleife. |
| **End-State-Evaluation** | Bewertet wird das Ergebnis je Meilenstein, nicht jeder Zwischenschritt. |
| **Reversibilität by design** | Jede Version bleibt; Re-Plan statt Überschreiben. |

## Mapping in den Harness (Kurzfassung, Details in 01 & 03)

| ZGPM-Artefakt | Harness-Artefakt |
|---|---|
| Meilensteinplan (MSP) | LangGraph-loses State-Modell: Knoten je MS, Edges = Vorgänger/Nachfolger |
| Aktivitätenplan | Tasks + Subagent-Zuordnung |
| PVM | Routing Human ↔ Agent (A/F/L/I je Subagent) |
| Risikoliste (Ampel) | Quality-Gate-Hooks (Pre/Post-Tool, Stop-on-Red) |
| Projektleiter | HITL-Approval-Node + Eskalationspfad |
| Pivot/Kosten | Token-/Tool-Call-Accounting je Knoten |

## Best Practices, die der Prozess durchsetzt

**ZGPM:** Meilenstein = Zustand (Verb im Perfekt), nicht Aufgabe · genau ein `F`/`L` pro
Meilenstein · mindestens ein `A` · `e` nie ohne `E` · Risiko-Ampel nur mit PRL/MRL-Eintrag ·
Re-Versionierung bei Phasenverschiebung.

**Agent-Harness (Anthropic):** Einfachheit vor Raffinesse · Transparenz · ACI zuerst ·
Kontext teilen (volle Traces) · Checkpoint & Resume · Sectioning der Guardrails ·
HITL an festen Punkten · End-State-Evaluation. Anti-Muster (vom Reviewer hart geflaggt):
vage Delegation, Über-Spawning, Routing im Prompt, eine LLM-Antwort für Guardrail+Inhalt,
fehlendes Retry/Checkpoint, sequenziell statt parallel, Endlosschleifen, zu breit
triggernde Skills, relative Pfade, ungeprüfte Token-Budgets.

---

## Nachtrag v0.5 — Schritt 6 als geführter Wizard (6a → 6b → 6c)

Ab v0.5 ist Schritt 6 (PLANEN) ein **geführter, mehrstufiger Wizard**. Leitprinzip:
Der Anwender ist oft Laie — das System **schlägt zuerst vor**, der Anwender
**ändert/löscht/ergänzt/sortiert** und bestätigt jeden Schritt mit **DONE**.
Vorschläge kommen vom **LLM** (Azure Foundry, `planning/llm_planner.py`); ohne
Creds oder bei Fehler greift der deterministische `zgpm_composer` (Fallback, App
bricht nie). PVM-Matrix und Risiken bleiben den ZGPM-Regeln vorbehalten und werden
nach jeder Bearbeitung neu abgeleitet (`recompute`) — der Anwender editiert sie nicht.

### 6a — Meilensteine (`/projects/[id]/plan/milestones`)
- Vorgeschlagene Meilensteine (Zustände im Perfekt). Editierbar: **Name, Zieltermin**.
  Löschen, Hinzufügen, **Reihenfolge** per Drag&Drop oder Hoch/Runter (touch-fähig).
- API: `POST /plan/milestones/op` (`add`/`update`/`delete`/`reorder`).
- **DONE:** `POST /plan/milestones/done` → setzt `milestones_done_at`, schaltet 6b frei.

### 6b — Aktivitäten + Werkzeuge (`/projects/[id]/plan/activities`)
- Je Meilenstein vorgeschlagene Aktivitäten (Default 3). Editierbar: **Beschreibung,
  Aufwand (PT)**. Löschen, Hinzufügen, Reihenfolge wie in 6a.
- Je Aktivität abgeleitete **Werkzeug-/MCP-Vorschläge** (Klartext „?"-Erklärung,
  annehmen/verwerfen). Quelle: `planning/tool_catalog.py` (Fallback) bzw. LLM. Details
  in `docs/13_tools-mcp-suggestions.md`. Bindung je Agent erfolgt im Harness (Schritt 8).
- API: `POST /plan/activities/op` (inkl. `tool_id`/`tool_accepted`).
- Gating: erst nach `milestones_done_at`. **DONE:** `POST /plan/activities/done`
  → setzt `activities_done_at`, schaltet 6c frei.

### 6c — Ergebnis (`/projects/[id]/plan`)
- **Abgeleitet** aus 6a/6b: Gantt, RACI/PVM, Risk-Heatmap, Token-Budget, Auslastung.
- **Qualitatives Gesamtrisiko** (`plan.risk_narrative`): Klartext-Begründung zusätzlich
  zur reinen Ampel-Propagation („schlechteste Einzelampel gewinnt"). Benennt Treiber +
  Maßnahme; im LLM-Pfad reicher formuliert.
- Gating: erst nach `activities_done_at`; sonst Redirect in den offenen Wizard-Schritt.
- Danach unverändert: Review (Schritt 7) → Gate 2 → Harness (Schritt 8).
