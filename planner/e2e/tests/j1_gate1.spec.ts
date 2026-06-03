import { request } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoUnderstanding } from "../fixtures/nav";

/**
 * J1 — Verständnis ausfüllen → Gate 1.
 * Pflichtfeld fehlt → verständlicher Fehler (kein roher 422/Stacktrace sichtbar).
 *
 * Browserabhängig: bei aktivem Auth-Lock oder CORS-Block wird sauber geskippt
 * (siehe fixtures/preconditions.ts) statt flaky zu scheitern.
 */

async function freshProject(): Promise<string> {
  const ctx = await request.newContext({
    baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000",
  });
  const res = await ctx.post("/v1/projects", {
    data: { title: "J1 Gate1", description: "Playwright" },
  });
  const pid = (await res.json()).id as string;
  await ctx.dispose();
  return pid;
}

test("J1 — Verständnis ausfüllen und Gate 1 freigeben", async ({ page }) => {
  const pid = await freshProject();
  if (!(await gotoUnderstanding(page, pid))) return;

  // Subtyp-Dropdown ist anfangs gesperrt (erst Typ wählen) — Dropdown-Fluss.
  await expect(page.getByTestId("project-subtype")).toBeDisabled();

  await page.getByTestId("project-type-it").check();
  await expect(page.getByTestId("project-subtype")).toBeEnabled();
  await page.getByTestId("aegira-internal-no").check();

  await page.getByTestId("gate1-submit").click();
  await expect(page.getByTestId("gate1-banner")).toBeVisible();
});

test("J1 — fehlende Pflichtangaben blockieren freundlich (kein roher 422)", async ({ page }) => {
  const pid = await freshProject();
  if (!(await gotoUnderstanding(page, pid))) return;

  // Ohne Projektart + AEGIRA-intern ist die Gate-1-Aktion deaktiviert (geführter
  // Fehler statt Server-422). Der Button trägt einen erklärenden title.
  const submit = page.getByTestId("gate1-submit");
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("title", /Projektart|AEGIRA/);

  // Es darf kein roher Stacktrace / 422-JSON auf der Seite stehen.
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("traceback");
  expect(body).not.toContain("422 unprocessable");
  expect(body).not.toMatch(/\{\s*"detail"/);
});

test("J1 — Gate 1 friert das Verständnis ein (Felder gesperrt)", async ({ page }) => {
  const pid = await seedProject(); // bis Gate 1
  if (!(await gotoUnderstanding(page, pid))) return;
  await expect(page.getByTestId("gate1-banner")).toBeVisible();
  // Nach Gate 1 ist die Plattform-Auswahl gesperrt (append-only).
  await expect(page.getByTestId("target-platform")).toBeDisabled();
  await expect(page.getByTestId("understanding-next")).toBeVisible();
});
