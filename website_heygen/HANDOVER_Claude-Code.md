# HANDOVER → Claude Code · zgpm.aegira.ai — Interner Explainer + HeyGen-Paket

**Ort:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER/website_heygen/`
**Datum:** 2026-06-04 · **Status:** Screenshots vollständig (0–13); 2 offene Punkte (HeyGen-Embed, Deploy)
**Zweck:** Interner Explainer (hinter 2FA) für den AEGIRA Planner + HeyGen-Story. Thema:
**Zielgeführtes Generatives Projekt Management** — methodisch konsistente Agenten-Harnesse planen & umsetzen:
**Planung → Prototyp → Product**.

---

## 0. Leitplanken (verbindlich)
- **Brand:** Navy `#1E2761` / Navy-dark `#0B143E` · **Gold `#E6B32F`** (KEIN Orange `#E8703A`) · Vellum `#FCFAF6` · Ice `#CADCFC` · Fonts **Bricolage Grotesque** (Display) + **Inter** (Body). Logo: offizielle AEGIRA-Lockups in `assets/logo/`.
- **Intern:** Seite ist `noindex,nofollow`, liegt hinter 2FA — keine externe Vermarktung, kein Impressum/Datenschutz.
- **Keine 100%-Claims.** Rechtsräume DE/EU27-Rest/UK/CH (kein „DACH"). Produktnamen nur AI Navigator/Guardian/Commander.
- **Kein externes `jsonschema`/Frameworks** für die Seite — sie ist bewusst Single-File-HTML/CSS/JS (nur Google Fonts extern).

## 1. Struktur
```
website_heygen/
├── index.html                         # Explainer (Hero → Video-Slot → 3 P → Journey 14 Schritte → User-Guide-Reader)
├── README.md                          # Bedienung + Screenshot-Slot-Tabelle
├── assets/
│   ├── logo/  aegira_zgpm_lockup_* + offizielle Lockups + Signet-SVG
│   ├── screenshots/  00..13 + 10-2 · archiv/   # 14 Schritte (0–13), alle echt; Detail-Crops in archiv/
│   └── userguide/  *.pptx · *.pdf · slides/slide-01..29.png   # User-Guide-Reader (brand-gold, Stand 06/2026)
└── heygen/  produkt_teaser_minianleitung.md · heygen_skript.md · heygen_storyboard.md · heygen_scene_sheet.csv
```

## 2. Fertig
- **Weltklasse-UX** (Refactoring-UI: Typescale, Whitespace, zweiteilige Schatten, Akzent-Borders), Fortschrittsbalken, **Journey-Clickflow** (Side-Rail-Scrollspy, Prev/Next, Pfeiltasten ←/→, Screenshot-Lightbox).
- **Video-Slot definiert** (prominent unter dem Hero, `#explainer`).
- **Skip-Button** „Überspringen → App" (Header + Hero) → `https://zgpm.aegira.ai`.
- **User-Guide-Reader** (29 Slides, Blättern/Zoom + PPTX/PDF-Download), Deck auf Brand-Gold + Gates/Begriffe aktualisiert.
- HeyGen-Paket: Skript (~2:30 min), Storyboard, Scene-Sheet (selektive Screen-Zuordnung je Szene).

## 3. Screenshots — Status: ✅ vollständig
14 Schritte (Storyline 0–13), durchnummeriert; Harness-Schritt mit 2 Bildern (`10-1`, `10-2`). **Alle echt & sauber** (kein Login-Overlay, keine Platzhalter mehr). Reihenfolge:
`00_projektuebersicht · 01_beschreiben · 02_interview · 03_verstaendnis · 04_leitplanken · 05_meilensteine · 06_plan · 07_gantt_raci · 08_heatmap_token · 09_review · 10-1_harness · 10-2_harness_agenten · 11_agenten_flow · 12_export · 13_ausdruck`
Nicht genutzte Detail-Crops liegen benannt in `assets/screenshots/archiv/`. Beim Austausch eines Screens denselben Dateinamen verwenden — Explainer **und** HeyGen-Story ziehen automatisch nach.

## 3b. Offene Tasks

### P0 — HeyGen-Video einbetten
In `index.html` Abschnitt `#explainer` (Kommentar „EXPLAINER-VIDEO · DEFINIERTER PLATZ"): den `<div class="videoframe">…</div>` durch das Embed ersetzen — `<video controls poster …>` oder HeyGen-Share-`<iframe>` (16:9). Skript/Szenen siehe `heygen/`.

### P1 — Deployment
Statisch hinter 2FA ausliefern (z. B. unter `zgpm.aegira.ai/explainer`), `noindex` beibehalten. Assets relativ — nur Ordner hochladen.

## 4. Definition of Done
Alle 14 Screens sauber (kein Login-Overlay) · HeyGen-Embed im Slot · Skip-Button führt zur App · `noindex` aktiv · Brand-Gold (kein Orange) durchgängig · Lighthouse-A11y ≥ 95 · Seite öffnet ohne Konsolenfehler.

## 5. Verweise
`README.md` (Slot-Tabelle), `heygen/heygen_storyboard.md` (Szene↔Screen), `gap_analyse/TESTSTRATEGIE_v0.9.5_…` (App-Teststrategie), `gap_analyse/HANDOVER_Claude-Code_v0.9_Umsetzung_…` (App-Release v0.9).

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust.*
