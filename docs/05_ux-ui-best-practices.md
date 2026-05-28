# 05 — UX/UI Best Practices · Planner App (verbindlich)

> **Status: BINDEND.** Diese Spec regelt das User-Experience- und User-Interface-Design der Planner App (Web-App, Frontend `/app/*`). Sie ist Quality-Gate für jedes UI-PR. Methodology-Guard-Agent enforced.
>
> Synthese aus: Anthropic-Agentic-UX-Patterns, Vercel-AI-SDK-Konventionen, Nielsen Norman Group AI-UX-Forschung, Linear / Stripe / Vercel-v0 / Cursor / Claude.ai als Benchmarks, WCAG 2.2 AA, Refactoring UI, Material 3, Inclusive-Design-Patterns.

---

## 1. Ziel und Erfolgsmaß

Die Planner App ist das primäre Werkzeug von HITL-Projektleitern, um aus Aufträgen ZGPM-konforme Pläne zu erzeugen. Erfolg = nicht „viele Features", sondern:

| Metrik | Ziel |
|---|---|
| Zeit bis erster validierter Plan (Persona: SMB-Founder) | < 30 Minuten |
| Time-to-second-plan | < 5 Minuten (Wiederkehrer) |
| Approval-Eingabe von HITL-PM (Median) | < 90 Sekunden je Meilenstein |
| Verständnis-Rate „was tun die Agenten gerade" | > 90% (Test) |
| Vertrauen-Score (post-task NPS) | > 50 |
| Fehler-Recovery (nach FAIL) ohne Support | > 80% |
| Lighthouse Performance (P95-Page) | ≥ 90 |
| WCAG 2.2 AA Compliance | 100% Pflicht-Pages |

**Anti-Ziel:** Komplexität, die so wirkt als hätte sie Wert. Funktionen ohne Eval gegen die obigen Metriken sind verboten.

---

## 2. Fünf Grund-Prinzipien

| # | Prinzip | Konsequenz |
|---|---|---|
| **U1** | **Klarheit vor Cleverness** | Keine Hidden-Gestures, keine ungelabelten Icons. Was der User sieht, ist was er bekommt. |
| **U2** | **Transparenz der Agenten** | Jede Agent-Entscheidung ist sichtbar, in einfacher Sprache, mit Provenance. |
| **U3** | **Reversibilität** | Jede Aktion hat einen Undo-Pfad oder einen explizit-irreversibel-Marker mit Doppelbestätigung. |
| **U4** | **Latenz-Toleranz statt -Verbergen** | Streaming-First. Spinner-Verbot. Always-show-progress. |
| **U5** | **Vertrauen durch Detailtiefe-on-Demand** | Default-View ist „sauber". Profis können auf Detail-Tiefe zoomen (Plan-Graph, Token-Log, Reviewer-Trace). |

---

## 3. Information-Architektur

```
/app
  /(auth)
    /login
    /sso-callback
  /(workspace)                       Top-Nav + Side-Nav
    /                                 Dashboard: meine Projekte
    /projects
      /[id]                            Projekt-Detail
        /plan                          Plan-View (MSP/PVM/Risk)
        /session                       Live-Multi-Agent-View
        /harness                       Compile + Download
        /audit                         Audit-Trail
        /settings                      Projekt-Einstellungen
    /templates                         ZGPM-Vorlagen
    /audit                             Tenant-weiter Audit
  /(tenant-admin)
    /members
    /billing
    /usage
    /security                          Tokens, MCPs, Constitution-Guard
  /(help)
    /docs                              embedded
    /walkthroughs
    /support
```

Side-Nav ist **kontext-sensitiv**: in `/projects/[id]/` zeigt sie die Meilensteine als Inline-Outline.

---

## 4. Design Tokens

### 4.1 Farben (AEGIRA-Brand · siehe `BRAND.md`)

| Token | Hex | Einsatz |
|---|---|---|
| `--c-ink` | `#0E1735` | Primärtext, Header |
| `--c-navy` | `#1E2761` | Brand-Primär, Logo, Headlines, Active-Nav |
| `--c-navy-dark` | `#0B143E` | Footer, tiefer Kontrast, Dark-Mode-Hintergrund |
| `--c-steel` | `#5B6B85` | Sekundärtext |
| `--c-gray` | `#8A93A6` | Captions, Meta |
| `--c-ice` | `#CADCFC` | Subtle Supportflächen, Disabled |
| `--c-vellum` | `#FCFAF6` | **Default Light-Mode Page-Background** (warmer Off-White) |
| `--c-surface` | `#FFFFFF` | Cards |
| `--c-gold` | `#E6B32F` | **Accent — Decision/Approval-CTA, Attestation-Marker.** Max 10 % Flächenanteil |
| `--c-green` | `#5A9367` | Risiko grün, PASS-States |
| `--c-amber` | `#E8A33A` | Risiko gelb (verwandt mit Gold, NIE als CTA) |
| `--c-red` | `#C3423F` | Risiko rot, HARD_FAIL |

**Dark Mode** (Pflicht): `--c-bg = --c-navy-dark`, `--c-surface = --c-navy`, `--c-ink = --c-vellum`. Toggle in Top-Nav, persistiert in localStorage UND Cosmos-User-Pref. System-Preference per `prefers-color-scheme`.

**Verbot:**
- Gradients als Default-Stil. Nur in Hero/Login.
- Gold-Fläche > 10 % auf einer Page. Sonst verliert das Akzent seine Signalwirkung.
- Coral, Cyan, Magenta — außerhalb der Sovereign-Palette.
- Mehr als drei „Signal-Farben" auf einer Page (rot/gelb/grün + max 1 Akzent).
- Box-Shadows als Default-Stil — wir nutzen Hairlines (1 px Navy auf Vellum, editorial-look).

### 4.2 Typografie

```css
--font-display: 'Bricolage Grotesque', 'Inter', system-ui;  /* Headlines, editorial */
--font-body:    'Inter', system-ui;                          /* Body */
--font-mono:    'JetBrains Mono', 'Consolas';                /* Code, IDs, YAML */
```

Wortmarke „AEGIRA" ist bereits als SVG-Pfade in den Logo-Assets — keine Web-Font-Abhängigkeit für das Logo selbst.

| Element | Size / Line / Weight |
|---|---|
| `h1` Page-Title | 30 / 38 / 700 |
| `h2` Section-Header | 22 / 30 / 600 |
| `h3` Card-Title | 16 / 22 / 600 |
| Body | 14 / 20 / 400 |
| Small / Caption | 12 / 18 / 400 |
| Mono / Code | 13 / 20 / 400 |

Pflicht-Constraint: **Max-Line-Length 72 Zeichen** für Body — Lesbarkeitsgrenze (Bringhurst, Refactoring UI).

### 4.3 Spacing-Scale

8-Punkt-Grid: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Keine Magic Numbers außerhalb.

### 4.4 Radius

- `--r-sm: 4px` — Buttons, Tags
- `--r-md: 8px` — Cards
- `--r-lg: 12px` — Modals, Sheets
- `--r-pill: 9999px` — Status-Badges

### 4.5 Schatten

Sparsam. Drei Tiers:
- `--sh-0`: keine.
- `--sh-1`: subtle (Cards on Page).
- `--sh-2`: prominent (Modals, Floating).

---

## 5. Layout-Patterns

### 5.1 Top-Nav

```
[ AEGIRA-Logo | Workspace-Switcher v ]                 [ Suche ] [ ? ] [ User v ]
```

- **Workspace-Switcher** für Multi-Tenant — prominent, links.
- **Suche** mit `cmd+k` Shortcut, global.
- **Help-Icon** öffnet Side-Sheet mit Kontext-Hilfe (siehe §11).

### 5.2 Side-Nav (Workspace-Mode)

```
Dashboard
Projekte
  > Aktuelles Projekt
      Plan
      Session (live)
      Harness
      Audit
      Settings
Templates
Tenant-Audit
```

Side-Nav: kollabierbar, Status persistiert per User. Default: kollabiert auf < 1024px.

### 5.3 Content-Container

Max-Width für Reading-Content: 880px. Für Plan-Graphen und Dashboards: full-width.

### 5.4 Card-Grids

Responsive Grid: 1 col `< 640px`, 2 cols `< 1024px`, 3 cols `≥ 1024px`. Karten haben **gleiche Höhe in einer Reihe**.

---

## 6. Komponenten-Bibliothek

Pflicht: **shadcn/ui** + **Tailwind v4** + **Radix UI Primitives** + **Lucide Icons**.

### 6.1 Pflicht-Komponenten

| Komponente | Wofür |
|---|---|
| `<PageHeader>` | h1 + Description + Right-Actions |
| `<KpiCard>` | Eine Zahl, ein Trend, ein Label |
| `<StatusBadge>` | rot/gelb/grün/PASS/FAIL Pills |
| `<AgentTrace>` | Live-Stream eines Subagent-Outputs |
| `<MilestoneCard>` | Eine Karte je Meilenstein in der Plan-View |
| `<PvmMatrix>` | Spreadsheet-like Verantwortlichkeitsmatrix |
| `<RiskAmpel>` | Visual indicator rot/gelb/grün |
| `<HitlApprovalPrompt>` | Inline-Prompt mit „Approve / Request Changes / Stop" |
| `<DecisionTreeBranch>` | Für Q&A-Discovery-Schritte |
| `<EvidenceLink>` | Inline-Link zu Source (z.B. Plan-YAML-Zeile, Reviewer-Log-Zeile) |
| `<ProvenanceTooltip>` | Hover-Card mit „Woher kommt diese Aussage?" |
| `<UsageMeter>` | Token-Verbrauch im laufenden Run |
| `<DiffViewer>` | Plan-Versionsvergleich (yaml-diff visualisiert) |

### 6.2 Verbotene Komponenten

- Generische Modal-Stacks (max 1 Modal aktiv).
- Karussells (versteckt Inhalt).
- Auto-Play-Videos.
- Hover-Only-Interaktionen (Accessibility).
- Custom-Form-Selects ohne Native-Fallback.

---

## 7. Multi-Agent-Live-View — zentrales Pattern

Wichtigster eigener Screen. Pattern aus Claude.ai („Computer Use") + Cognition Devin („Track").

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Session #abcdef · Projekt „AGP Launch DE"               [⏸ Pause] [✕] │
├─────────────────────────────┬───────────────────────────────────────────┤
│ Plan-State (Outline)        │  Aktiver Trace                            │
│                             │                                           │
│ PH1 Discovery               │   🤖 PMO-Agent (Extended Thinking)       │
│   ● M01 Persona-Validierung │      "Ich strukturiere den Auftrag in 4   │
│     gruen · 4/4 Aktivitäten │       Phasen nach MECE..."                │
│   ● M02 API-Architektur     │                                           │
│     gelb · 2/5 Aktivitäten  │   📞 Tool: skill:zgpm-compose             │
│ PH2 Design                  │                                           │
│   ◐ M03 DSC-Konzept (aktiv) │   🤖 Architecture-Agent (delegated)      │
│     rot  · 0/3 Aktivitäten  │      "Beginne PVM-Ableitung für M01..."   │
│ PH3 Build                   │                                           │
│   ○ M04                     │   ⏳ Streaming...                         │
│   ○ M05                     │                                           │
├─────────────────────────────┴───────────────────────────────────────────┤
│  Token-Budget [████████░░] 80%  ·  Latenz 14s p95  ·  Cost €0.42       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Streaming-Pattern (Pflicht)

- Token-Streaming via **Server-Sent Events** (kein Polling, kein WebSocket-Overhead).
- Auto-Scroll mit „Anti-Snap"-Detection: wenn User hochscrollt → Pause; Button „neuer Output ↓" erscheint.
- **Throttling** auf 30 Updates/Sek max (Anti-Flicker).
- Smooth-Easing der Update-Animation (200ms).

### 7.2 Provenance & Trust

Jede Agent-Aussage hat:
- Avatar + Name + Rolle.
- Klick auf Avatar → öffnet `agents/<name>.md` als Side-Sheet.
- Tool-Calls als **collapsible Accordions** mit Input/Output.
- „Warum dieser Schritt?"-Tooltip auf jedem Knoten.

### 7.3 HITL-Approval-Inline

Wenn ein Approval ansteht: Erscheint **inline im Trace** (nicht als Modal):

```
┌────────────────────────────────────────────────────────────┐
│  ✋ APPROVAL ERFORDERLICH · M02 — API-Architektur freigeg. │
│                                                             │
│  Phase: Design       Risiko: gelb (R03, R07)                │
│  Aktivitäten: 5/5    Reviewer: PASS mit 1 Hinweis           │
│                                                             │
│  Reviewer-Hinweis: „Plan-Pyramid ok, aber Aufwand für      │
│  A02 wirkt unterschätzt — siehe risks.yaml#R07."           │
│                                                             │
│  [ Approve ]    [ Request Changes ]    [ Stop Run ]        │
└────────────────────────────────────────────────────────────┘
```

- Approve: ⌘⏎ Shortcut.
- Request Changes: öffnet Inline-Textarea, kein Modal.
- Stop: doppelte Bestätigung, weil destruktiv.

---

## 8. Plan-View

Drei Tabs auf gleicher Page: **MSP** (Meilensteinplan-Visualisierung) · **PVM** (Matrix) · **Risiken**.

### 8.1 MSP — Phase-Lane-View

Y-Achse = Ergebnispfade, X-Achse = Phasen. Meilensteine als Karten in der Zelle. Vorgänger-Nachfolger als dünne Linien.

Klick auf Meilenstein → Slide-out mit Aktivitätenliste + Risiken + PVM für diesen MS.

### 8.2 PVM — Matrix-Editor

Wie Excel-Sheet, aber:
- Header sticky.
- Code-Eingabe per Dropdown (`A`/`B`/`E`/`e`/`F`/`L`/`I`/`V`).
- Live-Validation: ungültiger Code = rot umrandet + Tooltip mit Regel.
- Pflicht-Regel-Violations am Fuß sichtbar als Bar.

### 8.3 Risiken — Liste

Sortierbar nach Ampel/Wahrscheinlichkeit/Auswirkung. Klick öffnet Detail mit Mitigation-Editor.

---

## 9. Platform-Discovery — Wizard

Pflicht-Wizard beim ersten Run jedes Projekts. Drei Schritte, Pyramid-of-Easy-Decisions:

**Step 1:** „Was ist das für ein Projekt?" → 3 große Karten (Concept / Technical / Hybrid). Vor jeder Karte: Beispiele.

**Step 2** (nur bei technical/hybrid): „Welche Zielplattform?" → 7 Karten + „weiß nicht — später entscheiden".

**Step 3:** Zusammenfassung + „los geht's".

Pattern aus Stripe-Onboarding, Vercel-Project-Setup.

### 9.1 Wizard-UX-Regeln

- Linear, kein Skip. Kein Zurück verschwindet — User darf jederzeit zurück.
- **Progress-Indicator** oben sichtbar (3 Punkte).
- Jeder Schritt eine eigene URL (deeplinkable).
- Eingaben werden bei Browser-Refresh wiederhergestellt (URL-State oder Cosmos-Session-Doc).
- Step-Completion-Animation: subtile Confetti? **Nein.** Aber kurzes Check-Glyph.

---

## 10. Forms & Inputs

### 10.1 Pflicht-Patterns

- **Labels über** Inputs (nicht innen).
- **Required-Asterisks** als optisches Signal + screen-reader-only Text.
- **Inline-Errors** unter dem Feld, rot, mit Fix-Vorschlag.
- **Save-on-Blur** für lange Forms.
- **Optimistic UI** für schnelle Akzeptanz, Rollback bei Server-Error.

### 10.2 Verbot

- Captchas bei eingeloggten Usern.
- E-Mail-Validation per Regex ohne Test-Sendung (Edge-Case-Tolerant: `+`, Punkte).
- Forced-Password-Strength-Meter ohne Erklärung.
- Auto-Format während Tippen (z.B. Telefonnummer aufbrechen) — passiert nicht in deutschem B2B-Kontext.

---

## 11. In-App-Hilfe

Hilfe ist Pflicht (Cowork-Concierge funktioniert nur, wenn die App selbst Hilfe bietet). Patterns:

| Trigger | Pattern |
|---|---|
| Top-Nav `?` | Help-Side-Sheet mit Kontextsuche |
| `cmd+/` global | Command-Palette mit Action+Help |
| Inline-Tooltip auf Konzepten (z.B. „PVM" hover) | Definition + Link „mehr in docs/01" |
| Empty-State auf jeder Page | „Was kannst du hier tun?" mit Onboarding-Mini-Walkthrough |
| HITL-Approval | „Was bedeutet Approve?" als kleiner Link |

Help-Suche durchsucht `docs/*.md` plus AEGIRA-Knowledge-Repo (read-only).

---

## 12. Error-States, Loading-States, Empty-States

### 12.1 Error-Patterns

Pflicht-Trias:
1. **Was ist passiert?** (klar, ohne Tech-Jargon)
2. **Warum?** (ein Satz)
3. **Was tun?** (konkret, ein Button)

Beispiel:

```
🚨 Plan-Validierung fehlgeschlagen
Der Plan verletzt die ZGPM-Regel R2: M03 hat sowohl F als auch L.
[ Konflikt zeigen ]   [ Auto-Fix vorschlagen ]
```

Verbot: "Something went wrong. Please try again." → ist eine Anti-Pattern-Phrase.

### 12.2 Loading-States

- Skeleton-Loaders für Listen.
- Streaming für Agent-Outputs (siehe §7.1).
- Bei Background-Jobs (z.B. Harness-Compile): **Job-Status-Page** mit ETA und Möglichkeit zu „Notify me when done".

Verbot:
- Vollbild-Spinner für > 1s sichtbar.
- Endlose Loaders ohne Timeout.
- „Loading…"-Text ohne Substance.

### 12.3 Empty-States

Jede leere Liste hat:
- Icon oder Illustration.
- 1-Satz-Erklärung.
- Primary-CTA „erstellen" oder „importieren".
- Optional: 1-Satz-Onboarding-Tipp.

---

## 13. Onboarding

Tier-1-Onboarding (Erstnutzung): Cowork führt durch Installation. Tier-2-Onboarding (erste Plan-Erzeugung): in der App.

Tier-2-Pattern (aus Linear, Stripe):
1. **Tour-Tooltips** auf den vier wichtigsten Bedien-Elementen (Side-Nav, Workspace-Switcher, Plan-Tabs, Help). Skippable.
2. **Sample-Project** verfügbar als „Beispiel anzeigen" — User kann durchklicken, ohne Zwang.
3. **Checklist-Widget** in der oberen rechten Ecke: „Setup-Aufgaben: 3/6 erledigt". Dismissable, persistiert.

Verbot:
- Tour-Modals, die User-Aktion erzwingen (siehe Hick's Law).
- Auto-Start-Tour bei jedem Login.

---

## 14. Real-Time-Patterns

### 14.1 Notifications

- Inline-Banner (oben unter Header) für aktive Probleme.
- Toast-Bottom-Right für transiente Events (Save erfolgreich, etc.).
- Side-Sheet „Activity" für historisch.

Verbot:
- Browser-Push-Notifications außer für explizit aktivierte HITL-Approvals.

### 14.2 Live-Indicators

- Live-Pulse-Dot neben „Session aktiv".
- Optimistic-Save-Indicator („gespeichert vor 2s") in Plan-Editor.

---

## 15. Mobile

Pflicht-Mobile-Support:
- Login + Dashboard + HITL-Approvals.
- Plan-View read-only auf Mobile.
- PVM-Editor desktop-only (mit erklärendem Empty-State auf Mobile).

Breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.

Touch-Targets ≥ 44×44px (WCAG 2.5.5).

---

## 16. Internationalisierung

Default-Sprache: Deutsch. Englisch als Pflicht-Option.

- Alle Strings in `messages/<lang>.json`, geladen via `next-intl`.
- Datum/Zeit/Zahl: `Intl.DateTimeFormat`/`Intl.NumberFormat`, kein selbst-formatieren.
- Plural-Regeln: ICU-Plural.
- RTL-Support vorgesehen, nicht initial implementiert.

Verbot:
- Hardcoded-Strings in Komponenten.
- Englische Fachbegriffe ohne deutsche Erklärung (Glossar in `/help`).

---

## 17. Accessibility (WCAG 2.2 AA Pflicht)

- **Keyboard-Navigation:** alle Aktionen erreichbar, Tab-Order vorhersagbar, Focus-Ring sichtbar (`--c-coral` 2px outline).
- **Screen-Reader:** semantische HTML, ARIA-Labels nur wo nötig, Live-Regions für Stream-Updates (`aria-live="polite"`).
- **Kontrast:** alle Body-Text-Combos ≥ 4.5:1; Large-Text ≥ 3:1.
- **Motion-Reduce:** `prefers-reduced-motion` → keine Animation außer Funktion (Stream-Updates).
- **Form-Errors:** mit Feld verknüpft via `aria-describedby`.
- **Skip-Links:** „Zum Inhalt springen" als erste Tab-Position.

Test:
- axe-DevTools im CI.
- Manual Screen-Reader-Test mit VoiceOver vor jedem GA-Release.
- Cognitive-Load-Test mit nicht-technischer Persona.

---

## 18. Performance-Budget

| Metrik | Budget |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s P75 |
| CLS (Cumulative Layout Shift) | < 0.05 |
| INP (Interaction to Next Paint) | < 200ms P75 |
| JS-Bundle initial | < 200 KB gzipped |
| API-Response P95 für `/projects/[id]` | < 250ms |
| First-token-time bei Streaming | < 1.5s |

Hard-Stop in CI bei Überschreitung (Lighthouse-CI).

Tactics:
- React Server Components für Static-Parts.
- `next/dynamic` für PVM-Editor (lazy).
- `next/image` für alle Bilder.
- CDN-First via Azure Front Door.

---

## 19. Trust-Signals

Anthropic-Forschung („Agentic-Misalignment"): Vertrauen entsteht durch **sichtbare Constraints**, nicht durch Versprechungen.

Pflicht-Trust-Signals in der App:

1. **Constitution-Banner** oben in jeder Session: „Du arbeitest unter AEGIRA-Constitution v1.x — Top-Norm bei Konflikten."
2. **Constraint-Indicators**: bei jedem Agent-Output kleine Icons für aktive Hooks (🛡 = Constitution-Guard, 💰 = Token-Budget, 🛑 = Stop-on-red).
3. **Provenance-Tooltip** auf jeder generierten Aussage.
4. **Audit-Log-Link** in der Footer-Bar: „alle Aktionen sind protokolliert".
5. **„Was tun, wenn du widersprechen willst"** — Button in jedem Reviewer-Output.

Verbot:
- 100%-Claims im UI-Text („garantiert audit-konform" → nein).
- Hidden-State (alle relevanten Zustände sind sichtbar).
- Magic-Button („Plan automatisch fixen") ohne Diff-Anzeige.

---

## 20. Microcopy-Prinzipien

- **Aktiv, nicht passiv.** „Plan erzeugen" statt „Plan wird erzeugt werden können".
- **Konkret, nicht abstrakt.** „14 Sekunden geblieben" statt „bald fertig".
- **Du-Form auf Deutsch**, Friendly-Default auf Englisch.
- **Keine technischen Jargon-Wörter** im Default-UI. Begriffe wie „Subagent" werden erklärt oder vermieden.
- **Fehlertexte mit Empathie**: „Das hat nicht geklappt — hier ist, was wir tun können:"

Verbot:
- „Bitte." (passt nicht zu B2B-DACH-Sprache, wirkt unterwürfig).
- „Anscheinend …" (zeigt Unsicherheit, wo Klarheit gebraucht wird).
- Emojis im Action-Text (Icons ja, Emojis nein).

---

## 21. Anti-Patterns (verboten)

| # | Anti-Pattern | Warum |
|---|---|---|
| AP1 | Mystery Meat Navigation (Icons ohne Label) | Klarheit verloren |
| AP2 | Dark Patterns (versteckte CTAs, Forced-Choice) | Vertrauen weg |
| AP3 | Vollbild-Modals für Nicht-kritische Entscheidungen | Latenz-Steuer |
| AP4 | Auto-Open-Modal beim Login | Onboarding-Schock |
| AP5 | Endlose Spinner ohne ETA | Latenz-Verbergen |
| AP6 | Streaming ohne Stop-Button | Kontroll-Verlust |
| AP7 | Glassmorphism als Default-Stil | Lesbarkeit |
| AP8 | Generischer Loading-Text „Loading…" | leer |
| AP9 | Custom-Cursor-Icons | Accessibility |
| AP10 | Hover-Only-Tooltips ohne Tab-Equivalent | Accessibility |
| AP11 | Coral-Farbe für Decoration statt CTA | Signalverlust |
| AP12 | Mehr als 1 Modal-Layer gleichzeitig | Kognitive Last |
| AP13 | Auto-Refresh bei Stream-Update | Tab-Hijack |
| AP14 | „Don't show again"-Toggles ohne Reset-Option | Trap |
| AP15 | 100%-Claims im UI-Text | Constitution-Verstoß |
| AP16 | Mock-Charts ohne realistischen Skala | Trust-Verlust |
| AP17 | Versteckte Provenance (kein Source-Link) | Trust-Verlust |
| AP18 | „AI-Generated" ohne explizites Label (Art. 50 EU AI Act) | Rechtlich |
| AP19 | „Recommended"-Plan-Patches ohne Diff | Reversibilität verloren |
| AP20 | Animation auf jedem State-Change | Motion-Sickness, Distract |

---

## 22. Komponenten-Beispiele (gekürzt)

### 22.1 `<AgentTrace>`

```tsx
<AgentTrace
  agent={trace.agent}
  iteration={trace.iteration}
  thinking={trace.thinking}
  tools={trace.tools}
  status={trace.status}
  tokensUsed={trace.tokens}
  provenance={trace.sources}
  onClickAgent={openAgentDoc}
  onClickTool={openToolDetail}
/>
```

### 22.2 `<HitlApprovalPrompt>`

```tsx
<HitlApprovalPrompt
  milestoneId="M02"
  milestoneText="API-Architektur freigegeben"
  reviewer={{ status: "PASS", findings: [...] }}
  risks={["R03", "R07"]}
  onApprove={...}
  onRequestChanges={...}
  onStop={...}
  shortcutHint="⌘⏎"
/>
```

---

## 23. Design-System-Quellen (Inspiration & Auditing-Referenzen)

- **Linear** — Bedien-Geschwindigkeit, Command-K, Keyboard-First.
- **Vercel Dashboard** — Datenresidenz-Transparenz, Tenant-Switching, Audit-Page.
- **Stripe Dashboard** — Form-Validation, Trust-Layout.
- **Claude.ai (Anthropic)** — Multi-Agent-Stream, Side-Sheet-Doku.
- **Cognition Devin / DevinTrack** — Agent-Trace-Visualisierung.
- **Cursor** — AI-Diff-Patterns.
- **Vercel v0** — AI-Output-Card-Patterns.
- **Refactoring UI (Adam Wathan, Steve Schoger)** — Spacing, Color, Typo-Praktiken.
- **shadcn/ui** — Component-Source.

Verbot:
- Visual-Plagiat. Wir nehmen Patterns, nicht Pixel.

---

## 24. Test-Plan vor jedem Release

| Test | Ziel |
|---|---|
| WCAG 2.2 AA axe-Scan | 0 Violations auf Pflicht-Pages |
| Lighthouse Mobile P95 | ≥ 90 |
| Manual Screen-Reader-Walkthrough | VoiceOver + NVDA |
| Cognitive-Load-Test mit Non-Tech-User | Aufgabe „erstes Projekt erzeugen" < 30 Min |
| Internationalization-Smoke (DE + EN) | keine fehlenden Strings |
| Trust-Pattern-Review (Constitution-Banner, AP15) | manuell durch Methodology-Guard-Agent |
| Visual-Regression (Chromatic) | 0 unerwartete Diffs |
| Performance-Budget-Check | unter Hard-Stop |
| Empty-State-Walkthrough auf allen Pages | Visual-Review |
| Error-State-Walkthrough (alle Fehler-Pfade) | Visual-Review |

---

## 25. Quellen

Primär:

- Anthropic, [Agentic Misalignment Research](https://www.anthropic.com/research/agentic-misalignment) (Jun 2025) — Trust-Signal-Patterns.
- Vercel, [AI SDK UI Documentation](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot) — useChat, Streaming.
- Vercel, [Design Engineering Principles](https://vercel.com/design) — Component-Library.
- Nielsen Norman Group, [AI UX Research Library](https://www.nngroup.com/topic/ai/) — Discoverability, Trust, Conversational UX.
- Refactoring UI (Adam Wathan + Steve Schoger) — Spacing, Color, Hierarchy.
- WCAG 2.2 — Accessibility (W3C Recommendation 2023).
- W3C, [Authentication / Identity Patterns](https://www.w3.org/WAI/patterns/).

Sekundär:

- Linear Design System Notes — Speed, Command-K.
- Vercel Dashboard UX Notes.
- Stripe UI Building Blocks — Forms, Trust.
- Cognition Devin Track — Multi-Agent-Trace.
- Cursor UI Patterns — AI-Diff.
- Heydon Pickering, „Inclusive Components" — A11y-Pattern-Reference.
- Material Design 3 — Motion-Reduction, Color-Tokens.

Standards:

- EU AI Act, Artikel 50 — Transparenzpflicht für AI-Output (Mark AI-generierten Inhalt).
- ISO/IEC 25010 — System & Software Quality Models (Usability-Sub-Model).
- DSGVO Art. 13 — Informationspflicht.

---

## 26. Versions-Notiz

Schema-Version dieses Dokuments: **1.0** (28.05.2026).

Änderung dieser Spec erfordert:
- HITL-PM Approval.
- Methodology-Guard-Agent-Review.
- Design-System-Maintainer-Approval.

Inkrement bei jeder Anti-Pattern-Erweiterung (`AP21+`), jedem neuen Token-Set, jeder Komponenten-Bibliotheks-Umstellung.
