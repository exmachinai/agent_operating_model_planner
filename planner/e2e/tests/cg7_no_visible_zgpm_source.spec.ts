import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * CG7 — Content-Guard (Quelltext): in planner/app, planner/components, planner/lib
 * darf „ZGPM" nicht als SICHTBARER Text vorkommen (ergänzend zu U4 zur Laufzeit).
 *
 * Ausgenommen sind reine Doku-Querverweise in Kommentaren (z. B. der Dateiname
 * `docs/01_zgpm-method.md`): Das ist eine legitime methodische Spec-Referenz im
 * Code-Kommentar, kein in der UI gerenderter Begriff. Der Guard schlägt also nur
 * an, wenn „ZGPM" außerhalb solcher Doku-Pfad-Referenzen auftaucht.
 */

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["app", "components", "lib"];
const SCAN_EXT = new Set([".ts", ".tsx", ".css"]);

async function walk(dir: string): Promise<string[]> {
  let out: string[] = [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      out = out.concat(await walk(full));
    } else if (SCAN_EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Doku-Pfad-Referenz wie `docs/01_zgpm-method.md` ist erlaubt. */
function stripAllowedDocRefs(line: string): string {
  return line.replace(/docs\/[\w./-]*zgpm[\w./-]*/gi, "");
}

test("CG7 — kein sichtbares ZGPM im Frontend-Quelltext", async () => {
  const offenders: string[] = [];
  for (const d of SCAN_DIRS) {
    const files = await walk(path.join(FRONTEND_ROOT, d));
    for (const f of files) {
      const content = await fs.readFile(f, "utf8");
      content.split("\n").forEach((line, i) => {
        if (/zgpm/i.test(stripAllowedDocRefs(line))) {
          offenders.push(`${path.relative(FRONTEND_ROOT, f)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
  expect(offenders, `Unerlaubte ZGPM-Vorkommen:\n${offenders.join("\n")}`).toHaveLength(0);
});
