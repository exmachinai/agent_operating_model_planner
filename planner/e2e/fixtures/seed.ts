import { APIRequestContext, request } from "@playwright/test";

const API = process.env.E2E_API_BASE_URL ?? "http://localhost:8000";

/**
 * Seedet ein Projekt über das Backend bis zu einem Gate (für deterministische E2E).
 *
 * Gate-Stufen:
 *   undefined → bis Gate 1 (Verständnis freigegeben)
 *   2         → bis Gate 2 (Plan freigegeben)
 *   3         → bis Gate 3 (Harness kompiliert + freigegeben)
 *
 * Der echte Plan-Flow verlangt zwischen Plan-Generierung und Gate-2-Freigabe ein
 * `milestones/done` (Schritt 6a). Der Seed bildet das ab, damit er die UI-Realität
 * spiegelt und nicht an einem Gating hängen bleibt.
 */
export async function seedProject(
  opts: { nature?: string; aegiraInternal?: boolean; toGate?: 1 | 2 | 3 } = {},
): Promise<string> {
  const ctx: APIRequestContext = await request.newContext({ baseURL: API });
  const create = await ctx.post("/v1/projects", {
    data: { title: "E2E Seed", description: "Playwright" },
  });
  const pid: string = (await create.json()).id;

  await ctx.patch(`/v1/projects/${pid}/understanding`, {
    data: {
      project_type: "it",
      project_nature: opts.nature ?? "technical",
      understanding_summary: "Seed-Vorhaben mit klarem Ziel.",
      aegira_internal: opts.aegiraInternal ?? false,
    },
  });
  await ctx.post(`/v1/projects/${pid}/approve-understanding`); // Gate 1

  if (opts.toGate && opts.toGate >= 2) {
    await ctx.post(`/v1/projects/${pid}/guardrails/clear`, { data: { proceed: true } });
    await ctx.post(`/v1/projects/${pid}/plan`); // erzeugt v1
    await ctx.post(`/v1/projects/${pid}/plan/milestones/done`); // Schritt 6a
    await ctx.post(`/v1/projects/${pid}/approve-plan`); // Gate 2
  }

  if (opts.toGate && opts.toGate >= 3) {
    await ctx.post(`/v1/projects/${pid}/harness`); // kompiliert Entwurf
    await ctx.post(`/v1/projects/${pid}/harness/approve`); // Gate 3
  }

  await ctx.dispose();
  return pid;
}

export const apiBase = API;
