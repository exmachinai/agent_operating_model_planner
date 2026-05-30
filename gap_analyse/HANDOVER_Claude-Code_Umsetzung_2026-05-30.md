# HANDOVER → Claude Code — Umsetzung der Planner-Lücken

**Repo:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER` (Zone 3)
**Basis:** `gap_analyse/GAP-ANALYSE_Planner_vs_UserGuide_2026-05-30.md`
**Stack:** Next.js (`planner/app`, TS) + FastAPI (`planner/api`, Python), Cosmos/In-Memory
**Stand:** 30.05.2026

---

## 0. Vor dem ersten Commit — verbindlich lesen

1. `CLAUDE.md` (Repo-Wurzel) — Identität, verbotene Claims, frozen Eckpfeiler.
2. `docs/01_zgpm-method.md`, `docs/04_agent-best-practices.md`, `docs/03_harness-zip-spec.md`, `docs/09_process-flow.md`.
3. **Regeln, die jeden PR betreffen:**
   - **Docs vor Code.** Bei nicht-trivialer Änderung erst betroffenes `docs/*` aktualisieren, dann implementieren.
   - **Zone-Grenze.** Dieses Repo ist Zone 3 und darf **nie** nach `00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**` schreiben (MCP-Safety-Guard blockt das).
   - **Keine 100%-Claims**, keine „DACH"-Begriffe; Rechtsräume `DE · EU27-Rest · UK · CH`; Maturity = AIMS; Produktnamen eingefroren (AI Navigator/Guardian/Commander).
   - **Keine Secrets im Klartext** — nur `.env.example` pflegen.
   - Doku-Sprache Deutsch, Code-Identifier Englisch.
   - PR gegen `main`, Imperativ-Titel, Test-Belege.

---

## 1. Zielbild

Die Wertschöpfungskette von Brief → ZGPM-Plan ist gebaut. Es fehlt die **Phase BAUEN** (Schritt 8 Harness, Schritt 9 Export, Gate 3) sowie UX-Tiefe in Planung und Projektverwaltung. Dieser Handover schließt die Kette und hebt die Entscheidbarkeit der Planung.

**Definition of Done (Gesamt):** Ein Nutzer kann ein freigegebenes Projekt (Gate 2) in ein sichtbares Agenten-Harness kompilieren, es per Kommando iterieren, an Gate 3 freigeben und ein signiertes Zip inkl. `CLAUDE.md`, `.claude/agents`, Skills, Hooks, Plan und **Handover-MD für Cowork/Claude Code** herunterladen.

---

## 2. Arbeitspakete (priorisiert, front-loaded value)

### WP-1 — Harness-Compiler + Export (KRITISCH, schließt die Kette)

**Backend**
- Neues Modul `planner/api/app/harness/compiler.py`: nimmt freigegebenen `Plan` (Gate 2) → erzeugt Harness-Struktur gemäß `docs/03_harness-zip-spec.md`:
  - `CLAUDE.md`, `INSTALL.md`, `USERGUIDE.md`, `HANDOVER.md` (Cowork + Claude Code Setup)
  - `plan/` (`msp.yaml`, `pvm.yaml`, `risks.yaml`)
  - `.claude/agents/` (Rollen aus PVM → Agenten), `.claude/skills/`, `.claude/commands/`, `.claude/hooks/`, `plugin.json`
  - `checksums.txt` (SHA-256 je Datei) + Gesamt-Zip-Hash
- Wiederverwenden: Templates in `harness/_template/` als Ausgangspunkt.
- Neuer Router `planner/api/app/routers/harness.py`, eingehängt in `main.py`:
  - `POST /v1/projects/{id}/harness` → kompiliert (nur wenn `gate2_approved_at` gesetzt), persistiert Struktur, gibt Harness-Graph zurück.
  - `GET /v1/projects/{id}/harness` → aktuelle Struktur (Agenten, Knoten, HITL-Punkte, Artefakt-Liste).
  - `POST /v1/projects/{id}/harness/revise` → Kommando (`sequence|parallel|skill|agent`) → neuer Vorschlag, versioniert (max-Iterationen begrenzt, kein Endlos-Loop).
  - `POST /v1/projects/{id}/harness/approve` → **Gate 3**, friert Harness ein, setzt `status="compiled"`.
  - `GET /v1/projects/{id}/harness/download` → StreamingResponse der signierten Zip (nutzt `STORAGE_CONTAINER_HARNESS`).
- Schemas: `planner/api/app/schemas/harness.py` (HarnessNode, AgentSpec{role, mission, skills[], tools[], hitl}, ArtifactRef, HarnessGraph, ReviseCommand).

**Frontend**
- Route `app/projects/[id]/harness/page.tsx` (Schritt 8) + `app/projects/[id]/harness/download` bzw. Download-Button auf derselben Seite (Schritt 9).
- `lib/api.ts`: `compileHarness`, `getHarness`, `reviseHarness`, `approveHarness` (Gate 3), `downloadHarness`.
- `review/page.tsx`: nach Gate 2 **Weiter-zu-Harness**-Button statt Sackgasse „Zur Übersicht".

**Acceptance:** Gate-2-Projekt → kompiliert → Zip lädt → `shasum -a 256 -c checksums.txt` passt → Zip enthält Handover-MD, die in Cowork/Claude Code lauffähig ist.

### WP-2 — Harness-/Agenten-Visualisierung (Preflight) + Agent-CRUD (HOCH)

- In `harness/page.tsx` Graph rendern: **PMO-Orchestrator → Worker** (Architektur/Skills/Risk/Reviewer), HITL-Knoten ◆ markiert. SVG/Box-Layout, kein Spinner-Blackbox (P2 Transparenz).
- Je Agent ein editierbares Panel: **Mission, Aufgaben, Skills, Tools, HITL-Flag** — anlegen / ändern / löschen.
- Reviewer flaggt Anti-Muster aus `docs/04_agent-best-practices.md` (vage Delegation, Über-Spawning, fehlender Checkpoint, relative Pfade …) sichtbar im UI.

**Acceptance:** Agentenstruktur ist auf einen Blick lesbar; mindestens ein Agent lässt sich live anlegen, umbenennen, löschen; Änderung re-versioniert.

### WP-3 — Plan-UX vertiefen (HOCH)

In `app/projects/[id]/plan/page.tsx` (Daten liegen bereits im `Plan`-Objekt — `milestones[].planned_date`, `responsibilities`, `prl`, `token_budget`):
- **Gantt:** Zeitachse aus `planned_date` + `activities[].start/end`, Balken je Meilenstein, KW-Raster, Ampel-Farbe pro Balken.
- **RACI/PVM-Matrix:** echte Matrix `Rolle × Meilenstein/Aktivität` mit PVM-Codes; Konsistenzregeln aus `docs/01_zgpm-method.md` visuell prüfen (≥1 A; genau ein F/L; „e" nie allein).
- **Risk-Heatmap:** P×A-Raster (5×5), Risiken als Punkte, Ampel-Zonen; Tooltip mit Scoring-Erklärung → behebt „intransparent".
- **Token-Live-Zähler:** laufende Summe je Agent/Knoten + **Warnschwelle** mit sichtbarer Überschreitungs-Warnung (Formulierung „audit-ready", kein 100%-Claim).
- Optional: **Auslastung** je Agent (Summe Aufwand PT) als Balken.

**Acceptance:** Jede der vier Ansichten ist auf einen Blick beurteilbar; Risk-Scoring ist im UI erklärt.

### WP-4 — Projektverwaltung vervollständigen (QUICK-WIN, MITTEL)

- `lib/api.ts`: `deleteProject` ergänzen (Backend-`DELETE` existiert bereits) → Dashboard-Löschen mit Bestätigungsdialog (Guide Schritt 4: „Löschen wird immer noch einmal bestätigt").
- Backend: `PATCH /v1/projects/{id}` für Titel/Beschreibung (Rename) **vor Gate 1**; nach Gate 1 gesperrt (analog `update_understanding`).
- **Duplizieren als Vorlage:** `POST /v1/projects/{id}/duplicate` → Kopie in Status `planning`, Gates zurückgesetzt, Quellen-Hashes optional übernommen.
- Dashboard: Aktionsmenü je Karte (Öffnen · Duplizieren · Löschen) + Status-Badge bleibt.

**Acceptance:** Anlegen/Öffnen/Umbenennen/Duplizieren/Löschen vollständig per UI; Löschen mit Rückfrage.

### WP-5 — Dropbox-Connector real implementieren (HOCH, abgegrenzt)

> Vorgabe: **nur Dropbox**. SharePoint/OneDrive/Azure-Blob bleiben bewusst `blocked`.

- `planner/api/app/context/connectors.py`: `DropboxConnector` implementieren (`list_files`, `fetch`) via Dropbox Scoped App (`files.metadata.read`, `files.content.read`); `get_connector("dropbox")` liefert echten Connector, wenn `DROPBOX_APP_KEY`/`DROPBOX_APP_SECRET` gesetzt.
- OAuth-Flow + Token-Handling; Inhalt **ephemer** verarbeiten (gleicher Pfad wie Upload — nur Hash-Nachweis bleibt, Gate-1-Freeze).
- `.env.example` um Dropbox-Variablen ergänzen (keine echten Secrets).
- UI `interview/page.tsx`: Dropbox-Zeile von „501 blockiert" auf echten Connect umstellen; übrige Provider weiter sichtbar blockiert.

**Acceptance:** Mit gesetzten Dropbox-Secrets lässt sich ein Ordner verbinden, Dateien werden gelesen und als Quelle (Name+Hash) eingefroren; ohne Secrets ehrlicher Blocker.

### WP-6 — Suffizienz-Gate „weiter planen?" (MITTEL)

- Aktiver Entscheidungspunkt (nutzt bestehende `HitlApprovalPrompt`-Komponente): nach Plan-Generierung fragt das System „Reicht der Planungsstand für die Freigabe — oder weiter verfeinern?" vor Gate 2.

**Acceptance:** Kein stiller Übergang in die Freigabe; Nutzer bestätigt Suffizienz explizit.

---

## 3. Querschnitt — Harness-Prinzipien (Pflicht, `docs/04`)

Beim Compiler (WP-1) einbauen: Orchestrator-Worker mit Output-Schema, Evaluator-Optimizer (Reviewer max 3×, dann HITL), Parallel-Tool-Calling wo möglich, Filesystem-Artifact (große Ergebnisse als Datei + Referenz), Checkpoint & Resume nach jedem Knoten, Guardrails als eigener Prüf-Aufruf (nicht im Worker-Prompt), HITL an festen Punkten (Meilenstein, rotes Risiko, neuer Skill, Budget-Überschreitung), **absolute Pfade** im generierten Harness.

---

## 4. Reihenfolge & Abhängigkeiten

```
WP-1 (Compiler+Export) ──┬──▶ WP-2 (Visualisierung+Agent-CRUD)
                         └──▶ WP-6 (Suffizienz-Gate, klein)
WP-3 (Plan-UX)  ── unabhängig, parallelisierbar
WP-4 (Verwaltung) ── Quick-Win, unabhängig, zuerst mergebar
WP-5 (Dropbox) ── unabhängig, abgegrenzt
```

Empfehlung: WP-4 (schneller Sichtbarkeitsgewinn) → WP-1 → WP-2 → WP-3 → WP-5 → WP-6.

---

## 5. Test- & Abnahme-Checkliste je PR

- [ ] Betroffenes `docs/*` zuerst aktualisiert.
- [ ] Backend: pytest für neue Router/Schemas; 404/409/422-Pfade abgedeckt.
- [ ] Frontend: Route rendert, API-Client typsicher gegen Pydantic-Schemas.
- [ ] Keine 100%-Claims, keine „DACH", Produktnamen unverändert.
- [ ] Keine Secrets im Code; `.env.example` gepflegt.
- [ ] Gate-Logik: kein Schritt überspringt Freigabe; Reversibilität (Versionen) erhalten.
- [ ] Bei Harness: `shasum -a 256 -c checksums.txt` grün; Zip in Cowork/Claude Code lauffähig.

---

*exmachinAI · AEGIRA AI Trust Platform · Handover für Claude Code · 30.05.2026*
