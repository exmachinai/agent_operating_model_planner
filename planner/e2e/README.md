# Playwright-E2E (Teststrategie §9/§10, P1)

Isoliertes E2E-Paket — **eigene** `package.json`, daher **kein** Einfluss auf den
Frontend-Build (`npm ci` des Apps bleibt unberührt).

## Ausführen
```bash
cd planner/e2e
npm install
npm run install:browsers          # Chromium + WebKit
# App + API müssen laufen (lokal oder Staging):
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
E2E_API_BASE_URL=http://localhost:8000 \
  npm test
```
Gegen Prod-Smoke: `PLAYWRIGHT_BASE_URL=https://zgpm.aegira.ai E2E_API_BASE_URL=https://api.zgpm.aegira.ai npm test -- t0_parity`.

## Vorhanden (lauffähig)
- `tests/t0_parity.spec.ts` — **T0**: /health-Version, App-Root 200, Frontend-Healthpfad (Desktop + iPhone).
- `tests/smoke.spec.ts` — App lädt ohne kritische JS-Fehler.
- `fixtures/seed.ts` — seedet Projekte über das Backend bis Gate 1/2 (deterministische Journeys).

## Backlog (zu implementieren — Selektoren am realen UI wiren)
Funktionsjourneys (§9):
- **J1** Verständnis → Gate 1 (Pflichtfelder, 422 als verständlicher Hinweis, kein roher Stacktrace)
- **J2** Plan + Matrix → Gate 2 (RACI-Legende sichtbar)
- **J3** Harness → revise → Gate 3 → Download (`shasum -c` grün)
- **J4** rote Ampel hält (stop-on-red)
- **J5** RACI-Toggle · **J6** Skill-Trust-Tier → HITL-Gate
- **J7** iPhone: Matrix scrollbar, sticky Spalte, Bottom-Bar über Safe-Area, kein Fokus-Zoom, Tap ≥44px

Persona/UX (§9, U1–U7):
- **U1** Hilfe je Schritt · **U2** Fachbegriffe erklärt · **U3** Fehler handlungsfähig
- **U4** Sprach-/Konsistenz-Lint (kein sichtbares „ZGPM" → „Planung") · **U5** Diagramm-Lesbarkeit
- **U6** Interview-Tiefe & Vollständigkeit · **U7** Dropdown-/Fragefluss-Logik

A11y/Visual (§10):
- `@axe-core/playwright` → 0 critical/serious auf `/plan`,`/harness`,`/review`
- `toHaveScreenshot()` Visual-Regression · Lighthouse-A11y ≥95 (mobile)

> Hinweis: Die Journey-/Persona-Specs brauchen stabile Selektoren (`data-testid`)
> im Frontend. Empfehlung: `data-testid` an Gate-Buttons, Matrix, Hilfe-Panel,
> Dropdowns ergänzen, dann die obigen Specs aus dem Seed-Helper aufbauen.
