import { test, expect } from "../fixtures/auth";

/**
 * Flow MFA → Explainer → Planner. (MFA = Auth-Lock, durch die Fixture geöffnet.)
 * - Erstnutzer (ohne „gesehen"-Marke) werden von der Home auf das Explainer-
 *   Onboarding umgeleitet.
 * - „Weiter zum Planner" führt in den Planner und merkt die Marke.
 */

test("MFA → Explainer: Erstnutzer landet auf dem Explainer-Onboarding", async ({ page, context }) => {
  // Die Auth-Fixture setzt die „gesehen"-Marke; hier für den Erstnutzer-Fall entfernen.
  await context.addInitScript(() => {
    try { window.sessionStorage.removeItem("aegira.explainer.seen"); } catch {}
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/explainer$/);
  await expect(page.getByTestId("explainer-frame")).toBeVisible();
  // iframe-Inhalt muss laden (Framing erlaubt, kein X-Frame-Options/CSP-Block).
  await expect(
    page.frameLocator('[data-testid="explainer-frame"]').locator("h1").first(),
  ).toBeVisible({ timeout: 10000 });
});

test("Explainer → Planner: Weiter-Button führt in den Planner", async ({ page }) => {
  await page.goto("/explainer");
  await expect(page.getByTestId("explainer")).toBeVisible();
  await page.getByTestId("explainer-continue").click();
  await expect(page).not.toHaveURL(/explainer/);
  await expect(page.getByTestId("new-project")).toBeVisible();
});
