import { Page } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * U4 — Sprach-/Konsistenz-Lint: KEIN sichtbares „ZGPM" in der UI.
 * Läuft auf /, /understanding, /plan, /harness, /review — Desktop UND Mobile.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

async function assertNoZgpm(page: Page) {
  const visible = await page.locator("body").innerText();
  expect(visible).not.toMatch(/zgpm/i);
  const help = page.getByTestId("help-button");
  if (await help.count()) {
    await help.first().click();
    const drawer = page.getByTestId("help-drawer");
    if (await drawer.count()) {
      expect(await drawer.innerText()).not.toMatch(/zgpm/i);
      await page.keyboard.press("Escape");
    }
  }
}

test("U4 — Übersicht ohne ZGPM", async ({ page }) => {
  if (!(await gotoWorkspace(page, "/"))) return;
  await assertNoZgpm(page);
});

test("U4 — Verständnis ohne ZGPM", async ({ page }) => {
  const pid = await seedProject();
  if (!(await gotoWorkspace(page, `/projects/${pid}/understanding`))) return;
  await assertNoZgpm(page);
});

// HINWEIS (Reconcile): Der frühere Reviewer-Befund-Code `zgpm.konform` ließ den
// internen Methodenbegriff „ZGPM" roh in der Plan-/Review-UI erscheinen (U4-Bruch).
// Quelle ist im Backend bereits auf `plan.konform` umbenannt
// (api/app/planning/zgpm_composer.py:450). Diese Specs erwarten daher den
// korrigierten Zustand (kein sichtbares „ZGPM"); sie laufen grün gegen eine API,
// die diesen Stand serviert.
test("U4 — Plan ohne ZGPM", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await assertNoZgpm(page);
});

test("U4 — Review ohne ZGPM", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/review`))) return;
  await assertNoZgpm(page);
});

test("U4 — Harness ohne ZGPM", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;
  await assertNoZgpm(page);
});
