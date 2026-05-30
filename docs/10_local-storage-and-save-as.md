# 10 · Lokale Ordnerstruktur als Datenquelle + „Speichern unter" für den Harness

Spec für zwei eng verwandte Funktionen, die die App vom Dropbox-Pfad lösen und
dem Nutzer **lokale Ordnerarbeit ohne Cloud** ermöglichen. Methodentreue: ZGPM
(Schritt 2a Eingabe, Schritt 9 Export) plus MECE-Trennung von Lesen/Schreiben.

## Forcing-Frage: Browser-Sandbox

Die App ist eine **Web-App** (Next.js, ausgeliefert über `zgpm.aegira.ai`). „Lokal
lesen/schreiben" unterliegt der Browser-Sandbox. Wir nutzen zwei Mechanismen mit
unterschiedlicher Browser-Abdeckung — und sagen das dem Nutzer **in der UI**:

| Fähigkeit | Mechanismus | Chrome/Edge | Firefox/Safari |
|---|---|---|---|
| Lokalen Ordner **einlesen** | `<input webkitdirectory>` | ✓ | ✓ |
| Zip **„Speichern unter…"** (Ort/Name wählen) | `showSaveFilePicker` | ✓ | Fallback: Standard-Download |
| **Entpackt** in Ordner schreiben (Unterordner anlegen) | `showDirectoryPicker` | ✓ | Fallback: Zip-Download |

**Leitsatz:** Das **Einlesen** lokaler Ordner ist überall verfügbar (kein
Chromium-Zwang). Das **freie Speichern** (Ort/Name/neuer Ordner/entpackt) nutzt
die File System Access API und ist damit Chrome/Edge-only; sonst greift ein
ehrlicher Download-Fallback. Die UI zeigt diesen Unterschied aktiv an.

## Feature A — Lokale Ordnerstruktur als Datenquelle (Lesen + Schreiben)

Ergänzt die bestehenden Eingaben (Einzeldatei-Upload, Dropbox) um eine
gleichwertige Option **„Lokaler Ordner"**. Damit hat der Nutzer zwei
ordnerbasierte Quellen: **1) Dropbox · 2) lokale Ordnerstruktur**.

- **Lesen (Eingabe, Schritt 2a):** Button „+ Lokalen Ordner" öffnet einen
  Verzeichnis-Dialog (`webkitdirectory`). Alle **unterstützten** Dateien
  (.docx · .md · .pdf · .txt · .pptx · .xlsx) werden — wie beim Upload — über
  `POST /context` ephemer eingelesen; nicht unterstützte werden still
  übersprungen, die 20-Dokumente-Grenze gilt. Kein neuer Backend-Pfad nötig:
  derselbe ephemere Verarbeitungspfad, nur der Nachweis (Name + Hash) bleibt.
- **Schreiben (Ausgabe):** Der lokale Ordner ist zugleich **Ziel** für den
  Harness-Export (Feature B, entpackt). Damit ist „lesen + schreiben" erfüllt.

## Feature B — „Speichern unter" für den Agentenharness

Auf der Harness-Seite (nach Gate 3) ersetzt ein **„Speichern unter…"**-Block den
reinen Download-Link (der als Fallback erhalten bleibt). Der Nutzer wählt
**vorher**:

- **Gepackt (.zip):** lädt die signierte Zip (`GET /harness/download`) und
  speichert sie via `showSaveFilePicker` an frei gewähltem Ort/Namen (im Dialog
  lässt sich ein neuer Ordner anlegen). Fallback: Standard-Download.
- **Entpackt (gesamte Struktur):** holt die Datei-Map (`GET /harness/files`),
  öffnet via `showDirectoryPicker` ein Zielverzeichnis, legt darin einen
  **benennbaren neuen Ordner** an (Default = Harness-Slug) und schreibt die
  komplette Baumstruktur (inkl. `checksums.txt`). Fallback (FF/Safari):
  Zip-Download mit Hinweis, dass manuell zu entpacken ist.

### Backend: `GET /v1/projects/{id}/harness/files`

Liefert die **entpackte** Repräsentation derselben Artefakte wie die Zip:

```json
{ "root": "<slug>", "zip_name": "<slug>.harness.zip",
  "zip_sha256": "sha256:…",
  "files": [ { "path": "CLAUDE.md", "content": "…" }, … ] }
```

Bit-Parität zur Zip ist garantiert: Zip und Files teilen sich `build_file_map()`
im Compiler (gleiche Dateien inkl. `checksums.txt`, gleiche Hashes). Der
`shasum -c checksums.txt`-Check gilt für den entpackten Ordner identisch.

## Nicht-Ziele

- Kein serverseitiges Schreiben ins lokale Dateisystem des Nutzers (geht im Web
  prinzipiell nicht; nur clientseitig via File System Access API).
- Keine Persistenz von Dateiinhalten auf dem Server (Ephemeralität bleibt).
- Kein OAuth/Cloud-Ausbau hier — Dropbox bleibt wie in `09_process-flow.md`.
