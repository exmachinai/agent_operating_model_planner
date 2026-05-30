/**
 * Lokales Speichern des Agentenharness — gepackt (.zip) oder entpackt (Ordner).
 *
 * Voll unterstützt in **Chrome/Edge** über die File System Access API
 * (`showSaveFilePicker` / `showDirectoryPicker`): freie Ort-/Namenswahl, neuen
 * Ordner anlegen, ganze Baumstruktur schreiben. **Firefox/Safari** kennen die API
 * (noch) nicht → ehrlicher Standard-Download als Fallback. Beides erfordert einen
 * Secure Context (https / localhost) und eine User-Geste (Button-Klick).
 *
 * Spec: docs/10_local-storage-and-save-as.md.
 */

import type { HarnessFile } from "./api";

export type SaveResult = "saved" | "downloaded" | "unsupported" | "cancelled";

// Minimal-Typen der File System Access API (nicht in allen lib.dom-Versionen).
interface WritableLike {
  write: (data: BlobPart) => Promise<void>;
  close: () => Promise<void>;
}
interface FileHandleLike {
  createWritable: () => Promise<WritableLike>;
}
interface DirHandleLike {
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirHandleLike>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandleLike>;
}
interface PickerWindow {
  showSaveFilePicker?: (opts?: unknown) => Promise<FileHandleLike>;
  showDirectoryPicker?: (opts?: unknown) => Promise<DirHandleLike>;
}

function picker(): PickerWindow {
  return typeof window !== "undefined" ? (window as unknown as PickerWindow) : {};
}

export function supportsSaveFilePicker(): boolean {
  return typeof picker().showSaveFilePicker === "function";
}
export function supportsDirectoryPicker(): boolean {
  return typeof picker().showDirectoryPicker === "function";
}
/** Volles „Speichern unter" (Ort/Name/Ordner anlegen) verfügbar? (Chrome/Edge) */
export function supportsFsAccess(): boolean {
  return supportsSaveFilePicker() && supportsDirectoryPicker();
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Gepackt speichern: Picker (Ort/Name, neuer Ordner) oder Download-Fallback. */
export async function saveZip(blob: Blob, suggestedName: string): Promise<SaveResult> {
  const w = picker();
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: "Harness-Zip", accept: { "application/zip": [".zip"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
      // sonst: auf Standard-Download zurückfallen
    }
  }
  triggerDownload(blob, suggestedName);
  return "downloaded";
}

/**
 * Entpackt speichern: wählt ein Zielverzeichnis, legt darin einen (benennbaren)
 * neuen Ordner an und schreibt die komplette Baumstruktur inkl. Unterordner.
 * Nur Chrome/Edge — sonst `"unsupported"` (Aufrufer fällt auf Zip-Download zurück).
 */
export async function saveUnzipped(
  root: string,
  files: HarnessFile[],
  newFolderName?: string,
): Promise<SaveResult> {
  const w = picker();
  if (typeof w.showDirectoryPicker !== "function") return "unsupported";
  let dir: DirHandleLike;
  try {
    dir = await w.showDirectoryPicker({ mode: "readwrite" });
  } catch (e) {
    if (isAbort(e)) return "cancelled";
    throw e;
  }
  // Benennbarer neuer Ordner im gewählten Verzeichnis (Default = Harness-Slug).
  const folder = (newFolderName?.trim() || root).replace(/[\\/]+/g, "-");
  const base = await dir.getDirectoryHandle(folder, { create: true });
  for (const f of files) {
    const segments = f.path.split("/");
    const name = segments.pop();
    if (!name) continue;
    let cur = base;
    for (const seg of segments) {
      if (!seg) continue;
      cur = await cur.getDirectoryHandle(seg, { create: true });
    }
    const fh = await cur.getFileHandle(name, { create: true });
    const writable = await fh.createWritable();
    await writable.write(f.content);
    await writable.close();
  }
  return "saved";
}
