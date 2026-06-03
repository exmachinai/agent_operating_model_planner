# zgpm.aegira.ai — Interner Explainer & HeyGen-Paket

Interner Explainer (hinter 2FA) + HeyGen-Story. Thema: **Zielgeführtes Generatives Projekt Management** —
methodisch konsistente Agenten-Harnesse planen und umsetzen: **Planung → Prototyp → Product**.
Kein Impressum/Datenschutz (rein intern). Brand: Navy #1E2761 · Gold #E6B32F · Vellum #FCFAF6 · Bricolage/Inter.

## Inhalt
```
website_heygen/
├── index.html                         # Interner Explainer (End-to-End-Journey, alle 14 Screens)
├── assets/
│   ├── logo/  aegira_zgpm_lockup_*     # Logo + Slogan (kleinschreibung) + offizielle Lockups
│   ├── screenshots/                    # 14 Dashboard-Slots (s. u.)
│   └── userguide/                      # User-Guide-Reader: .pptx + .pdf + slides/slide-01..29.png
└── heygen/
    ├── produkt_teaser_minianleitung.md # End-to-End-Minianleitung (Quelle/Onepager)
    ├── heygen_skript.md                # Voiceover je Szene (~2:30 min)
    ├── heygen_storyboard.md            # Szene → Screen-Zuordnung (selektiv)
    └── heygen_scene_sheet.csv          # strukturiertes Scene-Sheet (Import/Anlage)
```

## ⚠️ Screenshots einsetzen (wichtig)
Die hochgeladenen Screenshots konnten **nicht automatisch** als Dateien gespeichert werden (sie lagen nur im Chat).
Daher sind 11 Slots als **beschriftete Platzhalter** angelegt; 3 sind bereits echte Aufnahmen.
**Speichere jeden hochgeladenen Screenshot unter exakt diesem Dateinamen** in `assets/screenshots/` (überschreibt den Platzhalter):

| Datei | Dashboard | Status |
|---|---|---|
| `01_projekte.png` | Projektübersicht (Dashboard) | ⬜ Platzhalter |
| `02_beschreiben.png` | Schritt 1 · Projekt beschreiben | ⬜ Platzhalter |
| `03_interview.png` | Schritt 2 · Schärfungs-Interview | ⬜ Platzhalter |
| `04_verstaendnis.png` | Schritt 3 · Verständnis & Klassifizierung | ⬜ Platzhalter |
| `05_leitplanken.png` | Schritt 5 · Leitplanken | ⬜ Platzhalter |
| `06_meilensteine.png` | Schritt 6A · Meilensteine festlegen | ⬜ Platzhalter |
| `07_plan.png` | Schritt 6 · Plan (Meilensteine/Risiko) | ✅ echt |
| `08_plan_gantt_raci.png` | Plan · Gantt & RACI | ⬜ Platzhalter |
| `09_plan_heatmap_token.png` | Plan · Risiko-Heatmap & Token-Budget | ⬜ Platzhalter |
| `10_review.png` | Schritt 7 · Review & Freigabe (Gate 2) | ⬜ Platzhalter |
| `11_harness.png` | Schritt 8 · Agent-Harness (Reifegrad/Flow) | ✅ echt |
| `12_agenten_flow.png` | Interaktiver Agenten-Flow (Canvas, Vollbild) | ⬜ Platzhalter |
| `13_export.png` | Export · „Speichern unter" (Gate 3) | ⬜ Platzhalter |
| `14_ausdruck.png` | Ausdruck · Druck/PDF | ✅ echt |

Sobald die Bilder unter diesen Namen liegen, zeigen Explainer **und** HeyGen-Story automatisch die richtigen Screens —
keine weiteren Änderungen nötig.

## HeyGen nutzen
1. 16:9-Video, deutsche Stimme (ruhig, sachlich).
2. **Skript** aus `heygen/heygen_skript.md` einfügen.
3. Pro Szene den im `heygen_scene_sheet.csv` / `heygen_storyboard.md` genannten **Screenshot** als Bild/Hintergrund setzen (selektive Story).
4. Phasen-Bauchbinden „Planung / Prototyp / Product" + DE-Untertitel.

## Explainer
`index.html` ist self-contained (Google Fonts online, Assets relativ). Intern hinter 2FA deployen
(`noindex` gesetzt). Zeigt die vollständige End-to-End-Journey mit jedem Dashboard an seiner Story-Stelle.
