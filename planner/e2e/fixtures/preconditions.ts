import { Page, expect } from "@playwright/test";

/**
 * Laufzeit-Vorbedingungen für die browserbasierten Journeys/Personas.
 *
 * Diese Suite testet das LIVE laufende Frontend (aktueller Code, Port 3001) gegen
 * die laufende API (Port 8001).
 *
 * Historisch verhinderten zwei umgebungsbedingte Tore das Rendering der
 * Arbeitsbereiche — beide sind jetzt aufgelöst:
 *
 *  1. CORS: Die API erlaubt die App-Origin (PLAYWRIGHT_BASE_URL) — verifiziert.
 *  2. Auth-Lock (TOTP-2FA-Lockscreen): wird durch die Auth-Fixture
 *     (`fixtures/auth.ts`) geöffnet, die ein echtes Session-Token VOR den
 *     App-Skripten in sessionStorage injiziert.
 *
 * `ensureInteractive` wartet daher darauf, dass der Lockscreen verschwindet (das
 * Token wird beim Mount serverseitig geprüft). Bleibt der Lock bestehen, ist das
 * ein echter Fehler (Fixture/Token/CORS kaputt) — kein stiller Skip mehr.
 */

/** Prüft, ob der Browser die API erreichen kann (CORS ok). */
export async function apiReachableFromBrowser(page: Page): Promise<boolean> {
  const apiBase = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
  // Im Seitenkontext fetchen — so greift dieselbe CORS-Policy wie für die App.
  try {
    return await page.evaluate(async (base) => {
      try {
        const r = await fetch(`${base}/health`, { mode: "cors" });
        return r.ok;
      } catch {
        return false;
      }
    }, apiBase);
  } catch {
    return false;
  }
}

/** Lockscreen-Locator (role=dialog „Anmelden/Registrieren/Zwei-Faktor"). */
export function lockDialog(page: Page) {
  return page.getByRole("dialog", { name: /Anmeld|Zwei-Faktor|Registrieren/i });
}

/**
 * Stellt sicher, dass der Arbeitsbereich interaktiv ist: wartet, bis der von der
 * Auth-Fixture geöffnete Lockscreen verschwunden ist. Gibt true zurück (für die
 * bestehende `if (!(await ...)) return;`-Struktur der Specs), schlägt aber hart
 * fehl, wenn der Lock bestehen bleibt — denn Lock+CORS sind nun gelöst.
 */
export async function ensureInteractive(page: Page): Promise<boolean> {
  await page.waitForLoadState("domcontentloaded");
  // Der Mount-Effekt prüft das Token serverseitig und entsperrt dann.
  await expect(
    lockDialog(page),
    "Lockscreen weiterhin aktiv — Auth-Fixture/Token/CORS prüfen.",
  ).toHaveCount(0);
  return true;
}
