import { test, expect } from "@playwright/test";
import { apiBase } from "../fixtures/seed";

/**
 * T0 — Deploy-Parität & Erreichbarkeit (Teststrategie §9). Robust ohne UI-Selektoren:
 * läuft auf Desktop UND iPhone (Config-Projekte).
 */

test("API /health meldet ok + Version", async ({ request }) => {
  const res = await request.get(`${apiBase}/health`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.version).toBeTruthy();
});

test("App-Root lädt (200, kein Crash)", async ({ page }) => {
  const resp = await page.goto("/");
  expect(resp?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/.+/);
});

test("Frontend-Healthpfad antwortet", async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/health`);
  expect(res.status()).toBeLessThan(400);
});
