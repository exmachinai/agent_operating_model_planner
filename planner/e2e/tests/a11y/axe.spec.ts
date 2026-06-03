import { Page } from "@playwright/test";
import { test, expect } from "../../fixtures/auth";
import AxeBuilder from "@axe-core/playwright";
import { seedProject } from "../../fixtures/seed";
import { gotoWorkspace } from "../../fixtures/nav";

/**
 * A11y (§10) — axe-core auf /plan, /harness, /review. Ziel: 0 NEUE Befunde mit
 * Schweregrad critical/serious. Andere Schweregrade (moderate/minor) werden geloggt,
 * brechen den Test aber nicht (Iterationsspielraum).
 *
 * Früher dokumentierte serious-Befunde — inzwischen behoben und daher NICHT mehr
 * ausgenommen (der Guard erzwingt sie wieder hart):
 *
 *  1. `color-contrast` — die Status-Token --c-green/--c-amber unterschritten als
 *     Textfarbe WCAG AA (4.5:1). Fix: AA-konforme Textvarianten --c-green-text
 *     (#3F7D52) / --c-amber-text (#8C6510) in app/styles/tokens.css + BRAND.md;
 *     überall als TEXT genutzt (Badges/Labels), helle Swatches bleiben für Flächen.
 *  2. `scrollable-region-focusable` — die scrollbare Agenten-Palette (HarnessCanvas)
 *     und die Flow-Vorschau (AgentFlow) sind jetzt per Tastatur fokussierbar
 *     (tabIndex=0 + aria-label).
 *
 * KNOWN_SERIOUS ist bewusst leer: jede neue critical/serious-Regel blockiert.
 * Browserabhängig: Auth-Fixture öffnet den Lock (siehe fixtures/auth.ts).
 */

// Keine bekannten serious-Ausnahmen mehr — jeder critical/serious-Befund blockiert.
const KNOWN_SERIOUS = new Set<string>([]);

async function runAxe(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const known = seriousOrCritical.filter((v) => KNOWN_SERIOUS.has(v.id));
  const blocking = seriousOrCritical.filter((v) => !KNOWN_SERIOUS.has(v.id));

  const fmt = (vs: typeof results.violations) =>
    vs.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}×)`).join("\n");

  test.info().annotations.push({
    type: "axe",
    description:
      `${label}: ${blocking.length} NEUE critical/serious; ` +
      `${known.length} bekannte (dokumentiert: ${[...KNOWN_SERIOUS].join(", ")}); ` +
      `${results.violations.length} total.` +
      (known.length ? `\nbekannt:\n${fmt(known)}` : ""),
  });
  expect(blocking, `${label} — NEUE critical/serious A11y-Befunde:\n${fmt(blocking)}`).toEqual([]);
}

test("A11y — /plan ohne critical/serious", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/plan`))) return;
  await expect(page.getByTestId("risk-ampel")).toBeVisible();
  await runAxe(page, "/plan");
});

test("A11y — /review ohne critical/serious", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/review`))) return;
  await expect(page.getByRole("heading", { name: /Review & Freigabe/ })).toBeVisible();
  await runAxe(page, "/review");
});

test("A11y — /harness (kompiliert) ohne critical/serious", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();
  await runAxe(page, "/harness");
});
