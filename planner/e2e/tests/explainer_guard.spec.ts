import { test, expect } from "@playwright/test";
import { promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * Explainer-Guard (Brand/Content): der in die App integrierte Explainer
 * (`public/explainer/index.html`) muss zur aktuellen Wahrheit passen — Brand-Gold
 * statt Orange, keine 100%-Claims, kein „DACH", korrekte ZGPM-Definition,
 * noindex, keine erfundenen Produktnamen. FS-Scan (laufzeitunabhängig).
 */

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const EXPLAINER = path.join(FRONTEND_ROOT, "public/explainer/index.html");

const FORBIDDEN_PRODUCTS = ["AI Sentinel", "AI Defender", "AI Protector", "AI Captain"];
const HUNDRED = /(zu\s*100\s*%|100\s*%\s*(sicher|garantiert|abgedeckt|getestet)|vollständig sicher|garantiert sicher)/i;

test("Explainer — Brand/Content-Guards erfüllt", async () => {
  const html = await fs.readFile(EXPLAINER, "utf8");

  expect(/#E8703A/i.test(html), "verbotenes Orange #E8703A im Explainer").toBe(false);
  expect(/\bDACH\b/.test(html), "'DACH' im Explainer (Rechtsräume DE/EU27-Rest/UK/CH)").toBe(false);
  expect(HUNDRED.test(html), "100%-/Garantie-Claim im Explainer").toBe(false);
  expect(/noindex/i.test(html), "noindex fehlt (interner Explainer)").toBe(true);
  expect(
    /Zielgeführtes Generatives Projekt Management/i.test(html),
    "korrekte ZGPM-Definition fehlt",
  ).toBe(true);
  for (const bad of FORBIDDEN_PRODUCTS) {
    expect(html.includes(bad), `erfundener Produktname: ${bad}`).toBe(false);
  }

  // HeyGen-Video integriert: <video> referenziert die gebündelte MP4, und die Datei existiert.
  expect(/<video[\s>]/i.test(html), "kein <video>-Element im Explainer").toBe(true);
  expect(html.includes("assets/video/zgpm-explainer.mp4"), "Video-Quelle nicht referenziert").toBe(true);
  const video = path.join(FRONTEND_ROOT, "public/explainer/assets/video/zgpm-explainer.mp4");
  const stat = await fs.stat(video).catch(() => null);
  expect(stat && stat.size > 100_000, "Video-Datei fehlt oder zu klein").toBeTruthy();
});
