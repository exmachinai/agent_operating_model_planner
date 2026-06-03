import { Page } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * U1 — Hilfe je Schritt vorhanden & nicht leer.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

async function assertHelpHasContent(page: Page) {
  const btn = page.getByTestId("help-button");
  await expect(btn).toBeVisible();
  await btn.click();
  const drawer = page.getByTestId("help-drawer");
  await expect(drawer).toBeVisible();
  const summary = await page.getByTestId("help-summary").innerText();
  const body = await page.getByTestId("help-body").innerText();
  expect(summary.trim().length).toBeGreaterThan(20);
  expect(body.trim().length).toBeGreaterThan(80);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
}

test("U1 — Hilfe auf der Übersicht", async ({ page }) => {
  if (!(await gotoWorkspace(page, "/"))) return;
  await assertHelpHasContent(page);
});

test("U1 — Hilfe im Verständnis-Schritt", async ({ page }) => {
  const pid = await seedProject();
  if (!(await gotoWorkspace(page, `/projects/${pid}/understanding`))) return;
  await assertHelpHasContent(page);
});

test("U1 — Hilfe im Plan-Schritt", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await assertHelpHasContent(page);
});

test("U1 — Hilfe im Harness-Schritt", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;
  await assertHelpHasContent(page);
});
