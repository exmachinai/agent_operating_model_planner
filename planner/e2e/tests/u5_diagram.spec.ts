import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * U5 — Diagramm-Lesbarkeit (Teststrategie §9): der Agenten-Flow darf KEINE
 * abgeschnittene Stage/Spalte zeigen. Regression-Guard für den fit-to-width-Fix
 * in components/AgentFlow.tsx (vorher: feste scale=1.7 → letzte Stage clippte im
 * Modal). Prüft die vergrößerte Ansicht: der scrollbare Bereich hat keinen
 * horizontalen Overflow (ganzer Graph sichtbar) und alle STAGE-Spalten sind da.
 */

test("U5 — vergrößerter Flow zeigt alle Stages ohne horizontalen Overflow", async ({ page }) => {
  const pid = await seedProject({ toGate: 3 }); // kompilierter Harness → Flow vorhanden
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  // Flow-Panel da → vergrößern.
  const enlarge = page.getByRole("button", { name: "Flow vergrößern" });
  await expect(enlarge).toBeVisible();
  await enlarge.click();

  const dialog = page.getByRole("dialog", { name: /Flow-Ansicht/ });
  await expect(dialog).toBeVisible();

  // Der scrollbare Diagramm-Bereich darf NICHT horizontal überlaufen (= nichts
  // abgeschnitten). fit-to-width: scrollWidth ≈ clientWidth.
  const region = dialog.locator('[role="group"]');
  await expect(region).toBeVisible();
  const overflow = await region.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );
  expect(overflow, "horizontaler Overflow im vergrößerten Flow (Stage abgeschnitten)").toBeLessThanOrEqual(2);

  // Das Diagramm-SVG ist sichtbar und füllt die Breite.
  const svg = dialog.locator('svg[aria-label="Agenten-Flow-Diagramm"]');
  await expect(svg).toBeVisible();

  // Mindestens zwei STAGE-Spalten (Orchestrator → … → HITL) sind gerendert.
  const stageTexts = dialog.locator("svg >> text", { hasText: /^STAGE \d+$/ });
  expect(await stageTexts.count()).toBeGreaterThanOrEqual(2);
});
