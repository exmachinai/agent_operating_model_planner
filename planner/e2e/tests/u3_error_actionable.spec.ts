import { request } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { gotoWorkspace, gotoUnderstanding } from "../fixtures/nav";

/**
 * U3 — Fehler sind handlungsfähig: verständliche deutsche Meldung, kein roher
 * Stacktrace / kein nacktes JSON-`detail`, und der Nutzer bleibt nicht im Leeren.
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

test("U3 — fehlendes Projekt zeigt verständliche Fehlermeldung statt Stacktrace", async ({ page }) => {
  if (!(await gotoWorkspace(page, "/projects/prj_doesnotexist123/understanding"))) return;
  const banner = page.getByTestId("error-banner");
  await expect(banner).toBeVisible();
  const text = (await banner.innerText()).toLowerCase();
  expect(text).not.toContain("traceback");
  expect(text).not.toContain("undefined");
  expect(text).not.toMatch(/\{\s*"detail"/);
  expect(text.length).toBeGreaterThan(8);
});

test("U3 — Gate-1-Aktion erklärt blockierende Pflichtfelder (title)", async ({ page }) => {
  const ctx = await request.newContext({
    baseURL: process.env.E2E_API_BASE_URL ?? "http://localhost:8000",
  });
  // Titel ≥3 Zeichen (API-Mindestlänge), sonst 422 → kein pid.
  const res = await ctx.post(`/v1/projects`, { data: { title: "U3 Fehler", description: "x" } });
  const pid = (await res.json()).id as string;
  await ctx.dispose();

  if (!(await gotoUnderstanding(page, pid))) return;
  const submit = page.getByTestId("gate1-submit");
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("title", /muss/);
});
