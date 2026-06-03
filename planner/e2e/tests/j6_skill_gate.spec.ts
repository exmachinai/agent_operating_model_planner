import { request } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { seedProject } from "../fixtures/seed";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * J6 — Skill-Trust-Gate (Teststrategie v0.9.5 §9).
 *
 * Recon (api/app/harness/skills_service.py, schemas/harness.py, skill_catalog.py):
 *  - Jeder Skill trägt ein `trust_tier` (anthropic-vetted · aegira-certified ·
 *    world-top · community · experimental). `needs_gate` ⇔ Skripte ODER
 *    community/experimental → Security-Gate (HITL).
 *  - `GET /v1/skills` liefert NUR freigegebene Skills (`released_catalog`):
 *    vetted/certified/world-top sind default-frei, community/experimental sind
 *    NIE default-frei und erscheinen erst nach expliziter Admin-Freigabe. Damit
 *    sind ungeprüfte/experimentelle Skills für normale Nutzer im Harness-Picker
 *    gegated — das ist der beobachtbare Trust-Gate-Zustand.
 *  - Die Harness-UI macht den Trust-Layer sichtbar: jeder Skill landet als
 *    trust-tier-gefärbter Chip am Agenten (`skill-chip` + data-trust-tier); der
 *    Picker zeigt den Trust-Dot je Zeile (`skill-picker-row` + data-trust-tier).
 *
 * Da der e2e-Auth-Fixture-Nutzer kein Admin ist (Admin = auth_admin_email), ist
 * die Admin-Freigabeliste hier nicht der Hebel — getestet wird die für jeden
 * Nutzer sichtbare Gate-Realität: (1) der Picker bietet ausschließlich
 * freigegebene Tiers an (kein community/experimental); (2) der Trust-Tier landet
 * sichtbar als Badge/Tag am Agenten; (3) Zuordnen eines Skills bringt dessen
 * Trust-Chip auf den Agenten.
 *
 * Browserabhängig: skippt bei Lock/CORS (preconditions).
 */

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";
const GATED_TIERS = ["community", "experimental"];
const RELEASED_TIERS = ["anthropic-vetted", "aegira-certified", "world-top"];

test("J6 — der öffentliche Skill-Katalog ist gegated: keine community/experimental Tiers", async () => {
  // API-Wahrheit (CORS-unabhängig): das Trust-Gate filtert ungeprüfte Tiers raus.
  const ctx = await request.newContext({ baseURL: API });
  const skills = (await (await ctx.get(`/v1/skills`)).json()) as { trust_tier: string }[];
  await ctx.dispose();
  expect(skills.length).toBeGreaterThan(0);
  const tiers = new Set(skills.map((s) => s.trust_tier));
  for (const gated of GATED_TIERS) expect(tiers.has(gated)).toBeFalsy();
  // Es gibt überhaupt nur freigegebene Trust-Tiers.
  for (const t of tiers) expect(RELEASED_TIERS).toContain(t);
});

test("J6 — Trust-Layer sichtbar: Agenten-Skills tragen ihren Trust-Tier als Badge", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  // Harness kompilieren → Agenten mit vorbelegten (freigegebenen) Skills erscheinen.
  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();

  const chips = page.getByTestId("skill-chip");
  await expect(chips.first()).toBeVisible();

  // Jeder sichtbare Skill-Chip trägt einen FREIGEGEBENEN Trust-Tier (das Gate hält).
  const tiers = await chips.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-trust-tier")),
  );
  expect(tiers.length).toBeGreaterThan(0);
  for (const t of tiers) {
    expect(t).not.toBeNull();
    expect(GATED_TIERS).not.toContain(t!);
    expect(RELEASED_TIERS).toContain(t!);
  }
});

test("J6 — Picker bietet nur freigegebene Tiers; Zuordnen bringt den Trust-Chip an den Agenten", async ({ page }) => {
  const pid = await seedProject({ toGate: 2 });
  if (!(await gotoWorkspace(page, `/projects/${pid}/harness`))) return;

  await page.getByTestId("harness-compile").click();
  await expect(page.getByTestId("harness-status")).toBeVisible();

  // Einen Agenten aufklappen und den Skill-Picker öffnen.
  const card = page.getByTestId("agent-card").first();
  await card.getByTestId("agent-card-toggle").click();
  await card.getByTestId("skill-picker-toggle").click();

  // Alle freigegebenen Skills anzeigen (Checkbox), damit der Picker sicher gefüllt ist.
  await card.getByRole("checkbox").check();

  const rows = card.getByTestId("skill-picker-row");
  await expect(rows.first()).toBeVisible();

  // KEINE gegateten Tiers im Picker — nur freigegebene werden angeboten.
  const rowTiers = await rows.evaluateAll((els) =>
    els.map((e) => e.getAttribute("data-trust-tier")),
  );
  expect(rowTiers.length).toBeGreaterThan(0);
  for (const t of rowTiers) {
    expect(GATED_TIERS).not.toContain(t!);
    expect(RELEASED_TIERS).toContain(t!);
  }

  // Skill zuordnen → sein Trust-Tier-Chip landet sichtbar am Agenten.
  const firstRow = rows.first();
  const tier = await firstRow.getAttribute("data-trust-tier");
  const chipsBefore = await card.getByTestId("skill-chip").count();
  await firstRow.getByTestId("skill-picker-add").click();

  // Nach dem Reload trägt der Agent mehr Chips, inkl. eines mit diesem Trust-Tier.
  await expect
    .poll(async () => card.getByTestId("skill-chip").count())
    .toBeGreaterThan(chipsBefore);
  await expect(
    card.locator(`[data-testid="skill-chip"][data-trust-tier="${tier}"]`).first(),
  ).toBeVisible();
});
