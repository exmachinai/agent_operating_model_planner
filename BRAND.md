# AEGIRA Brand · Style Guide

> **Authoritative für alle Artefakte** dieses Repos und der Planner App.
> Konsolidiert aus dem AEGIRA-Logo-Set-README (26.04.2026 Edition) und dem Moodboard „Meridian Aegis · Sovereignty Edition" (24.05.2026).

---

## 1. Markenpositionierung

AEGIRA ist **Trust-Infrastructure für KI**. Visuelle Sprache: **sovereign, archival, governance-grade** — nicht Silicon-Valley-Tech-Startup. Bezugspunkte sind Bundesbank, Bundesverfassungsgericht, Pantheon, klassischer Aktenstempel. Nicht Notion, nicht Linear, nicht Vercel.

Drei Adjektive, die jedes UI-Detail bestehen muss:

1. **Sovereign** — formal, ruhig, klar autoritativ.
2. **Inscribed** — wie eingraviert, dauerhaft, prüfbar.
3. **Aegis** — Schutz, Hülle, Garant.

---

## 2. Farbpalette (kanonisch)

| Token | Hex | RGB | Pantone (Print) | Verwendung |
|---|---|---|---|---|
| `--c-navy` | `#1E2761` | 30 · 39 · 97 | **2767 C** | **Primärfarbe.** Logo, Headlines, Brand-Statements |
| `--c-navy-dark` | `#0B143E` | 11 · 20 · 62 | — | Footer, tiefer Kontrast, Dark-Mode-Hintergrund |
| `--c-gold` | `#E6B32F` | 230 · 179 · 47 | — | **Akzent, < 10 % Flächenanteil.** Attestations-Marker, Approval-CTA, Sovereign-Seal |
| `--c-white` | `#FFFFFF` | 255 · 255 · 255 | — | Hintergrund, Inverse Text |
| `--c-vellum` | `#FCFAF6` | 252 · 250 · 246 | — | **Default Light-Mode-Hintergrund.** Warmer Off-White, Print-Anmutung |
| `--c-ice` | `#CADCFC` | 202 · 220 · 252 | — | Subtle Supportflächen, Disabled-States |

### Sekundäre Status-Farben (UI-Pflicht — siehe `docs/05_ux-ui-best-practices.md`)

| Token | Hex | Verwendung |
|---|---|---|
| `--c-green` | `#5A9367` | Risiko grün, PASS-States |
| `--c-amber` | `#E8A33A` | Risiko gelb (verwandt mit Gold, aber nie als CTA) |
| `--c-red` | `#C3423F` | Risiko rot, HARD_FAIL |
| `--c-ink` | `#0E1735` | Primärtext (knapp dunkler als Navy) |
| `--c-steel` | `#5B6B85` | Sekundärtext |
| `--c-gray` | `#8A93A6` | Caption, Meta |

### Farbregeln

- **Gold-Quota:** max 10 % der sichtbaren Fläche. Sonst verliert das Akzent seine Signalwirkung.
- **Navy + Vellum** ist die Default-Kombination im Light-Mode. **Navy-Dark + Vellum** ist die Default-Kombination im Dark-Mode (wenig „echtes Schwarz").
- **Niemals** AEGIRA-Logo auf Foto-Hintergründen, Mustern oder fremden Farben.
- **Keine eigenen Akzent-Farben** außerhalb dieser Palette (z.B. Coral, Cyan, Magenta) — schwächt Sovereign-Anspruch.

---

## 3. Typografie

### 3.1 Schriftfamilien

| Rolle | Schrift | Lizenz | Quelle |
|---|---|---|---|
| **Wortmarke** (eingebettet in SVG) | **Bricolage Grotesque Bold**, Letterspacing 0.03 em | OFL-1.1 | Google Fonts |
| **Display / Editorial-Headlines** | **Bricolage Grotesque** (Regular / Semibold / Bold) | OFL-1.1 | Google Fonts |
| **Body / UI** | **Inter** (400 / 500 / 600 / 700) | OFL-1.1 | Google Fonts |
| **Mono / Code / IDs / YAML** | **JetBrains Mono** (400 / 500 / 700) | OFL-1.1 | Google Fonts |

### 3.2 Hinweis zum Bricolage-Wechsel

Bis 01.05.2026 verwendete die Wortmarke **Jura Medium**. Seit 01.05.2026 ist **Bricolage Grotesque Bold** kanonisch. Alle alten Assets sind im Archiv. Niemals Jura in neuen Artefakten verwenden — schwächt die monumentale, governance-taugliche Anmutung.

### 3.3 Größen-Skala (UI)

| Element | Size / Line / Weight |
|---|---|
| `h1` Page-Title | 30 / 38 / 700 |
| `h2` Section-Header | 22 / 30 / 600 |
| `h3` Card-Title | 16 / 22 / 600 |
| Body | 14 / 20 / 400 |
| Caption | 12 / 18 / 400 |
| Mono | 13 / 20 / 400 |

Editorial-Display (für Cover-Slides, Whitepaper, Hero-Sektionen): **48–72 / 1.05 / 700**, Bricolage Grotesque Bold, Letterspacing −0.01 em.

---

## 4. Logo-Verwendung

### 4.1 Varianten

Drei Hauptformate, alle im AEGIRA-Logo-Set:

- **Horizontal Lockup** — Signet + AEGIRA-Wortmarke, primäre Variante.
- **Signet-only** — nur das Symbol (für Favicon, Plugin-Icon, Avatar, kleine Größen).
- **Wortmarke-only** — nur „AEGIRA"-Schriftzug, selten verwendet (z.B. Whitepaper-Header).

### 4.2 Farb-Kombinationen

| Kombination | Wann |
|---|---|
| **Navy auf Vellum / Weiß** (Default) | helle Hintergründe |
| **Weiß auf Navy** | Navy-Flächen, dunkle Hero-Sektionen, Lock-Screen |
| **Schwarz auf Weiß / Weiß auf Schwarz** | Mono-Kontexte (Fax, Stempel, S/W-Druck) |
| **Gold-Signet** | nur als Attestation-Mark / Award / Trust-Seal |

### 4.3 Mindestgrößen

- Horizontales Lockup: **Druck ≥ 30 mm Breite**, **Web ≥ 160 px Breite**.
- Signet allein: **Druck ≥ 8 mm**, **Web ≥ 24 px**.
- Unter dieser Schwelle: Lockup nicht verwenden, stattdessen Signet allein.

### 4.4 Clear-Space

**Mindest-Schutzraum: 0.5 × Signet-Höhe** auf allen Seiten. Nichts darf näher heranragen.

### 4.5 Was verboten ist

- Logo verzerren, drehen, kursivieren, einrahmen.
- Eigene Effekte (Shadow, Glow, Outline, Gradient) hinzufügen.
- Wortmarke und Signet einzeln neu kombinieren.
- Slogan direkt unter das Lockup integrieren.
- Logo auf hochgesättigten Fotos, Mustern, fremden Farben.

---

## 5. Tonalität

### 5.1 Stimme

- **Faktisch, präzise, gemessen.** Nicht hip, nicht zwinkernd, nicht über-höflich.
- **Du-Form auf Deutsch.** Distance-Halten nur in Legal-/Compliance-Sprache.
- **Keine 100%-Garantien** — Constitution-Pflicht. Schreib „nachweisbar audit-ready", nicht „garantiert audit-konform".
- **Keine Buzzwords** ohne Substanz. „Trust-Infrastructure" ist erlaubt, „AI-Powered" verboten.
- **Keine „DACH".** Rechtsräume heißen DE / EU27-Rest / UK / CH.

### 5.2 Beispiele

| Schwach | Stark |
|---|---|
| „Verwalte deine KI mit Vertrauen!" | „Evidence-based AI Trust — nachweisbar, audit-ready." |
| „AI-driven Governance Platform" | „Trust-Infrastructure für regulierte KI." |
| „Volle DACH-Abdeckung" | „Rechtsräume DE · EU27 · UK · CH." |
| „100 % Compliance garantiert" | „Aus auditierbaren Evidence-Spuren — Compliance folgt." |

---

## 6. Visuelles Vokabular

Aus dem Moodboard **„Meridian Aegis · Sovereignty Edition"**:

| Element | Bedeutung |
|---|---|
| **Stempel/Siegel-Metapher** | „EVIDENCE · INSCRIPTION · TRUST" als Stempel-Inschrift. Verwende für Attestation-Marker, Audit-Stamps, GA-Release-Marker. |
| **Graph-/Netzwerk-Topologie** | „Aegis Network" — sparsam eingesetzte Knoten-Kanten-Visualisierung in Navy auf Vellum. Pflicht für Architecture-Diagramme. |
| **Tabellarische Bordüren** | Editorial Hairline-Borders um Sections (1 px Navy auf Vellum). Stilbruch zu Modal-Schatten — wir nutzen Hairlines, keine Box-Shadows. |
| **Drei Produktkacheln** Navigator / Guardian / Commander | Pflicht-Farb-Codes: Navigator = Gold-Akzent, Guardian = Navy-Hintergrund, Commander = Navy-Dark / Vellum-Text. |
| **EU-Stamp-Marker** „EU AI ACT Coverage" | Stamp-Pattern für Coverage-Indicators in der UI. |
| **Karten-/Meridian-Metapher** | Schwache Hintergrund-Linien (Map-Grid) auf Hero-Sektionen, max 6 % Opacity Navy. |

---

## 7. Anwendung in Artefakten dieses Repos

| Artefakt | Brand-Anwendung |
|---|---|
| **`README.md`** | Banner-PNG aus `_assets/logos/social/og-image-1200x630-light.png` |
| **Planner-App Top-Nav** | Lockup links, Workspace-Switcher daneben |
| **Planner-App Lock-Screen** | Signet-only auf Navy-Dark-Hintergrund, Subtle Map-Grid 6 % Opacity |
| **Planner-App Favicon** | aus `_assets/logos/favicons/` |
| **Cowork-Plugin-Icon** | `aegira-signet-navy.svg` aus `_assets/logos/svg/` |
| **PPTX** | Title-Slide mit Lockup auf Navy-Dark; Body-Slides mit Vellum-Hintergrund + Gold-Akzent in Action-Headers |
| **Whitepaper / Docs-Cover** | Editorial-Layout nach Moodboard-Vorlage |
| **Harness-Zip-Banner** (im README) | Signet links + kurze Tagline |

---

## 8. CSS-Token-File (Drop-in)

Für die Planner App, in `app/styles/tokens.css`:

```css
:root {
  /* Brand */
  --c-navy: #1E2761;
  --c-navy-dark: #0B143E;
  --c-gold: #E6B32F;
  --c-white: #FFFFFF;
  --c-vellum: #FCFAF6;
  --c-ice: #CADCFC;

  /* UI semantics */
  --c-ink: #0E1735;
  --c-steel: #5B6B85;
  --c-gray: #8A93A6;
  --c-green: #5A9367;
  --c-amber: #E8A33A;
  --c-red: #C3423F;

  /* Surfaces */
  --c-bg: var(--c-vellum);
  --c-surface: var(--c-white);
  --c-accent: var(--c-gold);
  --c-primary: var(--c-navy);

  /* Typography */
  --font-display: 'Bricolage Grotesque', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;

  /* Radius — Sovereign-Look: kleine Radien, keine Pillen außer Status-Badges */
  --r-sm: 2px;
  --r-md: 4px;
  --r-lg: 8px;
  --r-pill: 9999px;

  /* Spacing — 8-pt Grid */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;
  --sp-16: 64px;
  --sp-24: 96px;
}

[data-theme="dark"] {
  --c-bg: var(--c-navy-dark);
  --c-surface: var(--c-navy);
  --c-ink: var(--c-vellum);
  --c-steel: #BAC2D4;
  --c-gray: #8A93A6;
}
```

---

## 9. Anti-Patterns

| # | Anti-Pattern | Warum |
|---|---|---|
| BP-A1 | Coral, Cyan, Magenta als Akzent | außerhalb der Sovereign-Palette |
| BP-A2 | Box-Shadows als Default-Stil | wir nutzen Hairlines (Editorial-Look) |
| BP-A3 | Glassmorphism / Frosted-Glass | passt nicht zu archival |
| BP-A4 | Logo mit Drop-Shadow | Verstoß §4.5 |
| BP-A5 | Bricolage in Body-Text | Bricolage ist Display, Inter ist Body |
| BP-A6 | „AI"-Buzzwords im UI | siehe §5 |
| BP-A7 | „DACH" als Region-Bezeichner | Constitution-Verstoß |
| BP-A8 | „100 % … garantiert" | Constitution-Verstoß |
| BP-A9 | Gold-Fläche > 10 % | schwächt Signal |
| BP-A10 | Bild auf Bild (Foto unter Logo) | siehe §4.5 |

---

## 10. Asset-Liste in diesem Repo

In `_assets/`:

- `logos/svg/` — Signet (5 Varianten) + Lockup (6 Varianten)
- `logos/png/` — 256/512/1024 px Renderings
- `logos/favicons/` — Favicon-Set incl. Apple-Touch, Android-Chrome, Maskable
- `logos/social/` — Open-Graph + Twitter-Card + LinkedIn (light + dark)
- `moodboard/moodboard.pdf` und `.png` — Original-Referenz
- `AEGIRA_Logo_Set_README.md` — Original-Brand-README für Audit-Trail

Quelle der Originale: `…/AEGIRA_Brand_Moodboard_Logos/current/Logoset` und `…/Moodboard/`.

---

## 11. Versions-Notiz

- Schema-Version dieses Dokuments: **1.0** (28.05.2026).
- Kanonische Brand-Edition: **26·04·2026** (Logo-Set), **Bricolage-Update 01·05·2026**, **Moodboard-Sovereignty-Edition 24·05·2026**.
- Änderungen an Markenfarben / Schriften erfordern Brand-Owner-Approval bei exmachinAI.
