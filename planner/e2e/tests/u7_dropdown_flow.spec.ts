import { request, APIRequestContext } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { gotoUnderstanding } from "../fixtures/nav";

/**
 * U7 — Dropdown-/Fragefluss-Logik im Verständnis-Schritt:
 *  - Subtyp ist erst nach Wahl der Projektart wählbar (kein Dead-End).
 *  - Subtyp-Optionen wechseln je nach IT/Non-IT.
 *
 * Hinweis (echter Stand): Die Zielplattform-Auswahl wird in der aktuellen UI für
 * IT UND Non-IT angezeigt (nicht nur IT) — als UX-Befund dokumentiert.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

async function freshProject(ctx: APIRequestContext): Promise<string> {
  // Titel ≥3 Zeichen (API-Mindestlänge), sonst 422 → kein pid.
  const res = await ctx.post(`/v1/projects`, { data: { title: "U7 Flow", description: "x" } });
  return (await res.json()).id as string;
}

test("U7 — Subtyp erst nach Projektart wählbar", async ({ page }) => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000" });
  const pid = await freshProject(ctx);
  await ctx.dispose();

  if (!(await gotoUnderstanding(page, pid))) return;
  const subtype = page.getByTestId("project-subtype");
  await expect(subtype).toBeDisabled();
  await expect(subtype).toContainText("erst Projektart wählen");

  await page.getByTestId("project-type-it").check();
  await expect(subtype).toBeEnabled();
});

test("U7 — Subtyp-Optionen unterscheiden sich für IT vs. Non-IT", async ({ page }) => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000" });
  const pid = await freshProject(ctx);
  await ctx.dispose();

  if (!(await gotoUnderstanding(page, pid))) return;
  await page.getByTestId("project-type-it").check();
  const itOpts = await page.getByTestId("project-subtype").locator("option").allInnerTexts();
  expect(itOpts.join("\n")).toMatch(/Softwareentwicklung|AI\/ML/);

  await page.getByTestId("project-type-non-it").check();
  const nonItOpts = await page.getByTestId("project-subtype").locator("option").allInnerTexts();
  expect(nonItOpts.join("\n")).toMatch(/Konzept|Compliance|Prozessdesign/);
  await expect(page.getByTestId("project-subtype")).toHaveValue("");
});

test("U7 — kein Dead-End: nach vollständiger Wahl ist Gate 1 freigebbar", async ({ page }) => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000" });
  const pid = await freshProject(ctx);
  await ctx.dispose();

  if (!(await gotoUnderstanding(page, pid))) return;
  await page.getByTestId("project-type-it").check();
  await page.getByTestId("aegira-internal-no").check();
  await expect(page.getByTestId("gate1-submit")).toBeEnabled();
});
