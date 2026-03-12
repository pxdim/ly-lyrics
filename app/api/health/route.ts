/**
 * Health Check API Endpoint
 *
 * Simple health check for Railway deployment monitoring.
 * Returns 200 OK if the service is running.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "LY Lyrics Display System",
      version: "0.1.0",
    },
    { status: 200 },
  );
}

// Allow HEAD requests for health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}
