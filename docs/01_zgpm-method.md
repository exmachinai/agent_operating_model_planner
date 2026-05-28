# 01 — ZGPM-Methodik (Digest)

> Quelle: PwC ZielGerichtetes Projekt-Management (Glasner et al., Excel-Tool v2 von 2004), extrahiert aus den Original-Workbooks und der Tutorial-Folie „Nutzung_ZGPM!.ppt".
> Dieses Dokument ist eine Arbeitsbasis für unsere Mapping-Logik. Es ist keine Re-Implementierung des PwC-Tools.

## Kerneinheiten

### Meilenstein

> Ein Meilenstein beschreibt einen **Zustand, der bis zu einem bestimmten Datum erreicht sein muss**.

Sprachliche Form: **Verb im Perfekt**. Beispiele:
- „Umzugsplanung abgeschlossen"
- „Renovierung der alten Wohnung beendet"
- „Datenschutzkonzept Release 2 freigegeben"

Eigenschaften:
- eindeutige Nummer und Kurzbezeichnung
- Endetermin (geplant + Ist/akt. Plan)
- zugeordneter Ergebnispfad
- zugeordnete Phase
- Vorgänger-Nachfolger-Beziehungen
- Gesamtrisiko-Ampel (rot / gelb / grün)
- Status-Häkchen (manuell gesetzt)

### Aktivität

> Eine Aktivität ist eine konkrete Arbeit, die **vor Erreichen des Meilensteins erledigt sein muss**.

Eigenschaften:
- Beschreibung, Verantwortliche (siehe PVM)
- geplanter / erledigter / ausstehender Aufwand (Personentage MT)
- Zeitfenster (Start, Ende)
- Qualitätsstatus, Verantwortlichkeit eingehalten ja/nein
- Anmerkungen

### Ergebnispfad (Stream)

Vertikaler Strang gleichartiger Ergebnisse. Klassisch: `P` (Personen), `S` (Systeme), `O` (Organisation). Domänenspezifisch erweiterbar — die DSB-Workbooks nutzen `P1 P2 R1 R2 R3 D1 D2 D3 S1 S2`.

Maximal 2 Buchstaben + Ziffer.

### Phase

Zeitabschnitt, dem Meilensteine zugeordnet werden. Phasen definieren den Projektrhythmus.

### PVM (Projektverantwortlichkeitsmatrix)

RACI-Vorgänger. Die ZGPM-Originalcodes:

| Code | Bedeutung |
|---|---|
| `A` | führt aus |
| `B` | wird beteiligt |
| `E` | entscheidet |
| `e` | entscheidet mit |
| `F` | steuert Fortschritt |
| `L` | leitet an und steuert Fortschritt |
| `I` | wird informiert |
| `V` | ist verfügbar |

**Konsistenzregeln (hart):**
1. **Mindestens ein `A`** pro Meilenstein und pro Aktivität.
2. **Genau ein `F` oder `L`** pro Meilenstein und pro Aktivität.
3. Ein `e` steht **nie allein** — immer mit einem `E`.
4. `E` kommt häufiger in der frühen Projektphase vor als in der späten.
5. `E` kommt häufiger bei Meilensteinen vor als bei Aktivitäten.

### Risikoliste

Zwei Ebenen:
- **PRL** — Projektrisikoliste (Gesamtprojekt).
- **MRL** — Meilensteinrisikolisten (eine pro Meilenstein).

Die Risikoampel (rot / gelb / grün) **propagiert nach oben** — das Gesamtrisiko eines Meilensteins ergibt die Ampelfarbe im Meilensteinplan; das Gesamtprojekt-Risiko aggregiert über alle Meilensteine.

## Pflicht-Artefakte (entsprechen Excel-Sheets im Original)

| Sheet im Original | Funktion |
|---|---|
| `MSP` | Meilensteinplan mit Phasen, Ergebnispfaden, Ampel |
| `PVM` | Verantwortlichkeitsmatrix |
| `P1`, `S1`, `O1`, `A 4`–`A 25` | Aktivitätenpläne und Meilensteinrisikolisten je Meilenstein |
| `Pivot` | Aufwandsauswertung |
| `Kosten` | Plankosten / Istkosten je Kostenträger und Kostenstelle |
| `Phasen` | Phasendefinition |
| `Bericht`, `Bezuege` | interne Verknüpfungen |

In unserem System modellieren wir das **nicht als Excel**, sondern als versionierte YAML/JSON-Struktur (siehe `02_architecture-option-b.md`).

## Auswertungen

- **Aufwand + Kosten** auf Phasen- und Meilensteinebene.
- **Aufwand** auf Aktivitäten-, Meilenstein- und Phasenebene.
- **Aufwand pro Aktivität** auf Abteilungs- und Ressourcenebene.

Im Plan-YAML als rein berechnete Felder.

## Fortschrittsbericht

Pro Meilenstein zeigt der Fortschrittsbericht:
- **Pfeil-Logik**: Ist-Datum/akt. Plan vs. geplantes Datum
  - `↑` Meilensteinergebnis verfrüht
  - `=` im Plan
  - `↓` verspätet
- **Häkchen** für erreichte Meilensteine (manuell zu setzen)
- **Aufwandsverbrauch** Text
- **Risiko-Hintergrund** (rot/gelb/grün)

## Mapping ZGPM → Agent-Harness

| ZGPM-Artefakt | Agentic-Übersetzung | Harness-Artefakt |
|---|---|---|
| Meilensteinplan (MSP) | Projekt-State-Machine | LangGraph-Knoten je MS, Edges = Vorgänger-Nachfolger |
| Phase / Ergebnispfad | Domänen-Stream | Subgraph je Stream |
| Aktivitätenplan | Aufgaben pro MS | Tasks im Harness, Subagent-Zuordnung |
| PVM | Routing-Regel Human ↔ Agent | Pro Subagent: ist `A` / `F` / `L` / nur `I` |
| Projektleiter | HITL-Supervisor | Approval-Node + Eskalationspfad |
| Risikoliste (Ampel) | Quality-Gate-Policy | Hooks (Pre/Post-Tool, Stop) |
| Fortschrittsbericht | Run-Telemetrie | Status-Dashboard + Snapshot |
| Pivot / Kosten | Effort-/Token-Accounting | Tool-Call-Counter + Tokens je Knoten |

## Was wir methodisch **nicht** verwässern dürfen

- Meilensteine als Aufgaben missverstehen — sie sind Zustände.
- Mehr als ein `F`/`L` pro Meilenstein zulassen.
- Risiko-Ampel automatisch grün setzen ohne PRL/MRL-Eintrag.
- Phasen nachträglich verschieben, ohne Plan zu re-versionieren (Planausgabedatum + Kontrolliert durch).
- ZGPM-Konventionen mit modernem RACI vermischen, ohne explizite Mapping-Note.

## Was öffentlich kommuniziert werden darf

ZGPM ist die Methodik **von PwC**. Wir nutzen sie methodisch und nennen sie korrekt. Wir suggerieren keine PwC-Markenzugehörigkeit. Im öffentlichen Sprachgebrauch:
- gut: „Goal-Oriented Project Management (Methodik nach Glasner et al., PwC)"
- gut: „ZGPM-kompatibler Plan"
- nicht ok: „ZGPM™ Software", „PwC-Methodik" als eigene Marke führen
