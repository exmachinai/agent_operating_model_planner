/**
 * Readiness probe — Container Apps sendet erst Traffic, wenn diese 200 liefert.
 *
 * Phase-2-Spike: Stub, immer ready (kein Backend-Roundtrip).
 * Phase-3+: Pingt Backend-API-Health an, um echte Bereitschaft zu prüfen.
 *
 * Pfad: /ready (Top-Level, matched mit Bicep-Probe-Pfad).
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ready",
    checks: {
      backend: true,
    },
  });
}
