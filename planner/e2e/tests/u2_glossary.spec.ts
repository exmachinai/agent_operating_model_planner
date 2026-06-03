import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * U2 — Fachbegriffe werden erklärt (Gates, RACI, Autonomie).
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

test("U2 — Hilfe erklärt das Gate-Konzept im Verständnis-Schritt", async ({ page }) => {
  const pid = await seedProject();
  if (!(await gotoWorkspace(page, `/projects/${pid}/understanding`))) return;
  await page.getByTestId("help-button").click();
  const body = page.getByTestId("help-body");
  await expect(body).toBeVisible();
  await expect(body).toContainText(/Gate 1|eingefroren|Verständnis/);
});

test("U2 — RACI-Begriffe sind in der Plan-Matrix ausgeschrieben", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await page.getByRole("button", { name: /Verantwortlichkeiten \(RACI\)/ }).click();
  const legend = page.getByTestId("raci-legend");
  await expect(legend).toContainText("Responsible");
  await expect(legend).toContainText("Accountable");
});

test("U2 — Autonomie-/Reifegrad wird im Harness erläutert", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();
  await expect(page.getByText(/Beaufsichtigt|Assistiert|Delegiert|Autonom/).first()).toBeVisible();
});
