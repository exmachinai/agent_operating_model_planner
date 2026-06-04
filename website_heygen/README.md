# zgpm.aegira.ai — Interner Explainer & HeyGen-Paket

Interner Explainer (hinter 2FA, `noindex`) + HeyGen-Story. Thema: **Zielgeführtes Generatives Projekt Management** —
methodisch konsistente Agenten-Harnesse planen und umsetzen: **Planung → Prototyp → Product**.
Brand: Navy `#1E2761` · **Gold `#E6B32F`** · Vellum `#FCFAF6` · Ice `#CADCFC` · Bricolage Grotesque / Inter. Kein Impressum/Datenschutz (intern).

## Struktur
```
website_heygen/
├── index.html                          # Explainer (Hero → Video-Slot → 3 P → Journey 0–13 → User-Guide-Reader)
├── HANDOVER_Claude-Code.md             # Übergabe an Claude Code
├── assets/
│   ├── logo/        # AEGIRA-Lockups (navy/white/transparent) + Slogan-Lockup + Signet-SVG
│   ├── video/       # Slot für HeyGen-Video (README.txt) — Embed siehe index.html #explainer
│   ├── screenshots/ # 14 Schritte, durchnummeriert 0–13 (s. u.) + archiv/ (Detail-Crops)
│   └── userguide/   # AEGIRA_Planner_User_Guide.pptx + .pdf + slides/slide-01..29.png (brand-gold)
└── heygen/  produkt_teaser_minianleitung.md · heygen_skript.md · heygen_storyboard.md · heygen_scene_sheet.csv
```

## Screenshots — Storyline 0–13 (alle echt & sauber)
Die Journey-Schritte und das HeyGen-Storyboard referenzieren exakt diese Dateinamen in `assets/screenshots/`:

| Schritt | Datei | Inhalt |
|---|---|---|
| 0 | `00_projektuebersicht.png` | Projektübersicht (Dashboard) |
| 1 | `01_beschreiben.png` | Schritt 1 · Projekt beschreiben |
| 2 | `02_interview.png` | Schritt 2 · Schärfungs-Interview |
| 3 | `03_verstaendnis.png` | Schritt 3 · Verständnis & Klassifizierung (Gate 1) |
| 4 | `04_leitplanken.png` | Schritt 5 · Leitplanken |
| 5 | `05_meilensteine.png` | Schritt 6A · Meilensteine festlegen |
| 6 | `06_plan.png` | Schritt 6 · Plan (Meilensteine/RACI/Risiko) |
| 7 | `07_gantt_raci.png` | Plan · Gantt & RACI |
| 8 | `08_heatmap_token.png` | Plan · Risiko-Heatmap & Token-Budget |
| 9 | `09_review.png` | Schritt 7 · Review & Freigabe (Gate 2) |
| 10 | `10-1_harness.png` | Schritt 8 · Agent-Harness (Reifegrad & Flow) |
| 10 | `10-2_harness_agenten.png` | Schritt 8 · Agentenkarten, Skills & HITL-Punkte |
| 11 | `11_agenten_flow.png` | Interaktiver Agenten-Flow (Canvas) |
| 12 | `12_export.png` | Export · „Als PDF speichern" (Gate 3) |
| 13 | `13_ausdruck.png` | Ausdruck · Druck/PDF-Report |

Austausch: gleichen Dateinamen behalten → Explainer **und** HeyGen-Story ziehen automatisch nach.
Nicht genutzte Detail-Crops liegen benannt in `assets/screenshots/archiv/`.

## HeyGen nutzen
1. 16:9-Video, deutsche Stimme. 2. **Skript** aus `heygen/heygen_skript.md`. 3. Pro Szene den im `heygen_scene_sheet.csv` / `heygen_storyboard.md` genannten Screenshot setzen (selektive Story). 4. Phasen-Bauchbinden „Planung/Prototyp/Product" + DE-Untertitel.

## Explainer
`index.html` ist self-contained (Google Fonts online, Assets relativ). Intern hinter 2FA deployen (`noindex`).
Interaktiver Clickflow: Side-Rail-Scrollspy, Fortschrittsbalken, Prev/Next, Pfeiltasten ←/→, Screenshot-Lightbox, „Überspringen → App".
**HeyGen-Video** am definierten Slot einbetten (Abschnitt `#explainer`, Code-Kommentar „EXPLAINER-VIDEO · DEFINIERTER PLATZ").
