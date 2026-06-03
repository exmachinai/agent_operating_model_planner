import { request } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J2 — Plan + Matrix sichtbar (RACI-Legende), → Gate 2.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

async function apiCtx() {
  return request.newContext({
    baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000",
  });
}

test("J2 — Plan zeigt Risiko-Ampel und RACI-Matrix mit Legende", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;

  await expect(page.getByRole("heading", { name: /^Plan · v/ })).toBeVisible();
  await expect(page.getByTestId("risk-ampel")).toBeVisible();

  // RACI-Accordion aufklappen, Matrix + Legende prüfen.
  await page.getByRole("button", { name: /Verantwortlichkeiten \(RACI\)/ }).click();
  await expect(page.getByTestId("raci-matrix")).toBeVisible();
  const legend = page.getByTestId("raci-legend");
  await expect(legend).toBeVisible();
  await expect(legend).toContainText("Accountable");
});

test("J2 — Review-Flow gibt den Plan frei (Gate 2, echter Klick)", async ({ page }) => {
  const ctx = await apiCtx();
  // Bis kurz vor Gate 2 vorbereiten (Plan erzeugt, Meilensteine bestätigt),
  // damit der Gate-2-Klick selbst über die UI läuft.
  const create = await ctx.post("/v1/projects", { data: { title: "J2 g2", description: "x" } });
  const pid = (await create.json()).id as string;
  await ctx.patch(`/v1/projects/${pid}/understanding`, {
    data: { project_type: "it", project_nature: "technical", understanding_summary: "x", aegira_internal: false },
  });
  await ctx.post(`/v1/projects/${pid}/approve-understanding`);
  await ctx.post(`/v1/projects/${pid}/guardrails/clear`, { data: { proceed: true } });
  await ctx.post(`/v1/projects/${pid}/plan`);
  await ctx.post(`/v1/projects/${pid}/plan/milestones/done`);
  await ctx.dispose();

  if (!(await gotoWorkspace(page, `/projects/${pid}/review`))) return;
  await expect(page.getByRole("heading", { name: /Review & Freigabe/ })).toBeVisible();
  await page.getByTestId("review-sufficient").check();
  await page.getByTestId("gate2-submit").click();
  await expect(page.getByTestId("gate2-banner")).toBeVisible();
  await expect(page.getByTestId("review-to-harness")).toBeVisible();
});

test("J2 — Plan-Freigabe bleibt eingefroren (Banner aus Seed)", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/review`))) return;
  await expect(page.getByTestId("gate2-banner")).toBeVisible();
  await expect(page.getByTestId("review-to-harness")).toBeVisible();
});
