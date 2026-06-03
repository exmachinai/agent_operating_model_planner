import { test, expect } from "../../fixtures/auth";
import { seedProject } from "../../fixtures/seed";
import { gotoWorkspace } from "../../fixtures/nav";

/**
 * Visual-Regression (§10) — Baselines für /plan, /harness, /review.
 *
 * Baselines erzeugen: `... npx playwright test tests/a11y/visual.spec.ts --update-snapshots`.
 * Bewusst nur bei interaktivem Frontend (sonst würde der Lockscreen die Baseline
 * verfälschen) — daher die Precondition-Gate; bei Lock/CORS wird sauber geskippt.
 *
 * `maxDiffPixelRatio` toleriert geringfügige Sub-Pixel-/Font-Rendering-Unterschiede.
 */

test("Visual — /plan", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await expect(page.getByTestId("risk-ampel")).toBeVisible();
  await expect(page).toHaveScreenshot("plan.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
});

test("Visual — /review", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/review`))) return;
  await expect(page.getByRole("heading", { name: /Review & Freigabe/ })).toBeVisible();
  await expect(page).toHaveScreenshot("review.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
});

test("Visual — /harness (kompiliert)", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();
  await expect(page).toHaveScreenshot("harness.png", { fullPage: true, maxDiffPixelRatio: 0.02 });
});
