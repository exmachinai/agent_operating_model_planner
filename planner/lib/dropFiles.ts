/**
 * Dateien — inklusive ganzer Ordnerbäume — aus einem Drag&Drop- oder Paste-
 * Ereignis extrahieren, **ohne** einen System-Dateiauswahl-Dialog zu öffnen.
 *
 * Hintergrund: Manche Unternehmens-/MDM-Richtlinien deaktivieren in Chrome alle
 * Dateiauswahl-Dialoge (`AllowFileSelectionDialogs=Disabled`). Dann öffnet weder
 * `<input type="file">` noch die File System Access API einen Dialog — der Upload
 * über die Buttons wirkt „tot". Drag&Drop und Einfügen (Strg/Cmd+V) lösen keinen
 * Dialog aus und funktionieren auch unter dieser Richtlinie. Dies ist der robuste
 * Fallback-Pfad. Spec: docs/10_local-storage-and-save-as.md.
 */

// Minimal-Typen der (nicht standardisierten) Entry-API von `webkitGetAsEntry()`.
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (cb: (f: File) => void, err?: (e: unknown) => void) => void;
  createReader?: () => FsDirReader;
}
interface FsDirReader {
  readEntries: (cb: (entries: FsEntry[]) => void, err?: (e: unknown) => void) => void;
}

function entryToFile(entry: FsEntry): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof entry.file !== "function") return resolve(null);
    entry.file(
      (f) => resolve(f),
      () => resolve(null),
    );
  });
}

/** `readEntries` liefert Verzeichnisse in Batches — bis zur leeren Antwort lesen. */
function readAllEntries(reader: FsDirReader): Promise<FsEntry[]> {
  const out: FsEntry[] = [];
  return new Promise((resolve) => {
    const step = (): void =>
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) return resolve(out);
          out.push(...batch);
          step();
        },
        () => resolve(out),
      );
    step();
  });
}

async function walk(entry: FsEntry, acc: File[]): Promise<void> {
  if (entry.isFile) {
    const f = await entryToFile(entry);
    if (f) acc.push(f);
  } else if (entry.isDirectory && typeof entry.createReader === "function") {
    const entries = await readAllEntries(entry.createReader());
    for (const child of entries) await walk(child, acc);
  }
}

/**
 * Liefert alle abgelegten Dateien (Ordner rekursiv aufgelöst). Nutzt die Entry-
 * API, wo verfügbar (Ordner-Support), sonst die flache `DataTransfer.files`-Liste.
 */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  // Entries müssen SYNCHRON eingesammelt werden — die DataTransferItemList wird
  // nach Rückkehr des Event-Handlers entleert.
  const roots: FsEntry[] = [];
  const items = dt.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const getAsEntry = (it as unknown as {
        webkitGetAsEntry?: () => FsEntry | null;
      }).webkitGetAsEntry;
      const entry = typeof getAsEntry === "function" ? getAsEntry.call(it) : null;
      if (entry) roots.push(entry);
    }
  }
  if (roots.length > 0) {
    const acc: File[] = [];
    for (const entry of roots) await walk(entry, acc);
    return acc;
  }
  return dt.files ? Array.from(dt.files) : [];
}

/** Dateien aus einem Paste-Ereignis (Bilder/Dateien aus der Zwischenablage). */
export function filesFromClipboard(cd: DataTransfer): File[] {
  if (cd.files && cd.files.length > 0) return Array.from(cd.files);
  const out: File[] = [];
  const items = cd.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "file") continue;
      const f = it.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}
