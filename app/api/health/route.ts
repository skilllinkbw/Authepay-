/**
 * GET /api/health — operational health/configuration probe.
 *
 * Reports boolean configuration state only. Never returns secret values,
 * connection strings, or internal hostnames. Suitable for load-balancer
 * readiness checks and partner-facing status pages.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HealthReport {
  status: "ok" | "degraded";
  service: string;
  version: string;
  timestamp: string;
  checks: {
    supabase_url_configured: boolean;
    supabase_anon_key_configured: boolean;
    service_role_configured: boolean;
    payment_provider: string;
    payment_test_mode: boolean;
  };
}

export async function GET() {
  const checks = {
    supabase_url_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon_key_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    service_role_configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    payment_provider: process.env.PAYMENT_PROVIDER ?? "test",
    payment_test_mode: process.env.PAYMENT_TEST_MODE === "true",
  };

  const coreReady =
    checks.supabase_url_configured && checks.supabase_anon_key_configured;

  const report: HealthReport = {
    status: coreReady ? "ok" : "degraded",
    service: "authepay",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(report, { status: coreReady ? 200 : 503 });
}
