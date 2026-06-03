import { Page, expect } from "@playwright/test";
import { ensureInteractive } from "./preconditions";

/**
 * UI-Navigationshelfer für die Journeys. Halten die Specs lesbar und web-first
 * (keine harten Timeouts); jede Aktion wartet auf den Ziel-Selektor.
 *
 * Jeder Helfer prüft zuerst die Laufzeit-Vorbedingungen (CORS/Lock) und überspringt
 * den Test sauber, wenn das Frontend in dieser Umgebung nicht interaktiv ist.
 */

/** Navigiert zu einer Projekt-URL und prüft, ob der Arbeitsbereich interaktiv ist. */
export async function gotoWorkspace(page: Page, url: string): Promise<boolean> {
  await page.goto(url);
  return ensureInteractive(page);
}

/** Öffnet die Verständnis-Seite eines Projekts und wartet, bis sie interaktiv ist. */
export async function gotoUnderstanding(page: Page, pid: string): Promise<boolean> {
  const ok = await gotoWorkspace(page, `/projects/${pid}/understanding`);
  if (ok) await expect(page.getByTestId("project-type-it")).toBeVisible();
  return ok;
}

/** Füllt die Verständnis-Pflichtfelder (IT-Projekt, extern) und gibt Gate 1 frei. */
export async function fillAndApproveGate1(page: Page, pid: string): Promise<boolean> {
  const ok = await gotoUnderstanding(page, pid);
  if (!ok) return false;
  await page.getByTestId("project-type-it").check();
  await page.getByTestId("aegira-internal-no").check();
  await page.getByTestId("gate1-submit").click();
  await expect(page.getByTestId("gate1-banner")).toBeVisible();
  return true;
}
