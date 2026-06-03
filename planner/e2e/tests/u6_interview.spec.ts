import { request, APIRequestContext } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { gotoWorkspace } from "../fixtures/nav";

/**
 * U6 — Interview-Tiefe & Vollständigkeit (Teststrategie v0.9.5 §9).
 *
 * Recon (app/projects/[id]/interview/page.tsx, POST /v1/projects/{id}/interview/turn):
 * Das Schärfungs-Interview startet mit einer Eröffnungsfrage und vertieft sich
 * Antwort für Antwort. Der deterministische Engine-Pfad (ohne LLM) führt durch
 * project_nature → target_platform → understanding_summary; jede Antwort fügt eine
 * Assistenten-Nachricht mit Folgefrage + Hypothesen-Chip hinzu und erreicht nach
 * wenigen Runden den DONE-Zustand (Vorschlag „Zusammenfassung übernehmen").
 *
 * Geprüft wird die beobachtbare Tiefe/Vollständigkeit:
 *  - jede gesendete Antwort vertieft das Interview (Transkript wächst, neue
 *    Assistenten-Folgefrage erscheint);
 *  - der Fortschritt mündet in einen erreichbaren DONE-Zustand.
 *
 * Defensiv (web-first, keine harten Timeouts); skippt bei Lock/CORS (preconditions).
 */

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";

async function freshProject(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.post(`/v1/projects`, {
    data: { title: "U6 Interview", description: "Tiefe & Vollständigkeit" },
  });
  return (await res.json()).id as string;
}

test("U6 — jede Antwort vertieft das Interview (Folgefragen, wachsendes Transkript)", async ({ page }) => {
  const ctx = await request.newContext({ baseURL: API });
  const pid = await freshProject(ctx);
  await ctx.dispose();

  if (!(await gotoWorkspace(page, `/projects/${pid}/interview`))) return;

  const chat = page.getByTestId("interview-chat");
  const assistant = page.getByTestId("interview-msg-assistant");
  const user = page.getByTestId("interview-msg-user");

  // Eröffnung: genau eine Assistenten-Frage, noch keine Nutzer-Antwort.
  await expect(assistant.first()).toBeVisible();
  await expect(user).toHaveCount(0);
  const startAssistant = await assistant.count();

  const input = page.getByTestId("interview-input");
  const send = page.getByTestId("interview-send");

  // 1. Antwort → Nutzer-Bubble erscheint + eine neue Assistenten-Folgefrage.
  await input.fill("Wir wollen ein internes Tool zur KI-Vertragsprüfung bauen.");
  await send.click();
  await expect(user).toHaveCount(1);
  await expect(assistant).toHaveCount(startAssistant + 1);

  // 2. Antwort → das Interview vertieft sich weiter (Transkript wächst monoton).
  await input.fill("Zielgruppe ist die Rechtsabteilung, Zielplattform Azure.");
  await send.click();
  await expect(user).toHaveCount(2);
  await expect(assistant).toHaveCount(startAssistant + 2);

  // Vollständigkeit/Fortschritt: das Transkript ist sichtbar gewachsen.
  const total = await chat.getByTestId(/interview-msg-/).count();
  expect(total).toBeGreaterThanOrEqual(startAssistant + 4); // ≥2 user + ≥(start+2) assistant
});

test("U6 — der DONE-Zustand (Vollständigkeit) ist über den Fragefluss erreichbar", async ({ page }) => {
  const ctx = await request.newContext({ baseURL: API });
  const pid = await freshProject(ctx);
  await ctx.dispose();

  if (!(await gotoWorkspace(page, `/projects/${pid}/interview`))) return;

  const input = page.getByTestId("interview-input");
  const send = page.getByTestId("interview-send");

  // Der deterministische Pfad erreicht DONE nach drei tragfähigen Antworten.
  const user = page.getByTestId("interview-msg-user");
  const answers = [
    "Wir wollen ein internes Tool zur KI-Vertragsprüfung bauen.",
    "Zielgruppe ist die Rechtsabteilung, Zielplattform Azure.",
    "Erfolg = 50% schnellere Prüfung, Go-Live Q4.",
  ];
  for (let i = 0; i < answers.length; i++) {
    // Sobald DONE erreicht ist, verschwindet die Eingabe — dann nicht weiter senden.
    if (!(await input.isVisible())) break;
    await input.fill(answers[i]);
    await send.click();
    // Turn abgeschlossen: die Nutzer-Antwort ist im Transkript gelandet.
    await expect(user).toHaveCount(i + 1);
  }

  // Vollständigkeit erreicht: DONE-Zustand sichtbar, weiter-zu-Gate-1 angeboten.
  await expect(page.getByTestId("interview-done")).toBeVisible();
  await expect(page.getByRole("button", { name: /Weiter zu Verständnis & Gate 1/ })).toBeVisible();
});
