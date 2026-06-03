import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-Konfiguration (Teststrategie §9): Desktop 1440×900 + iPhone 15 Plus.
 * Basis-URL über PLAYWRIGHT_BASE_URL (Default lokaler Dev-Server). API-Basis über
 * E2E_API_BASE_URL (für Seed via Backend).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      // §9: iPhone 15 Plus 430×932, isMobile/hasTouch, Safari-UA.
      name: "iphone",
      use: { ...devices["iPhone 15 Plus"] },
    },
  ],
});
