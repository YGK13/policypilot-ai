// ============================================================================
// API: /api/health — System health check
//
// GET: Public callers (uptime monitors) get ONLY { ok, timestamp }. The route
//      is public in proxy.ts, so the detailed service inventory below is
//      returned only to a signed-in hr_admin (onboarding wizard) or a caller
//      sending `Authorization: Bearer $SETUP_SECRET`. Raw DB errors are never
//      returned; they are logged server-side.
//
// Detailed response shape:
// {
//   ok: true,
//   timestamp: "ISO-8601",
//   services: {
//     database: { ok: bool, latencyMs: number, tableCount: number, missingTables: [] },
//     llm:      { ok: bool, gateway: bool, directKey: bool },
//     clerk:    { ok: bool },
//     blob:     { ok: bool },
//     stripe:   { ok: bool },
//     resend:   { ok: bool },
//   },
//   setup: {
//     dbInitialized: bool,
//     missingTables: [],
//   }
// }
// ============================================================================

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { isDbAvailable, getDb } from "@/lib/db";
import { getSessionRole } from "@/lib/auth/rbac";

// -- Same two auth paths as /api/setup: SETUP_SECRET bearer or hr_admin session --
async function canSeeDetails(request) {
  const secret = process.env.SETUP_SECRET;
  const token  = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (secret && token) {
    const a = Buffer.from(token);
    const b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  try {
    const session = await getSessionRole();
    return !!(session?.authed && session.role === "hr_admin");
  } catch {
    return false;
  }
}

// -- Tables the schema creates. Keep in sync with lib/db/schema.sql AND with
//    the identical list in app/api/setup/route.js. --
const EXPECTED_TABLES = [
  "organizations", "users", "tickets", "case_notes",
  "documents", "document_chunks", "audit_log", "regulatory_reviews",
  "integrations", "chat_messages", "cases", "api_keys",
  "self_service_requests",
  "payroll_connections", "payroll_employees", "payroll_paystubs",
  "payroll_pto_balances", "payroll_webhook_events",
];

export const dynamic = "force-dynamic";

export async function GET(request) {
  const start = Date.now();

  // ============ Database ============
  let dbService = { ok: false, latencyMs: null, tableCount: 0, missingTables: [] };

  if (isDbAvailable()) {
    try {
      const sql = getDb();
      const dbStart = Date.now();
      const rows = await sql`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = ANY(${EXPECTED_TABLES})
      `;
      const latencyMs = Date.now() - dbStart;
      const existing = new Set(rows.map((r) => r.tablename));
      const missingTables = EXPECTED_TABLES.filter((t) => !existing.has(t));
      dbService = {
        ok: missingTables.length === 0,
        latencyMs,
        tableCount: existing.size,
        missingTables,
      };
    } catch (err) {
      console.error("[health] DB check failed:", err?.message || err);
      dbService = { ok: false, error: "Database query failed", latencyMs: null, tableCount: 0, missingTables: EXPECTED_TABLES };
    }
  } else {
    dbService = { ok: false, error: "DATABASE_URL not configured", latencyMs: null, tableCount: 0, missingTables: EXPECTED_TABLES };
  }

  // ============ LLM ============
  const hasOidc       = !!process.env.VERCEL_OIDC_TOKEN;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const llmService = {
    ok: hasOidc || hasAnthropicKey,
    gateway: hasOidc,
    directKey: hasAnthropicKey,
  };

  // ============ Clerk ============
  const clerkService = {
    ok: !!process.env.CLERK_SECRET_KEY && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    webhook: !!process.env.CLERK_WEBHOOK_SECRET,
  };

  // ============ Vercel Blob ============
  const blobService = {
    ok: !!process.env.BLOB_READ_WRITE_TOKEN,
  };

  // ============ Stripe ============
  const stripeService = {
    ok: !!process.env.STRIPE_SECRET_KEY,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  };

  // ============ Resend (email) ============
  const resendService = {
    ok: !!process.env.RESEND_API_KEY,
  };

  // ============ Overall status ============
  const allOk = llmService.ok && clerkService.ok;
  const totalMs = Date.now() - start;
  const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  // -- Public: liveness only. No service inventory, table names or env. --
  if (!(await canSeeDetails(request))) {
    return NextResponse.json(
      { ok: allOk, timestamp: new Date().toISOString() },
      { headers: noStore }
    );
  }

  return NextResponse.json({
    ok: allOk,
    timestamp: new Date().toISOString(),
    responseMs: totalMs,
    services: {
      database: dbService,
      llm:      llmService,
      clerk:    clerkService,
      blob:     blobService,
      stripe:   stripeService,
      resend:   resendService,
    },
    setup: {
      dbInitialized: dbService.missingTables.length === 0,
      missingTables: dbService.missingTables,
      needsSetup: dbService.missingTables.length > 0,
    },
    env: process.env.NODE_ENV,
  }, {
    headers: noStore,
  });
}
