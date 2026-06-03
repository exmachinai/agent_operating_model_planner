import { request } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J4 — rote Ampel / stop-on-red (Teststrategie v0.9.5 §9).
 *
 * Recon-Befund (api/app/planning/zgpm_composer.py): die Gesamt-Ampel wird rot,
 * sobald ein Einzelrisiko-Score (Eintritt × Auswirkung) ≥ 15 erreicht
 * (`_ampel_for`). Der MRL-Score je Meilenstein ist deterministisch
 * `prob=2+(idx%3)`, `impact=3+(idx%2)`. Erst die `hybrid-concept-tech`-Gliederung
 * hat 6 Phasen; bei idx=5 ergibt sich 4×4 = 16 → **rot** (M06). Die kürzeren
 * Gliederungen (`technical`=5, `concept`=4) bleiben bei max. 12 → gelb.
 *
 * → „Rot" ist über den realen Flow deterministisch erzeugbar (Understanding mit
 * project_nature=hybrid-concept-tech). Dieser Spec asserted daher den ECHTEN
 * roten Zustand: (a) Plan-Seite rendert `risk-ampel` mit data-ampel="rot" und
 * Label „Rot" inkl. Treiber-Begründung; (b) der stop-on-red-/HITL-Mechanismus
 * greift sichtbar — der kompilierte Harness führt den HITL-Punkt
 * „rote Ampel — HITL-PM-Approval vor Fortsetzung" (compiler._hitl_points).
 *
 * Browserabhängig: skippt bei Lock/CORS (preconditions) wie die übrigen Journeys.
 */

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";

test("J4 — hybrid-Plan erzeugt rote Gesamt-Ampel (UI + API konsistent)", async ({ page }) => {
  const pid = await seedProject({ nature: "hybrid-concept-tech", toGate: 2 });

  // API-seitige Wahrheit (CORS-unabhängig): Gesamt-Ampel ist rot, getrieben durch M06.
  const ctx = await request.newContext({ baseURL: API });
  const plan = await (await ctx.get(`/v1/projects/${pid}/plan`)).json();
  await ctx.dispose();
  expect(plan.overall_ampel).toBe("rot");
  expect(plan.milestones.some((m: { ampel: string }) => m.ampel === "rot")).toBeTruthy();

  // UI: die Plan-Seite rendert die rote Ampel sichtbar.
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  const ampel = page.getByTestId("risk-ampel");
  await expect(ampel).toBeVisible();
  await expect(ampel).toHaveAttribute("data-ampel", "rot");
  await expect(ampel).toContainText("Rot");

  // Die Begründung benennt mindestens einen roten Treiber (kein leerer Rot-Zustand).
  await expect(page.getByText(/ziehen .* Einzelrisiko/)).toBeVisible();
});

test("J4 — stop-on-red: Harness trägt den HITL-Punkt für die rote Ampel", async ({ page }) => {
  const pid = await seedProject({ nature: "hybrid-concept-tech", toGate: 2 });

  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  // Harness kompilieren (Entwurf) — der HITL-Punkt ist Bestandteil des Graphen.
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();

  const hitl = page.getByTestId("hitl-points");
  await expect(hitl).toBeVisible();
  // stop-on-red: bewusster HITL-Halt vor Fortsetzung bei roter Meilenstein-Ampel.
  await expect(hitl).toContainText(/rote Ampel — HITL-PM-Approval vor Fortsetzung/);
});
