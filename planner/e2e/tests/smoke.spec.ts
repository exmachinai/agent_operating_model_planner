import { test, expect } from "@playwright/test";

/** Smoke: App lädt ohne kritische Konsolen-Fehler; Hauptlandmark sichtbar. */
test("App lädt ohne kritische JS-Fehler", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  // Hydration abwarten.
  await page.waitForLoadState("networkidle");

  // Bekannte, harmlose Drittanbieter-Noise ausfiltern. Zusätzlich: CORS-/Preflight-
  // /Netzwerk-Fehler beim API-Call gehören NICHT zum Frontend-Crash-Bild — sie
  // entstehen, wenn die Browser-Origin (PLAYWRIGHT_BASE_URL) nicht der von der API
  // erlaubten Origin entspricht (Umgebungs-/Backend-Konfig, außerhalb des Scopes).
  const critical = errors.filter(
    (e) =>
      !/favicon|third-party|analytics/i.test(e) &&
      !/CORS|preflight|access control|ERR_FAILED|Failed to load resource|Access-Control-Allow-Origin/i.test(e),
  );
  expect(critical, `kritische Fehler:\n${critical.join("\n")}`).toHaveLength(0);
});
