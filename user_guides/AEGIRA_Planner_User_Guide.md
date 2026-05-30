# AEGIRA Agent Operating Model Planner — User Guide

> **AI TRUST PLATFORM · exmachinAI**
> Von der Projektidee zum lauffähigen Agententeam — Schritt für Schritt.
> Für Anwender ohne Programmiererfahrung · ZGPM-konform · Stand 05/2026

---

## Inhaltsverzeichnis

1. [Orientierung](#orientierung)
2. [Das Produkt](#das-produkt)
3. [Das mentale Modell](#das-mentale-modell)
4. [Der Weg & dein Prinzip](#der-weg--dein-prinzip)
5. [Die neun Schritte](#die-neun-schritte)
6. [Prozess: Ablauf & Begründung](#prozess-ablauf--begründung)
7. [Best Practices: ZGPM](#best-practices-zgpm)
8. [Best Practices: Agent-Harness (Anthropic)](#best-practices-agent-harness-anthropic)
9. [Referenz: Glossare & Schnellreferenz](#referenz-glossare--schnellreferenz)
10. [Abschluss](#abschluss)

---

## Orientierung

### Wie du diesen Guide liest

Dieser Guide richtet sich an Anwender ohne Programmiererfahrung. Jeder der neun Schritte folgt demselben Aufbau — sobald du das Muster einmal kennst, findest du dich überall sofort zurecht.

Jeder Schritt beschreibt vier Aspekte:

- **ZIEL** — Was in diesem Schritt erreicht wird.
- **DEINE AKTION** — Was du tust — meist nur lesen, klicken, bestätigen.
- **WAS DAS SYSTEM TUT** — Welche Agenten im Hintergrund für dich arbeiten.
- **DEIN KONTROLLPUNKT** — Wo du entscheidest. Nichts geht ohne deine Freigabe weiter.

Zwei wiederkehrende Elemente begleiten dich:

- **WAS DU SIEHST** — Eine Skizze des echten Bildschirms zu jedem Schritt.
- Die Fortschrittspunkte zeigen, wo im 9-Schritt-Weg du gerade bist.

### Was du nach diesem Guide kannst

1. **Ein Projekt in eigenen Worten beschreiben** — und vom System methodisch schärfen lassen.
2. **Ein präzises Projektverständnis freigeben** — inkl. der dafür nötigen Agentenstruktur.
3. **Einen ZGPM-Plan lesen und anpassen** — Meilensteine, RACI, Risiken, Zeit, Kosten.
4. **Die Leitplanken verstehen** — was erlaubt ist und was das System verweigert.
5. **Den Agenten-Harness mitgestalten** — Artefakte editieren, Struktur per Kommando verbessern.
6. **Ein lauffähiges Paket exportieren** — als Zip mit Setup für Claude Cowork & Claude Code.

---

## Das Produkt

### Was ist der AEGIRA Planner?

Ein **Project-to-Agent-Compiler**: Aus deiner Projektidee entsteht über methodisch saubere Stufen ein vollständiger Bauplan — und daraus ein lauffähiges Agentensystem.

| Stufe | Beschreibung |
|-------|--------------|
| **PLAN** | Projektauftrag wird zum ZGPM-Plan: Meilensteine, Rollen, Risiken. |
| **HARNESS** | Der Plan wird zu einem Paket aus CLAUDE.md, Skills und Agenten. |
| **RUN** | Das Paket läuft auf deinem Rechner in Claude Code / Cowork. |

**Warum?** Wer heute Agenten baut, startet technisch — Prompt, Tool, Workflow. Was fehlt, ist die organisatorische Vorarbeit: Plan, Rollen, RACI, Governance. Solo-Builder haben kein Projektteam. Der Planner liefert genau diese organisatorische Intelligenz.

---

## Das mentale Modell

### Agenten sind digitale Mitarbeiter

Wenn Agenten wie Mitarbeiter arbeiten, brauchen sie, was jedes gute Team braucht: Rollen, Verantwortlichkeiten, Fähigkeiten und Governance. Genau dort setzt der Planner an.

**Üblicher Start: technisch**

```
Prompt → Tool → Workflow
```

> Ergebnis: technisch lauffähig, aber ohne organisatorische Klarheit.

**AEGIRA-Start: organisatorisch**

```
Projektplan → Rollenmodell → Skill-Matrix → RACI / PVM → Agentenstruktur
```

> Aus dem Plan wird die Technik abgeleitet — nicht umgekehrt.

---

## Der Weg & dein Prinzip

### Die Reise auf einen Blick

Drei Makro-Phasen, neun Schritte. An jedem farbigen Übergang entscheidest du — der Weg ist jederzeit umkehrbar.

| Phase | Schritte |
|-------|----------|
| **VERSTEHEN** | 1 Beschreiben · 2 Interview · 3 Verständnis |
| **PLANEN** | 4 Verwalten · 5 Leitplanken · 6 ZGPM-Plan · 7 Review |
| **BAUEN** | 8 Harness · 9 Export |

### Du behältst die Kontrolle

Der Planner arbeitet **Human-in-the-Loop**: Agenten schlagen vor, du entscheidest. An drei Stellen darf das System dich nie übersteuern.

- **✓ Meilenstein-Freigabe** — Jeder Phasenübergang wartet auf deine manuelle Bestätigung.
- **! Rote Risiko-Ampel** — Steht ein Risiko auf Rot, stoppt der Lauf. Nur du gibst ihn explizit frei.
- **Transparenz** — Du siehst die Agenten live denken und arbeiten — kein Spinner, der etwas verbirgt. Jede Aktion landet im Audit-Trail.

---

## Die neun Schritte

### Phase VERSTEHEN

#### Schritt 1 von 9 — Beschreibe dein Projekt in eigenen Worten

- **ZIEL** — Das System erfährt, was du vorhast — formlos, in deiner Sprache.
- **DEINE AKTION** — Du schreibst frei drauflos. Keine Fachbegriffe, keine Struktur nötig.
- **WAS DAS SYSTEM TUT** — Es liest mit und bereitet die erste Rückfrage vor — nichts wird gespeichert ohne dich.
- **DEIN KONTROLLPUNKT** — Du klickst „Weiter", wenn deine Beschreibung steht.

#### Schritt 2 von 9 — Das Schärfungs-Interview (McKinsey-Methode)

- **ZIEL** — Aus der Idee wird ein präzises Verständnis: Projektart, Umfang, Skills.
- **DEINE AKTION** — Du beantwortest gezielte Rückfragen — eine nach der anderen.
- **WAS DAS SYSTEM TUT** — Es fragt MECE und hypothesengeleitet nach und macht aktiv Vorschläge.
- **DEIN KONTROLLPUNKT** — Du kannst jeden Vorschlag annehmen, ändern oder verwerfen.

#### Schritt 3 von 9 — Projektverständnis & Agentenstruktur freigeben

- **ZIEL** — Eine pre-finale Zusammenfassung — plus die Agenten, die deinen Plan bauen.
- **DEINE AKTION** — Du liest, korrigierst Details und gibst frei.
- **WAS DAS SYSTEM TUT** — Es verdichtet alles und leitet ab, welche Planungs-Agenten nötig sind.
- **DEIN KONTROLLPUNKT** — Ohne deine Freigabe startet keine Planung.

### Phase PLANEN

#### Schritt 4 von 9 — Deine Projekte verwalten

- **ZIEL** — Jedes Projekt bleibt erhalten — in jeder Phase, jederzeit auffindbar.
- **DEINE AKTION** — Öffnen, kopieren als Vorlage oder löschen — alles mit einem Klick.
- **WAS DAS SYSTEM TUT** — Es speichert jede Phase als eigene Version und zeigt den Status.
- **DEIN KONTROLLPUNKT** — Löschen wird immer noch einmal von dir bestätigt.

#### Schritt 5 von 9 — Die Leitplanken: was geht — und was nicht

**Was das System verweigert:**

- **✕ Waffen & gefährliches Dual-Use** — Bau, Beschaffung, Anleitung.
- **✕ Bio-, Chemie- & Nuklear-Gefahren** — keine Hilfe zu Herstellung oder Einsatz.
- **✕ Diskriminierung & unfaire Benachteiligung** — keine Pläne, die Menschen herabsetzen.
- **✕ Malware, Exploits & Spoofing** — kein Schadcode, keine Täuschungs-Sites.
- **✕ EU-AI-Act: verbotene Praktiken** — z. B. Social Scoring, manipulatives Profiling, biometrische Massenüberwachung.

> Grenzfälle werden zur Prüfung an dich eskaliert — nicht still entschieden.

#### Schritt 6 von 9 — Der ZGPM-Plan entsteht

- **ZIEL** — Aus dem Verständnis bauen die Agenten einen vollständigen, methodischen Plan.
- **DEINE AKTION** — Du verfolgst die Agenten live und wartest auf die Vorlage.
- **WAS DAS SYSTEM TUT** — PMO zerlegt in Phasen & Meilensteine; Worker füllen Rollen, Risiken, Aufwände.
- **DEIN KONTROLLPUNKT** — Der Reviewer prüft; bei Rot oder Konflikt entscheidest du.

**Was du siehst** (`zgpm.aegira.ai/projects/…/plan`): Meilensteinplan, PVM, Risiken, Aktivitäten.

Beispielhafte Phasen & Meilensteine:

| Phase | Meilensteine |
|-------|--------------|
| **PH1 Setup** | M1 Quellen angebunden |
| **PH2 Aufbau** | M2 Entwurfs-Engine steht · M3 Freigabe-Workflow live |
| **PH3 Betrieb** | M4 Erstausgabe versendet · M5 Betrieb stabil |

> Meilenstein = Zustand im Perfekt · Ampel propagiert nach oben.

#### Schritt 6 (Forts.) — Was du im fertigen Plan siehst

- **Gantt — Meilensteine** — Start- und Endtermine je Meilenstein (z. B. KW20, KW24, KW28, KW32).
- **Risk-Matrix** — Risiken im Überblick.
- **Zeitplanung** — Welcher Agent wie stark ausgelastet ist.
- **Kosten — Token** — Token-Budget je Agent & Knoten, live mitgezählt, mit Warnung bei Überschreitung.

#### Schritt 7 von 9 — Review & Edit — direkt am Bildschirm

- **ZIEL** — Du machst den Plan zu deinem Plan — Wortlaut, Sprache, Details.
- **DEINE AKTION** — Text anklicken und ändern, Sprache umschalten (DE/EN), Werte anpassen.
- **WAS DAS SYSTEM TUT** — Es zeigt jede Änderung als Vorher/Nachher und versioniert sie.
- **DEIN KONTROLLPUNKT** — Erst deine Freigabe macht aus der Version den gültigen Plan.

**Beispiel einer Änderungs-Vorschau** (`zgpm.aegira.ai/projects/…/plan · bearbeiten`):

```diff
M2 Entwurfs-Engine steht
−  „Entwurfs-Engine steht"
+  „Entwurfs-Engine getestet & freigegeben"
```

> Version v3 · v2 bleibt erhalten.

### Phase BAUEN

#### Schritt 8 von 9 — Der Agenten-Harness wird gebaut & sichtbar

- **ZIEL** — Aus dem Plan wird ein lauffähiges Agententeam — visuell nachvollziehbar.
- **DEINE AKTION** — Du betrachtest die Struktur: wer orchestriert, wer arbeitet, wo du freigibst.
- **WAS DAS SYSTEM TUT** — Es kompiliert Rollen zu Agenten, Aktivitäten zu Aufgaben, Risiken zu Quality-Gates.
- **DEIN KONTROLLPUNKT** — Die HITL-Knoten zeigen, wo dein Sign-off verankert ist.

**Was du siehst** (`zgpm.aegira.ai/projects/…/harness`): PMO · Orchestrator, mit den Worker-Knoten Architektur, Skills, Risk und Reviewer (Konsistenz-Check, max 3×). Der HITL-Knoten (◆ HITL-Freigabe) markiert deinen Kontrollpunkt.

#### Schritt 8 (Forts.) — Artefakte editieren & Struktur per Kommando verbessern

- **ZIEL** — Du verfeinerst jedes Artefakt und die Gesamtstruktur, bis sie passt.
- **DEINE AKTION** — Datei öffnen und ändern — oder im Kommandofeld sagen, was besser wäre.
- **WAS DAS SYSTEM TUT** — Es macht neue Vorschläge (Sequenz, Parallel, neuer Skill, weiterer Agent) — x Iterationen.
- **DEIN KONTROLLPUNKT** — Erst deine Freigabe beendet die Schleife.

**Beispiel-Dateistruktur** (`zgpm.aegira.ai/projects/…/harness · editor`):

```
CLAUDE.md
plan/
  msp.yaml
  pvm.yaml
.claude/
  agents/
  skills/
  hooks/
```

**Beispiel CLAUDE.md:**

```markdown
# CLAUDE.md
## Mission
Newsletter-Pipeline, halb-automatisch.
## Agenten
- pmo (Orchestrator)
- reviewer (max 3×)
```

> Kommandofeld-Beispiel: „Mach die Risiko-Prüfung parallel zur Architektur." → *Vorschlag holen*.
> Kommandofeld-Optionen: Sequenz · Parallel · Skill · weiterer Agent.

#### Schritt 9 von 9 — Export: Zip + Setup für Claude Cowork

- **ZIEL** — Du erhältst ein portables Paket, das ohne den Planner läuft.
- **DEINE AKTION** — Herunterladen, entpacken, in Claude Cowork / Claude Code öffnen.
- **WAS DAS SYSTEM TUT** — Es schnürt CLAUDE.md, Skills, Agenten, Plan & Setup in eine signierte Zip.
- **DEIN KONTROLLPUNKT** — Prüfsumme bestätigt, dass dein Paket unverändert ist.

**Was du siehst** (`zgpm.aegira.ai/projects/…/harness · download`):

- Datei: `newsletter-automatisierung_…_a3f1c2.harness.zip`
- Integritätsprüfung: `checksums.txt · shasum -a 256 -c`

**Inhalt der Zip:**

- `CLAUDE.md`
- `INSTALL.md` · `USERGUIDE.md`
- `plan/` (msp · pvm · risks)
- `.claude/agents/` (7 Rollen)
- `.claude/skills` · `commands` · `hooks`
- `.claude/…/plugin.json`

**In Claude Cowork:**

1. Zip entpacken
2. `plugin.json` wird erkannt
3. `/run-harness` ausführen
4. Team läuft in Claude Code

---

## Prozess: Ablauf & Begründung

### Der Prozessablauf — nach McKinsey optimiert

| Phase | Schritte | Gate |
|-------|----------|------|
| **VERSTEHEN** | 1 Beschreiben · 2 Interview ↺ · 3 Verständnis | ◆ GATE 1 Verständnis |
| **PLANEN** | 4 Verwalten · 5 Leitplanken · 6 ZGPM-Plan ↺ · 7 Review | ◆ GATE 2 Plan |
| **BAUEN** | 8 Harness ↺ · 9 Export | ◆ GATE 3 Harness |

> Drei Freigabe-Gates ◆ — nichts geht ohne dich weiter.
> Drei Schleifen ↺ — Interview, Reviewer (max 3×), Iteration.

### Warum dieser Ablauf nach McKinsey trägt

- **MECE-Phasen** — Verstehen, Planen, Bauen — lückenlos und überschneidungsfrei.
- **Hypothesengeleitet** — Das Interview testet Annahmen, statt nur offen zu sammeln.
- **Pyramid Principle** — Jeder Meilenstein-Status nennt die Kernaussage zuerst.
- **Front-loaded Discovery** — Projektart & Leitplanken werden vor der Planung geklärt.
- **Orchestrator statt Solo** — PMO delegiert; Worker arbeiten parallel — schneller, robuster.
- **Evaluator-Loop mit Limit** — Reviewer prüft max. 3×, dann entscheidest du. Keine Endlosschleife.
- **End-State-Evaluation** — Bewertet wird das Ergebnis je Meilenstein, nicht jeder einzelne Zug.
- **Reversibilität by design** — Jede Version bleibt erhalten — neu planen statt überschreiben.

---

## Best Practices: ZGPM

### ZGPM-Grundlagen: die vier Bausteine

> **ZGPM** (ZielGerichtetes Projekt-Management, Methodik nach Glasner et al., PwC) liefert das Vokabular jedes Plans.

| Baustein | Bedeutung | Beispiel |
|----------|-----------|----------|
| **Meilenstein** | Ein Zustand, der bis zu einem Termin erreicht sein muss. Sprachform: Verb im Perfekt. | „Datenschutzkonzept freigegeben" |
| **Aktivität** | Konkrete Arbeit, die vor dem Meilenstein erledigt sein muss. Mit Aufwand & Verantwortlichen. | „Quellen anbinden — 3 PT" |
| **Ergebnispfad** | Vertikaler Strang gleichartiger Ergebnisse. Klassisch P/S/O. | P = Personen, S = Systeme |
| **Phase** | Zeitabschnitt, dem Meilensteine zugeordnet werden. Gibt den Rhythmus. | PH1 · PH2 · PH3 |

### Verantwortlichkeit (PVM) & Risiko-Ampel

**PVM-Codes (RACI-Vorläufer):**

| Code | Bedeutung |
|------|-----------|
| **A** | führt aus |
| **B** | wird beteiligt |
| **E** | entscheidet |
| **e** | entscheidet mit |
| **F** | steuert Fortschritt |
| **L** | leitet & steuert |
| **I** | wird informiert |
| **V** | ist verfügbar |

**Harte Konsistenzregeln:**

- Mindestens ein **A** pro Meilenstein und Aktivität.
- Genau ein **F** oder **L** — nie mehr.
- Ein „e" steht nie allein, immer mit einem **E**.
- **E** häufiger früh im Projekt als spät.
- **E** häufiger bei Meilensteinen als bei Aktivitäten.

**Risiko-Ampel propagiert nach oben:**

- 🟢 **grün** — im Plan
- 🟡 **gelb** — achtgeben
- 🔴 **rot** — Lauf stoppt, du gibst frei

---

## Best Practices: Agent-Harness (Anthropic)

### Fünf Prinzipien für gute Agentensysteme

- **P1 — Einfachheit vor Raffinesse** — So wenig Agenten wie nötig — Komplexität nur, wenn sie sich auszahlt.
- **P2 — Transparenz** — Der geplante Denkweg der Agenten ist sichtbar, nicht versteckt.
- **P3 — Agent-Computer-Interface zuerst** — Werkzeuge so gestalten, dass Agenten sie eindeutig nutzen können.
- **P4 — Kontext teilen** — Volle Verläufe weitergeben, nicht nur einzelne Nachrichten.
- **P5 — Handlungen tragen Entscheidungen** — Jede Aktion eines Agenten ist implizit eine Entscheidung — Konflikte vermeiden.

### Pflicht-Muster in jedem Harness

- **Orchestrator-Worker** — Lead zerlegt & delegiert mit klarem Auftrag und Output-Schema.
- **Evaluator-Optimizer** — Reviewer prüft gegen Regeln; max 3 Runden, dann HITL.
- **Parallel-Tool-Calling** — Unabhängige Werkzeuge laufen gleichzeitig — bis zu 90 % Zeit gespart.
- **Filesystem-Artifact** — Große Ergebnisse in Dateien, nur Referenz zurückgeben.
- **Checkpoint & Resume** — Zustand nach jedem Knoten sichern; nach Absturz fortsetzen.
- **Sectioning der Guardrails** — Leitplanken als eigener Prüf-Aufruf, nicht im Worker-Prompt.
- **HITL an festen Punkten** — Meilenstein, rotes Risiko, neue Skill, Budget-Überschreitung.
- **End-State-Evaluation** — Endzustand je Meilenstein bewerten — nicht jeden Zwischenschritt.

### Anti-Muster, die der Reviewer hart flaggt

- **✕ Vage Delegation** — „Recherchiere X" ohne Ziel, Schema und Grenzen.
- **✕ Über-Spawning** — 50 Subagenten für eine einfache Anfrage.
- **✕ Routing im Prompt** — Steuerlogik gehört in Code, nicht in den Prompt.
- **✕ Eine LLM-Antwort für alles** — Guardrail und Inhalt im selben Aufruf vermischt.
- **✕ Kein Checkpoint/Retry** — Kein Wiederaufsetzen nach Fehlern.
- **✕ Sequenziell statt parallel** — Werkzeuge nacheinander, obwohl parallel möglich.
- **✕ Endlosschleifen** — Keine Stop-Bedingung, kein Iterations-Limit.
- **✕ Skills triggern zu breit** — Fähigkeiten greifen, wo sie nicht sollen.
- **✕ Relative Pfade** — In zustandsbehafteten Agenten brechen sie.
- **✕ Token-Budget ohne Prüfung** — Budgets, die nie validiert werden.

---

## Referenz: Glossare & Schnellreferenz

### Glossar — ZGPM

| Begriff | Definition |
|---------|------------|
| **Meilenstein** | Erreichter Zustand zu einem Termin (Verb im Perfekt). |
| **Aktivität** | Arbeit, die vor dem Meilenstein erledigt sein muss. |
| **Ergebnispfad** | Strang gleichartiger Ergebnisse (z. B. P/S/O). |
| **Phase** | Zeitabschnitt, der Meilensteine bündelt. |
| **MSP** | Meilensteinplan — Phasen, Pfade, Ampel auf einen Blick. |
| **PVM** | Projektverantwortlichkeitsmatrix (RACI-Vorläufer). |
| **PRL / MRL** | Projekt- bzw. Meilenstein-Risikoliste. |
| **Ampel** | Risiko-Status grün/gelb/rot, propagiert nach oben. |

### Glossar — Agentik

| Begriff | Definition |
|---------|------------|
| **Agent** | Digitaler Mitarbeiter mit Rolle, Auftrag und Werkzeugen. |
| **Subagent** | Agent mit isoliertem Kontext für abgegrenzte Arbeit. |
| **Skill** | Wiederverwendbares Wissen/Werkzeug als SKILL.md. |
| **Hook** | Deterministische Regel (z. B. Stopp bei rotem Risiko). |
| **Orchestrator** | Lead-Agent, der zerlegt und delegiert (hier: PMO). |
| **HITL** | Human-in-the-Loop — du als Freigabe-Instanz. |
| **Harness** | Portables Paket aus CLAUDE.md, Skills, Agenten, Plan. |
| **Cowork / Claude Code** | Umgebung, in der das Harness läuft. |

### Schnellreferenz: der ganze Weg auf einer Seite

**Die neun Schritte:**

1. Projekt in eigenen Worten beschreiben.
2. Schärfungs-Interview beantworten (McK).
3. Verständnis & Agentenstruktur freigeben.
4. Projekte verwalten — speichern, kopieren, löschen.
5. Leitplanken kennen — was geht, was nicht.
6. ZGPM-Plan lesen: Gantt, RACI, Risiko, Token.
7. Am Bildschirm anpassen — Text & Sprache.
8. Harness mitgestalten — Artefakte & Kommandos.
9. Als Zip exportieren → Claude Cowork / Code.

**Deine 3 Kontrollpunkte:**

- ◆ Meilenstein-Freigabe
- ◆ Rote Risiko-Ampel
- ◆ Skill-Aufnahme ins Harness

**Was nie geht:**

- ✕ Waffen & Dual-Use
- ✕ Bio/Chemie/Nuklear
- ✕ Diskriminierung
- ✕ Malware & Exploits
- ✕ EU-AI-Act-Verbote

---

## Abschluss

> **Du startest mit Worten. Du endest mit einem lauffähigen Agententeam.**

1. **Beschreiben** — Öffne den Planner und beschreibe dein Projekt.
2. **Freigeben** — Schärfe das Verständnis und gib es frei.
3. **Bauen** — Lass den Harness bauen und exportiere ihn.

---

*exmachinAI · AEGIRA AI Trust Platform · zgpm.aegira.ai*
