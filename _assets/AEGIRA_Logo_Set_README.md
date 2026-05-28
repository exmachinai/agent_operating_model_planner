## Wortmarker · Schrift-Update vom 2026-05-01

Der AEGIRA-Wortmarker wurde von **Jura-Medium** (geometric sans, leichter Strich)
auf **Bricolage Grotesque Bold** umgestellt, um die monumentale, governance-
taugliche Anmutung der ursprünglichen Master-Datei `aegira-logo-horizontal-lockup.png`
in allen Varianten (SVG, PNG-Set, Social) konsistent abzubilden.

Spezifikation:
- Schrift: Bricolage Grotesque Bold (Google Fonts · OFL-1.1 · siehe `BricolageGrotesque-OFL.txt`)
- Letterspacing: 0.03 em
- Cap-Height (Wortmarker) : Inked-Height (Signet) ≈ 0.78
- Gap Signet → Wortmarker: 90 vb-units (~7.5 % der Lockup-Breite)
- Vertikale Position: optisches Mid des Inked-Signets

Davon nicht betroffen (Signet-only Files unverändert):
- `02_signet_only/*` (alle Varianten)
- `03_favicons/*` (Favicons enthalten kein Wortmark)

Vorgängerversion archiviert unter Plate-01-Preview-Datum, originale Files
über Dropbox-Versionshistorie wiederherstellbar.

---

# AEGIRA — Logo Set

**Edition:** 26·04·2026 · **Lockup-Variante:** horizontal (Signet + AEGIRA, ohne Slogan)

Dieses Set enthält das gesamte AEGIRA-Markenkit für Web, Print, App-Stores und Social. Alle Vektor-Dateien sind voll selbsttragend — die AEGIRA-Wortmarke wurde aus *Jura Medium* in echte SVG-Pfade konvertiert, das Signet wurde aus dem Original-PNG-Master via potrace zu einem sauberen Bezier-Pfad vektorisiert. Es muss keine Schrift installiert sein, damit die SVGs überall identisch rendern.

---

## Verzeichnisbaum

```
AEGIRA_Logo_Set/
├── 01_horizontal_lockup/
│   ├── svg/                  Vektor: 6 Farb-Varianten
│   ├── png_on_white/         Navy auf Weiß       · 256/512/1024/2048/3072 px
│   ├── png_on_navy/          Weiß auf Navy       · 256/512/1024/2048/3072 px
│   └── png_transparent/      Navy/Weiß/Schwarz transparent · 5 Größen × 3 Farben
├── 02_signet_only/
│   ├── svg/                  Vektor: 5 Farb-Varianten
│   ├── png_on_white/         Navy auf Weiß       · 128/256/512/1024/2048 px
│   ├── png_on_navy/          Weiß auf Navy       · 128/256/512/1024/2048 px
│   └── png_transparent/      Navy/Weiß/Schwarz transparent · 5 Größen × 3 Farben
├── 03_favicons/
│   ├── favicon-{16,32,48,64,96,128}.png
│   ├── favicon.svg           Skalierender Modern-Browser-Favicon
│   ├── favicon.ico           Multi-Resolution für Legacy-Browser (16/32/48/64)
│   ├── apple-touch-icon-180.png
│   ├── android-chrome-{192,512}.png
│   ├── android-chrome-maskable-512.png
│   ├── site.webmanifest
│   └── head-snippet.html     Drop-in HTML-Snippet für `<head>`
├── 04_social_open_graph/
│   ├── og-image-1200x630-light.png       Facebook/Open Graph hell
│   ├── og-image-1200x630-dark.png        Facebook/Open Graph dunkel
│   ├── twitter-card-1200x600-light.png   Twitter Summary Large Image
│   ├── twitter-card-1200x600-dark.png    Twitter Summary Large Image
│   └── linkedin-1200x627-light.png       LinkedIn Share-Bild
└── README.md
```

---

## Markenfarben

| Rolle        | Hex       | RGB           | Verwendung |
|--------------|-----------|---------------|------------|
| **NAVY**     | `#1E2761` | 30 · 39 · 97  | Primär · Logo · Headlines |
| NAVY DARK    | `#0B143E` | 11 · 20 · 62  | Tiefer Kontrast · Footer |
| GOLD         | `#E6B32F` | 230 · 179 · 47| Akzent < 10 % · Attestations-Marker |
| WHITE        | `#FFFFFF` | 255 · 255 · 255| Hintergrund · Inverse |
| VELLUM       | `#FCFAF6` | 252 · 250 · 246| Warmer Off-White für Print-Anmutung |

PMS-Approximation für Druck: **Pantone 2767 C** (NAVY).

---

## Verwendungsregeln

### Clear-Space
Mindest-Schutzraum um das Logo: **0.5 × Signet-Höhe** auf allen Seiten. Nichts darf näher heranragen.

### Mindestgrößen
- Horizontales Lockup: **Druck ≥ 30 mm Breite**, **Web ≥ 160 px Breite**.
- Signet allein: **Druck ≥ 8 mm**, **Web ≥ 24 px**.
- Unter dieser Schwelle das Lockup nicht verwenden — stattdessen das Signet allein.

### Hintergründe
- **Navy auf Weiß** (Default) — auf allen hellen, ruhigen Hintergründen.
- **Weiß auf Navy** — auf NAVY (`#1E2761`) oder NAVY DARK Flächen.
- **Schwarz** (Mono) — nur in Schwarz-Weiß-Kontexten (Fax, Stempel, Press-Releases ohne Farbe).
- **Niemals** Logo auf hochgesättigten Fotos, Mustern oder farbigen Flächen, die nicht zu NAVY-Familie gehören. Bei Bedarf ein einfarbiges Backplate setzen.

### Was nicht erlaubt ist
- Logo verzerren, drehen, kursivieren oder einrahmen.
- Eigene Effekte (Shadow, Glow, Outline, Gradient) hinzufügen.
- Wortmarke und Signet einzeln neu kombinieren.
- Slogan unter das Lockup setzen — die hier gelieferte Variante ist *bewusst* slogan-frei. Wo eine Tagline gewünscht ist, gehört „AI · GOVERNANCE · TRUST" als separater typografischer Anker mit Abstand unter das Logo, nicht als Teil der Marke.

---

## Web-Integration

Drop-in HTML für `<head>` (siehe auch `03_favicons/head-snippet.html`):

```html
<link rel="icon" type="image/png" sizes="32x32"  href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16"  href="/favicon-16.png">
<link rel="icon" type="image/svg+xml"            href="/favicon.svg">
<link rel="shortcut icon"                        href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180"     href="/apple-touch-icon-180.png">
<link rel="manifest"                             href="/site.webmanifest">
<meta name="theme-color" content="#1E2761">

<!-- Open Graph -->
<meta property="og:image" content="https://aegira.ai/og-image-1200x630-light.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://aegira.ai/twitter-card-1200x600-light.png">
```

---

## Technische Notizen

- **Signet:** Aus dem 1024-px-PNG-Master (`aegira-logo-navy-1024x1024.png`) via potrace zu einem einzigen `<path>` mit `fill-rule="evenodd"` vektorisiert. Native Trace-Auflösung: 714 × 501. Kein Detail-Verlust gegenüber dem Master.
- **Wortmarke:** Aus *Jura Medium* (Letterspacing 0.16 em) in `<path>`-Glyphen konvertiert. Die ursprüngliche `aegira-logo-navy-vector.svg` aus dem Web-Asset-Pack wurde **nicht** verwendet — sie war eine simplifizierte Approximation und entsprach nicht dem PNG-Master.
- **Lockup-Proportionen:** Signet-Höhe `H`, Wortmarke-Cap-Höhe `0.59 H`, Gap `0.32 H`, optische Y-Korrektur +8 px (folgt OneTrust- und Credo-AI-Lockup-Logik).
- **Maskable-Icon:** Größerer Safe-Zone-Padding (22 %), invertierte Farben (Weiß auf Navy) für Android-Adaptive-Icons-Kompatibilität.
- **PNGs:** Mit cairosvg gerendert, optimiert.

---

## Dateinamen-Konvention

- Lockups: `aegira-lockup-{variant}.{ext}` bzw. mit Größe: `aegira-lockup-{variant}-{size}.png`
- Signets: `aegira-signet-{variant}.{ext}`
- Variants: `navy`, `navy_on_white`, `white`, `white_on_navy`, `black`, `black_on_white`

---

**Lizenz / Eigentum:** AEGIRA Wortmarke und Signet sind geschützte Marken der Octopus Innovations GmbH & Co. KG. Verwendung außerhalb autorisierter AEGIRA-Kommunikation nur mit schriftlicher Genehmigung.

**Kontakt:** Michael · `exmachinai.ai@gmail.com`
