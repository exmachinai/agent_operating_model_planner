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

  // Bekannte, harmlose Drittanbieter-Noise ausfiltern (anpassen nach Bedarf).
  const critical = errors.filter((e) => !/favicon|third-party|analytics/i.test(e));
  expect(critical, `kritische Fehler:\n${critical.join("\n")}`).toHaveLength(0);
});
