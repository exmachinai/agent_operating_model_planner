import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J3 — Harness kompilieren → (revise) → Gate 3 → Download verfügbar.
 * Seed bis Gate 2; der Harness-Lauf läuft komplett über die UI.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

test("J3 — Harness kompilieren, revidieren und Gate 3 freigeben", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  // Noch kein Harness → Kompilieren.
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();
  await expect(page.getByTestId("harness-status")).toHaveAttribute("data-frozen", "0");

  // Revise: Worker parallel anordnen (bleibt Entwurf).
  await page.getByTestId("harness-revise-parallel").click();
  await expect(page.getByTestId("harness-status")).toHaveAttribute("data-frozen", "0");

  // Gate 3 freigeben.
  await page.getByTestId("gate3-submit").click();
  await expect(page.getByTestId("harness-status")).toHaveAttribute("data-frozen", "1");

  // Download verfügbar (Link zeigt auf den Download-Endpunkt).
  const dl = page.getByTestId("harness-download");
  await expect(dl).toBeVisible();
  await expect(dl).toHaveAttribute("href", /\/harness\/download$/);
});

test("J3 — Harness-Download liefert ein nicht-leeres ZIP", async ({ page, request }) => {
  const pid = await seedProject({ toGate: 3 }); // bis Gate 3 inkl. Approve
  // API-seitige Download-Prüfung ist CORS-unabhängig; läuft immer.
  const base = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
  const res = await request.get(`${base}/v1/projects/${pid}/harness/download`);
  expect(res.ok()).toBeTruthy();
  const buf = await res.body();
  expect(buf.byteLength).toBeGreaterThan(100);
  // ZIP-Magic "PK".
  expect(buf[0]).toBe(0x50);
  expect(buf[1]).toBe(0x4b);

  // Wenn das Frontend interaktiv ist, ist der Download-Link sichtbar.
  if (await gotoWorkspace(page, `/projects/${pid}/harness`)) {
    await expect(page.getByTestId("harness-download")).toBeVisible();
  }
});

test("J3 — Entpackt-Speichern fällt ohne Ordner-Dialog robust auf ZIP-Download zurück", async ({ page }) => {
  // Robustheit für künftige Use-Cases: Ist die File-System-Access-API nicht verfügbar
  // (headless / Browser ohne Support / IT-Policy), darf „Entpackt" nicht still scheitern,
  // sondern MUSS die ZIP herunterladen — niemand bleibt ohne Deliverable.
  const pid = await seedProject({ toGate: 3 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  await page.getByText("Entpackt (ganze Struktur)").click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("harness-save-as").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.harness\.zip$/);
});
