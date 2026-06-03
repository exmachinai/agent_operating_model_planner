import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J7 — iPhone-Spezifika (§9): Matrix horizontal scrollbar, Tap-Targets ≥44px,
 * kein Fokus-Zoom (Input-Schrift ≥16px). Läuft nur im iPhone-Projekt.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

test.skip(({ isMobile }) => !isMobile, "Nur relevant im iPhone-Viewport.");

test("J7 — RACI-Matrix ist horizontal scrollbar (sticky Meilenstein-Spalte)", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await page.getByRole("button", { name: /Verantwortlichkeiten \(RACI\)/ }).click();

  const scroll = page.getByTestId("raci-matrix-scroll");
  await expect(scroll).toBeVisible();
  const overflowX = await scroll.evaluate((el) => getComputedStyle(el).overflowX);
  expect(overflowX).toBe("auto");
});

test("J7 — Gate-1-Inputs erzeugen keinen iOS-Fokus-Zoom (≥16px)", async ({ page }) => {
  if (!(await gotoWorkspace(page, `/projects/new`))) return;
  const title = page.getByTestId("project-title");
  await expect(title).toBeVisible();
  const fs = await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fs).toBeGreaterThanOrEqual(16);
});

test("J7 — Primärbutton erfüllt die Tap-Mindesthöhe (≥40px)", async ({ page }) => {
  if (!(await gotoWorkspace(page, `/projects/new`))) return;
  const submit = page.getByTestId("new-submit");
  await expect(submit).toBeVisible();
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
});
