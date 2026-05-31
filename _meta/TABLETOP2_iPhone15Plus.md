# Tabletop-Test #2 — iPhone 15 Plus (430×932), v0.5 Mobile/UX

Stand: Etappe-2-Code fertig (tsc 0, 30 pytest grün). Lokaler Lauf:
- Backend: `planner/api/.venv` → `uvicorn app.main:app :8000` (in-memory).
- Frontend: nach `$HOME/aomp-tabletop/planner` rsynct (Dropbox-SWC-Regel), `next dev :3000`,
  `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`.
- Browser: Playwright, Viewport 430×932 (iPhone 15 Plus).

## Verifiziert
- Beide Server 200 (root + /health). Startseite lädt im iPhone-Viewport.
- Screenshots in diesem Ordner: `tabletop2_*.png`.

## Befunde
(wird beim Durchlauf ergänzt)

## Server stoppen
`lsof -ti :3000 | xargs kill; lsof -ti :8000 | xargs kill`
## ⚠️ Befund (korrigiert) — CORS-Origin localhost vs 127.0.0.1
Die echte CORS-Konfiguration steht INLINE in `app/main.py` (allow_origins:
zgpm.aegira.ai, docs.aegira.ai, +localhost:3000 in nicht-prod). `app/cors.py`
existiert, wird aber NIRGENDS importiert (`apply_cors` ist toter Code) — es war
nie aktiv und nie die Ursache.

Ursache des Browser-Blocks im Test: Playwright lief auf `http://127.0.0.1:3000`,
erlaubt ist aber `http://localhost:3000`. → KEIN Produktbug (Prod-Origin
zgpm.aegira.ai ist erlaubt). Fix für den Test: Frontend über `localhost:3000`
aufrufen. Optional fürs lokale Dev: in main.py 127.0.0.1:3000 zur Liste ergänzen.

(Hinweis: `app/cors.py` wurde zwischenzeitlich von kaputtem Platzhalter zu validem
Code umgeschrieben — bleibt toter Code, schadet nicht; kann entfernt werden.)

## Durchlauf iPhone-15-Plus-Viewport (430×932)
- Über localhost:3000: Home, /plan/milestones, /plan/activities, /plan, /harness.
- Screenshots tabletop2_*.png in diesem Ordner. Projekt: prj_00a37f7593db.

## ERGEBNIS (430×932, alle Seiten)
Automatisierte Messung pro Seite (scrollWidth vs. 430px Viewport):
| Seite | pageOverflow | apiErr | Bemerkung |
|---|---|---|---|
| Home | nein | nein | ok |
| /plan/milestones (6a) | nein | nein | Karten + Drag-Griff + ▲▼-Pfeile + Datum, sauber |
| /plan/activities (6b) | nein | nein | ok |
| /plan (6c) | **nein (gefixt)** | nein | siehe Fix unten |
| /harness (8) | nein | nein | ok |
| /understanding (3) | nein | nein | Radios 44px, ok |

### Gefixter Befund: Plan-Seite Quer-Overflow (587→430)
Die breite **PVM-Matrix** (888px) zog die ganze Seite auf scrollWidth 587.
Fix in `app/styles/tokens.css`: `.aegira-shell { overflow-x: clip }` (Seite scrollt
nicht mehr quer; innere `.aegira-scroll-x`-Regionen scrollen weiter eigenständig)
+ `.aegira-scroll-x { max-width: 100% }`. Nach Next-Neustart verifiziert:
`htmlSW=430, bodySW=430, mainOverflowX=clip, pageOverflow=false`.
(Stale-CSS-Falle: Next-dev HMR hatte die globale CSS-Änderung nicht übernommen →
`.next` löschen + neu starten war nötig, um den Fix zu sehen.)

### Touch-Targets
Buttons messen 40px (ui.tsx base minHeight:40). Die geplante 44px-Erhöhung war im
$HOME-Build nicht wirksam (Quelle zeigt weiter 40) — **TODO: prüfen warum die
ui.tsx-44px-Änderung nicht in der Quelle steht** (evtl. von Linter/Reconcile
zurückgesetzt). Nicht blockierend, aber für „maximales Touch-Erlebnis" nachziehen.

## FAZIT
Plan-Wizard (6a/6b/6c) + Harness sind auf iPhone 15 Plus bedienbar und ohne
Quer-Overflow. Ein echter Layout-Bug (Plan-Overflow) wurde gefunden & gefixt.
Offen/nachzuziehen: Button-44px in ui.tsx (s.o.).
