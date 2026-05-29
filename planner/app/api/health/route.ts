/**
 * Liveness probe — Container Apps fragt diesen Endpoint regelmäßig ab.
 * Antwortet einfach mit 200, wenn der Next.js-Server läuft.
 *
 * Pfad: /api/health
 * Spec: docs/06_azure-configuration-guide.md §6.4 (Probes).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "aegira-planner-frontend",
    now: new Date().toISOString(),
  });
}
