/**
 * Liveness probe — Container Apps fragt diesen Endpoint regelmäßig ab.
 * Antwortet einfach mit 200, wenn der Next.js-Server läuft.
 *
 * Pfad: /health (Top-Level, matched mit Bicep-Probe-Pfad).
 * Spec: docs/06_azure-configuration-guide.md §6.4 (Probes).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "aegira-planner-frontend",
    // Build-Zeit-Tag (NEXT_PUBLIC_APP_VERSION) — beweist, dass die laufende Revision
    // das NEUE Image ist. Post-Deploy-Check assertet diesen Wert gegen den Deploy-Tag.
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    now: new Date().toISOString(),
  });
}
