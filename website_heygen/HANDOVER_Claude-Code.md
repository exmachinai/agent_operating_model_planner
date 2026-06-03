# HANDOVER → Claude Code · zgpm.aegira.ai — Interner Explainer + HeyGen-Paket

**Ort:** `50_APPS/20_AGENT_OPERATING_MODEL_PLANNER/website_heygen/`
**Datum:** 2026-06-03 · **Status:** funktionsfähig, 3 offene Punkte (P0/P1)
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
│   ├── screenshots/  01..14_*.png     # 14 Journey-Slots (3 echt, Rest Platzhalter — s. §3)
│   └── userguide/  *.pptx · *.pdf · slides/slide-01..29.png   # User-Guide-Reader (brand-gold, Stand 06/2026)
└── heygen/  produkt_teaser_minianleitung.md · heygen_skript.md · heygen_storyboard.md · heygen_scene_sheet.csv
```

## 2. Fertig
- **Weltklasse-UX** (Refactoring-UI: Typescale, Whitespace, zweiteilige Schatten, Akzent-Borders), Fortschrittsbalken, **Journey-Clickflow** (Side-Rail-Scrollspy, Prev/Next, Pfeiltasten ←/→, Screenshot-Lightbox).
- **Video-Slot definiert** (prominent unter dem Hero, `#explainer`).
- **Skip-Button** „Überspringen → App" (Header + Hero) → `https://zgpm.aegira.ai`.
- **User-Guide-Reader** (29 Slides, Blättern/Zoom + PPTX/PDF-Download), Deck auf Brand-Gold + Gates/Begriffe aktualisiert.
- HeyGen-Paket: Skript (~2:30 min), Storyboard, Scene-Sheet (selektive Screen-Zuordnung je Szene).

## 3. Offene Tasks
### P0 — Screenshots ersetzen
Die Journey referenziert 14 Dateien in `assets/screenshots/`. **3 echte sind vom 2FA-Login-Overlay verdeckt, 11 sind beschriftete Platzhalter.** Saubere Screenshots (vom Anwender bereitgestellt) unter exakt diesem Namen ablegen — dann erscheinen sie automatisch in Explainer **und** HeyGen-Story:
`01_projekte · 02_beschreiben · 03_interview · 04_verstaendnis · 05_leitplanken · 06_meilensteine · 07_plan · 08_plan_gantt_raci · 09_plan_heatmap_token · 10_review · 11_harness · 12_agenten_flow · 13_export · 14_ausdruck`
**Mindestens neu/sauber:** `12_agenten_flow.png` (Vollbild-Canvas) und `14_ausdruck.png` (Druck/PDF).
> Hinweis: Screenshots **nur bei aktiver, eingeloggter Session** aufnehmen (die App sperrt nach Idle per 2FA; das Overlay nicht per JS umgehen).

### P0 — HeyGen-Video einbetten
In `index.html` Abschnitt `#explainer` (Kommentar „EXPLAINER-VIDEO · DEFINIERTER PLATZ"): den `<div class="videoframe">…</div>` durch das Embed ersetzen — `<video controls poster …>` oder HeyGen-Share-`<iframe>` (16:9). Skript/Szenen siehe `heygen/`.

### P1 — Deployment
Statisch hinter 2FA ausliefern (z. B. unter `zgpm.aegira.ai/explainer`), `noindex` beibehalten. Assets relativ — nur Ordner hochladen.

## 4. Definition of Done
Alle 14 Screens sauber (kein Login-Overlay) · HeyGen-Embed im Slot · Skip-Button führt zur App · `noindex` aktiv · Brand-Gold (kein Orange) durchgängig · Lighthouse-A11y ≥ 95 · Seite öffnet ohne Konsolenfehler.

## 5. Verweise
`README.md` (Slot-Tabelle), `heygen/heygen_storyboard.md` (Szene↔Screen), `gap_analyse/TESTSTRATEGIE_v0.9.5_…` (App-Teststrategie), `gap_analyse/HANDOVER_Claude-Code_v0.9_Umsetzung_…` (App-Release v0.9).

*exmachinAI · AEGIRA AI Trust Platform — Evidence-based AI Trust.*
