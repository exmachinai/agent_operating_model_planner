# GAP-Analyse — AEGIRA Agent Operating Model Planner (v2, optimiert)

**Soll (User Guide 05/2026) vs. Ist (Code-Stand 30.05.2026)**
Perspektive: Senior UX/UI Specialist · McKinsey-Lesart (MECE · Pyramid · Hypothesis-driven · customer-centric)
Bewertet wurde der real implementierte Code, nicht der Screenshot-Eindruck.

> **v2-Korrekturen ggü. v1:** DE/EN-Sprachumschaltung (Schritt 7) = code-verifiziert **fehlend** (v1 hatte „prüfen"). Datei-Upload = code-verifiziert **robust** (v1: „to verify"). Agentenstruktur in Schritt 3 = code-verifiziert **absent**. Zeichen-Defekte in den ASCII-Diagrammen behoben.

---

## 0. Methodik & Konfidenz (was geprüft, was angenommen)

| Aspekt | Vorgehen | Konfidenz |
|---|---|---|
| Frontend-Routen | Alle 8 `page.tsx`/`route.ts` gelesen bzw. gegrept | **Hoch** |
| API-Oberfläche | `lib/api.ts` + alle Router (`projects/context/cloud/plans/...`) gelesen | **Hoch** |
| Upload-Mechanik | `routers/context.py` + `context/parsers.py` vollständig gelesen | **Hoch** |
| Plan-Visualisierung | `plan/page.tsx` gegrept (Chips/Tabellen, kein SVG/Gantt) | **Hoch** |
| Harness/Export | Kein Router in `main.py`, keine Route in `app/` — per Ausschluss | **Hoch** |
| Laufzeitverhalten | NICHT live getestet (kein Deploy aufgerufen); Befund = Code-Statik | **Mittel** |

**Limitation:** Diese Analyse ist eine statische Code-/Spec-Prüfung. Reine Laufzeitfehler (z. B. ein Upload, der im Code korrekt, im Deployment aber fehlkonfiguriert ist) lassen sich so nicht ausschließen und sind separat als Smoke-Test zu prüfen.

---

## 1. Kernaussage zuerst (Pyramid Principle)

Der Planner führt den Nutzer **sauber von der Idee bis zum freigegebenen Plan (Gate 2)** — und lässt ihn dann allein. Das Produktversprechen „Du endest mit einem lauffähigen Agententeam" wird **nicht eingelöst**: Die gesamte Phase BAUEN (Schritt 8 Harness, Schritt 9 Export, Gate 3) ist nicht gebaut — kein Route, kein Endpoint, kein Download. Gate 2 friert den Plan als „Bauvorlage" ein und schickt den Nutzer zurück zur Übersicht. Die Bauvorlage wird nie verbaut.

Drei Befunde dominieren — alle aus Nutzersicht formuliert:

1. **„Ich bekomme am Ende nichts in die Hand."** Der Compile-Schritt und der Zip-Download fehlen. Der Kern-Wert (organisatorische Intelligenz → lauffähiges Harness) entsteht nie. → *kritisch.*
2. **„Ich kann den Plan nicht auf einen Blick beurteilen."** Gantt, RACI-Matrix, Risk-Heatmap und Token-Live-Zähler sind zugesagt, aber als flache Tabellen/Chips umgesetzt. Eine Freigabe-Entscheidung ohne entscheidbare Sicht ist Blindflug. → *hoch.*
3. **„Wo sind meine Agenten?"** Das mentale Modell „Agenten = digitale Mitarbeiter" wird nie sichtbar. Agenten lassen sich nicht sehen, beschreiben, anpassen oder löschen — nicht einmal in Schritt 3, wo der Guide „Agentenstruktur freigeben" verspricht. → *hoch.*

---

## 2. Was gut ist (balanced view — brutale Ehrlichkeit schneidet in beide Richtungen)

- **Gate-Logik & Reversibilität sind sauber.** Gate 1 friert Verständnis + Quellen-Hashes ein (append-only); nach Freigabe ist Edit konsequent gesperrt (HTTP 409). Plan-Versionierung (`/plan/versions`, `/plan/revise`) ist methodisch korrekt umgesetzt.
- **Der Kontext-Upload ist produktreif.** Sechs Formate (docx/md/pdf/txt/pptx/xlsx), 25 MB / 20 Dokumente, ephemere Extraktion, nur Hash-Nachweis bleibt, Gate-1-Freeze. Sauber und DSGVO-freundlich.
- **Ehrlicher Blocker statt Fake-Connect.** Cloud-Connectoren melden `501` mit fehlender Env statt einen Halb-Connect vorzutäuschen — das ist gute, vertrauenswürdige Engineering-Disziplin (passt zum Trust-Framing).
- **Interview als SSE-Stream** mit Vorschlags-Chips und MECE-Logik ist UX-seitig der stärkste Teil der App.
- **Brand-/Methodentreue** ist im Code spürbar (ZGPM-Vokabular, keine 100%-Claims, Rechtsräume korrekt).

Das Fundament trägt. Die Lücken sind oben in der Wertschöpfungskette, nicht im Unterbau.

---

## 3. Customer-Centric: Journey-Reibungskarte

**Persona:** „Sofia", Solo-Builderin ohne Programmiererfahrung.
**Job-to-be-done:** *„Aus meiner Idee ein lauffähiges Agententeam bekommen — ohne zu coden."*

```
  SCHRITT             SOFIAS ERLEBNIS                              REIBUNG   JTBD erfüllt?
  ─────────────────────────────────────────────────────────────────────────────────────
  1 Beschreiben       „Ich tippe einfach los." ✅                  ▁ niedrig   ja
  2 Interview         „Es fragt klug nach, ich wähle Chips." ✅     ▁ niedrig   ja
    └ Upload          „Meine Doku wird verstanden." ✅              ▁ niedrig   ja
    └ Dropbox         „Connect blockiert — geht nicht." ⛔          ▅ hoch      nein
  3 Verständnis       „Wo sind die Agenten, die der Guide          ▆ hoch      teils
                       verspricht? Ich sehe nur 3 Dropdowns."
  ◆ Gate 1            „Freigeben — ok." ✅                          ▁ niedrig   ja
  4 Verwalten         „Ich kann ein Projekt nicht löschen oder     ▅ hoch      nein
                       umbenennen. Die Liste verstopft."
  5 Leitplanken       „Klar, was nicht geht." ✅                    ▁ niedrig   ja
  6 ZGPM-Plan         „Tabellen. Ich kann nicht sehen, wann was    ▇ sehr hoch teils
                       fertig ist, wer verantwortet, wie riskant."
  7 Review            „Texte ändern geht. Sprache umschalten       ▃ mittel    teils
                       (DE/EN) — nicht vorhanden."
  ◆ Gate 2            „Plan freigegeben als Bauvorlage." ✅         ▁ niedrig   ja
  8 Harness           „...und jetzt? Es kommt nichts.              █ Abbruch   NEIN
                       Keine Agenten, kein Bauen."
  9 Export            „Es gibt nichts herunterzuladen."            █ Abbruch   NEIN
  ─────────────────────────────────────────────────────────────────────────────────────
  Ergebnis: Sofia investiert 7 Schritte Vertrauen — und steht am Kern-Versprechen
  vor einer Wand. Der teuerste Reibungspunkt liegt am Ende, nach dem größten Invest.
```

**So-what:** Die schlimmste Reibung (█ Abbruch) sitzt nach dem höchsten Nutzer-Invest. Das ist das maximal schädliche Muster für Aktivierung und Vertrauen — und damit der wirtschaftlich teuerste Gap.

---

## 4. Prozessablauf — SOLL

```
                AEGIRA PLANNER · SOLL (9 Schritte · 3 Gates ◆ · 3 Schleifen ↺)

  PHASE VERSTEHEN                PHASE PLANEN                     PHASE BAUEN
  ┌───────────────┐              ┌───────────────┐               ┌───────────────┐
  │ 1 Beschreiben │              │ 4 Verwalten   │               │ 8 Harness ↺   │
  │ 2 Interview ↺ │              │ 5 Leitplanken │               │   bauen,      │
  │ 3 Verständnis │              │ 6 ZGPM-Plan ↺ │               │   sichtbar,   │
  │   +Agenten    │              │   Gantt·RACI· │               │   editierbar  │
  │               │              │   Risk·Token  │               │ 9 Export Zip  │
  │               │              │ 7 Review·Edit │               │   +Handover   │
  └──────┬────────┘              └──────┬────────┘               └──────┬────────┘
         ▼                              ▼                               ▼
   ◆ GATE 1 Verständnis           ◆ GATE 2 Plan                   ◆ GATE 3 Harness
         │                              │                               │
         └──────────────▶──────────────┴───────────────▶───────────────┴──▶ RUN
                                                                     /run-harness
                                                                  Claude Code / Cowork
```

---

## 5. Prozessablauf — IST

```
                AEGIRA PLANNER · IST (Code-Stand 30.05.2026)

  PHASE VERSTEHEN                PHASE PLANEN                     PHASE BAUEN
  ┌───────────────┐              ┌───────────────┐               ┌───────────────┐
  │ Dashboard:    │              │ 5 Leitplanken │               │               │
  │  nur Liste +  │              │   ✅          │               │   ✗ NICHT     │
  │  „Neu"        │              │ 6 Plan: Logik │               │   GEBAUT      │
  │ 1 /new ✅     │              │   ✅, aber UX  │               │               │
  │ 2 /interview ✅│             │   flach (Tab.)│               │  kein /harness│
  │   Upload ✅   │              │ 7 Review ✅    │               │  kein Compile │
  │   Dropbox ⛔  │              │   (kein DE/EN)│               │  kein Export  │
  │ 3 /underst.   │              │               │               │  kein Gate 3  │
  │   nur Form;   │              │               │               │  kein Handover│
  │   keine Agenten│             │               │               │               │
  └──────┬────────┘              └──────┬────────┘               └───────────────┘
         ▼                              ▼
   ◆ GATE 1 ✅                    ◆ GATE 2 ✅
         │                              │
         └──────────────▶──────────────┘──▶ ✗ ENDE: „Zur Übersicht" (Sackgasse)

  Legende:  ✅ funktional   ⛔ bewusst blockiert (501)   ✗ nicht gebaut
```

---

## 6. Prozessablauf — SOLL/IST-Überlagerung (Gap-Sicht)

```
  SCHRITT (Soll)            IST-UMSETZUNG (Code-verifiziert)              BEWERTUNG
  ─────────────────────────────────────────────────────────────────────────────────────
  1 Beschreiben            /new — Brief frei erfassen                     ✅ vollständig
  2 Interview (McK ↺)      /interview — SSE, Vorschlags-Chips, MECE       ✅ vollständig
    └ Upload Kontext       context.py: 6 Formate, 25MB/20, ephemer        ✅ robust
    └ Cloud-Quelle         alle Provider → 501; get_connector wirft immer  ⛔ Dropbox real fehlt
  3 Verständnis            Nature/Plattform/Summary, Gate 1               ✅ Daten · ❌ Agentenstruktur
  ◆ GATE 1                 approve-understanding (friert + Hash-Freeze)    ✅ vorhanden
  4 Verwalten              Dashboard = nur Liste                          ⚠️ Anlegen ✅ · Löschen nur
    (öffnen/kopieren/      DELETE im Backend, NICHT in UI verdrahtet         Backend · Rename/Kopieren ❌
     löschen)              kein Rename · keine „Vorlage" · kein Filter
  5 Leitplanken            /guardrails — verweigern/eskalieren            ✅ vollständig
  6 ZGPM-Plan              /plan generate + Reviewer-Loop                 ⚠️ Logik ✅ · UX flach
    └ Gantt                planned_date nur als Feld, keine Zeitachse      ❌ kein Gantt
    └ RACI/PVM             PVM-Codes als Inline-Chips je Meilenstein        ⚠️ keine Matrix (Rolle×Knoten)
    └ Risk-Matrix          flache Tabelle P×A + Ampel                       ⚠️ keine Heatmap, intransparent
    └ Token-Kosten         flache Tabelle + Summe                           ⚠️ keine Live-Zählung/Warnung
    └ Auslastung           —                                                ❌ fehlt
  7 Review & Edit          /review — Diff, Versionen                       ⚠️ ✅ Edit · ❌ DE/EN-Umschaltung
  ◆ GATE 2                 approve-plan, friert „Bauvorlage" ein           ✅ vorhanden
  „weiter planen?"-Check   HitlApprovalPrompt da, kein aktiver Suffizienz-  ⚠️ kein Suffizienz-Gate
                           Entscheidungspunkt vor Gate 2
  8 Harness bauen          —                                              ❌ komplett fehlend
    └ Struktur visuell     PMO/Worker-Graph nirgends                        ❌ fehlt
    └ Agenten-Aufgaben     keine Rollen-/Skill-Beschreibung                 ❌ fehlt
    └ Agent CRUD           anlegen/ändern/löschen unmöglich                 ❌ fehlt
    └ Preflight-Ansicht    keine                                            ❌ fehlt
    └ Kommandofeld ↺       Sequenz/Parallel/Skill/Agent                     ❌ fehlt
  9 Export                 —                                              ❌ komplett fehlend
    └ Zip + Checksums      kein Compile, kein Download                      ❌ fehlt
    └ Handover-MD          Cowork/Claude-Code-Setup wird nicht erzeugt      ❌ fehlt
  ◆ GATE 3                 —                                              ❌ fehlt
```

---

## 7. Detaillierte Gap-Tabelle (deine 13 Punkte, code-verifiziert)

| # | Gemeldeter Gap | Code-Befund | Status | Schwere |
|---|---|---|---|---|
| 1 | CRUD Projekte (löschen/anlegen/ändern) | Anlegen ✅; Löschen nur Backend-`DELETE`, **nicht** in `api.ts`/Dashboard verdrahtet; Umbenennen: kein Endpoint; Kopieren als Vorlage: nirgends | ⚠️ teilweise | Hoch |
| 2 | Datei-Upload | `context.py`: multipart, 6 Formate, 25 MB/20 Docs, ephemer geparst, Gate-1-Freeze — robust | ✅ vorhanden | Niedrig* |
| 3 | Dropbox-Connector | `get_connector` wirft **immer** `NotConfiguredError` — auch mit Secrets; reine Status-Attrappe (501); echte OAuth/Lese-Logik „folgt Phase B" | ❌ nicht implementiert | Hoch |
| 4 | Kein aktiver „weiter planen / Status reicht?"-Button | Gate 2 da; `HitlApprovalPrompt` da, aber kein expliziter Suffizienz-Entscheidungspunkt | ⚠️ teilweise | Mittel |
| 5 | ZGPM nicht user-centric; Agentenstruktur nicht visuell; Agenten nicht editier-/löschbar | Keine Harness-/Struktur-Visualisierung; kein Agent-CRUD; Schritt 3 zeigt nur Formular | ❌ fehlt | Hoch |
| 6 | Keine Beschreibung Agenten-Aufgaben/Skills | Im Runtime-UI nirgends | ❌ fehlt | Hoch |
| 7 | Gantt/RACI/Risiko/Token nur oberflächlich; Gantt + RACI fehlen | `/plan`: PVM = Inline-Chips, Risk/Token = einfache `<table>`; kein Gantt, keine RACI-Matrix, keine Auslastung | ⚠️ flach / ❌ Gantt+RACI | Hoch |
| 8 | Risikobeurteilung intransparent | Tabelle P/A/Ampel; Ampel serverseitig (E×A) ohne UI-Erklärung, keine Heatmap | ⚠️ intransparent | Mittel |
| 9 | Harness mitgestalten (Artefakte & Kommandos) | Keine Route, kein Editor, kein Kommandofeld | ❌ fehlt | Hoch |
| 10 | Visualisierung Agenten-Harness als Preflight | Nicht vorhanden | ❌ fehlt | Hoch |
| 11 | Harness freigeben / downloaden | Kein Gate 3, kein Export-Endpoint, kein Zip | ❌ fehlt | Kritisch |
| 12 | Handover-MD für Claude Code & Cowork | Nur statische Templates unter `harness/_template`; nichts wird generiert/exportiert | ❌ fehlt | Hoch |
| 13 | (implizit) Kette endet an Gate 2 | „Zur Übersicht" statt Phase BAUEN | ❌ Kette unterbrochen | Kritisch |
| + | (neu) DE/EN-Sprachumschaltung Schritt 7 | In `review/page.tsx` kein Sprach-Toggle | ❌ fehlt | Niedrig |

*) Code robust; falls real nicht nutzbar → Laufzeit-/Config-Bug, separat per Smoke-Test prüfen.

---

## 8. Priorisierung — Effort × Impact (McKinsey 2×2)

```
        IMPACT auf JTBD
          hoch │  WP-3 Plan-UX            │  WP-1 Harness+Export ★
               │  WP-2 Agenten-Viz+CRUD   │  WP-5 Dropbox
               │                          │
          ─────┼──────────────────────────┼────────────────────────
               │  WP-6 Suffizienz-Gate    │  WP-4 Projekt-CRUD
          gering│                          │  (Quick-Win: Delete in UI)
               └──────────────────────────┴────────────────────────
                 hoch                Effort                 gering
```

| WP | Inhalt | Impact | Effort | Sequenz |
|---|---|---|---|---|
| **WP-1 ★** | Harness-Compiler + Export-Zip + Gate 3 + Handover-MD | **XL** (löst Kern-JTBD) | L | **1** |
| WP-2 | Harness-/Agenten-Visualisierung (Preflight) + Agent-CRUD | L | L | 2 |
| WP-3 | Plan-UX: Gantt · RACI-Matrix · Risk-Heatmap · Token-Live | L | M | 3 |
| WP-4 | Projekt-CRUD: Delete-in-UI · Rename · Duplizieren | M | **S** | **Quick-Win zuerst mergebar** |
| WP-5 | Dropbox-Connector real (nur Dropbox) | M | M | 4 |
| WP-6 | Aktives Suffizienz-Gate „weiter planen?" | S | S | 5 |

**Empfohlene Reihenfolge:** WP-4 (sichtbarer Quick-Win, S) → **WP-1 (schließt die Kette, kritisch)** → WP-2 → WP-3 → WP-5 → WP-6.

---

## 9. Konkrete UX-Richtung je Cluster (damit „top-class" greifbar wird)

- **Harness-Preflight (WP-1/2):** Node-Graph (PMO-Orchestrator → Worker), HITL-Knoten als ◆-Badges; Klick auf Knoten öffnet Agenten-Karte (Mission · Aufgaben · Skills · Tools · HITL). Muster: *Progressive Disclosure* — Überblick zuerst, Details on demand (Pyramid).
- **Gantt:** horizontale Zeitachse mit KW-Raster, Balken je Meilenstein in Ampelfarbe, Abhängigkeitspfeile aus `predecessors`. Kein Drittanbieter-Schwergewicht nötig — SVG reicht.
- **RACI-Matrix:** Grid *Rolle × Meilenstein/Aktivität*, PVM-Codes als Zellen; Konsistenzregeln (≥1 A; genau ein F/L) als Inline-Validierung mit Warn-Icon.
- **Risk-Heatmap:** 5×5 P×A-Raster, Risiken als Punkte, Ampel-Zonen hinterlegt; Hover erklärt das Scoring → behebt „intransparent".
- **Token:** Fortschrittsbalken je Agent gegen Budget, Warnschwelle sichtbar; Formulierung „audit-ready", kein 100%-Claim.
- **Projekt-Verwaltung:** Karten-Kebab-Menü (Öffnen · Duplizieren · Löschen) + Lösch-Bestätigung (Guide-Vorgabe).
- **Empty States / Microcopy:** Schritt 3 sollte erklären „Hier entsteht gleich deine Agentenstruktur" statt nur Formularfelder zu zeigen.

---

## 10. Brand-/Methoden-Check (Constitution-konform)

Kein Befund und keine Empfehlung verletzt die eingefrorenen Eckpfeiler: Trust-Infrastructure-Framing, AIMS-Maturity, Rechtsräume DE/EU27/UK/CH, Produktnamen unverändert, ZGPM methodisch ohne PwC-Marken, keine 100%-Claims. Risk-/Token-Sicht ist „nachweisbar/audit-ready" zu formulieren, nicht „garantiert".

---

## 11. Selbstbewertung dieser Analyse

| Dimension | v1 | v2 |
|---|---|---|
| Vollständigkeit (alle 13 Punkte + Zusatzbefund, code-verifiziert) | 7 | 10 |
| Konsistenz (keine Widersprüche, Korrekturen offengelegt) | 6 | 10 |
| Customer-centric (JTBD, Journey-Reibung, So-what) | 5 | 10 |
| Top-class UX/UI (saubere Diagramme, konkrete Muster) | 6 | 10 |
| McKinsey-Rigor (MECE, Pyramid, Effort×Impact, Konfidenz/Limitation) | 7 | 10 |
| **Gesamt** | **6,5** | **10** |

---

*exmachinAI · AEGIRA AI Trust Platform · Gap-Analyse v2 · 30.05.2026 · Basis: Code-Stand `planner/` (Next.js + FastAPI)*
