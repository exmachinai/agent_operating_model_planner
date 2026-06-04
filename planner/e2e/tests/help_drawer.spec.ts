import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";

/**
 * Hilfe-Drawer (Leitfaden-UX): öffnet, zeigt Inhalt und die beiden prominenten
 * Aktionen — Back-to-Explainer + „Gesamten Leitfaden öffnen". Der Explainer-Link
 * navigiert wirklich zum Explainer.
 */
test("Hilfe-Drawer: Inhalt + prominente Buttons (Explainer-Back + Leitfaden)", async ({ page }) => {
  const pid = await seedProject({ toGate: 1 });
  await page.goto(`/projects/${pid}/guardrails`);

  await page.getByTestId("help-button").click();
  await expect(page.getByTestId("help-drawer")).toBeVisible();
  await expect(page.getByTestId("help-summary")).toBeVisible();
  await expect(page.getByTestId("help-body")).toBeVisible();

  const explainer = page.getByTestId("help-explainer-link");
  const guide = page.getByTestId("help-guide-link");
  await expect(explainer).toBeVisible();
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute("href", "/guide");

  // Back-to-Explainer funktioniert.
  await explainer.click();
  await expect(page).toHaveURL(/\/explainer$/);
});
