import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J5 — RACI-Ansicht der Verantwortlichkeits-Matrix.
 *
 * Hinweis (echter Stand): Ab v0.9.3 ist die Matrix bewusst RACI-only — der frühere
 * PVM/RACI-Umschalter wurde entfernt (PVM bleibt nur intern in der Rules-Engine).
 * Es gibt daher KEINEN sichtbaren Toggle mehr. Dieser Spec prüft entsprechend, dass
 * die RACI-Ansicht (Codes + Legende) korrekt rendert; falls künftig wieder ein
 * Toggle existiert (`data-testid="raci-toggle"`), wird zusätzlich das Umschalten geprüft.
 */

test("J5 — RACI-Matrix rendert RACI-Codes und Legende", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;

  await page.getByRole("button", { name: /Verantwortlichkeiten \(RACI\)/ }).click();
  const matrix = page.getByTestId("raci-matrix");
  await expect(matrix).toBeVisible();

  // Legende führt die RACI-Codes auf.
  const legend = page.getByTestId("raci-legend");
  await expect(legend).toContainText("Responsible");
  await expect(legend).toContainText("Accountable");
  await expect(legend).toContainText("Consulted");
  await expect(legend).toContainText("Informed");

  // Optionaler Toggle (falls re-eingeführt).
  const toggle = page.getByTestId("raci-toggle");
  if (await toggle.count()) {
    await toggle.click();
    await expect(matrix).toBeVisible();
  } else {
    test.info().annotations.push({
      type: "info",
      description: "Kein RACI/PVM-Toggle vorhanden — Matrix ist seit v0.9.3 RACI-only (by design).",
    });
  }
});
