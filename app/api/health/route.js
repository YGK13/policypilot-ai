// ============================================================================
// API: /api/health — System health check
//
// GET: Returns JSON with status of all configured services.
//      Used by: onboarding wizard, admin dashboard, uptime monitors, Vercel checks.
//
// Response shape:
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
import { isDbAvailable, getDb } from "@/lib/db";

// -- Tables the schema creates --
const EXPECTED_TABLES = [
  "organizations", "users", "tickets", "case_notes",
  "documents", "audit_log", "regulatory_reviews",
  "integrations", "chat_messages", "cases", "api_keys",
];

export const dynamic = "force-dynamic";

export async function GET() {
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
      dbService = { ok: false, error: err.message, latencyMs: null, tableCount: 0, missingTables: EXPECTED_TABLES };
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
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
