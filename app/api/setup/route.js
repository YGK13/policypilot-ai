// ============================================================================
// API: /api/setup — One-click Neon database schema initialization
//
// POST: Reads lib/db/schema.sql and runs every CREATE TABLE / CREATE INDEX
//       statement against the configured DATABASE_URL.
//       Idempotent — all statements use IF NOT EXISTS, so safe to re-run.
//       Protected by SETUP_SECRET env var to prevent unauthorized use.
//
// GET:  Returns current table inventory so you can confirm schema state
//       without actually applying changes.
//
// Usage (one-time after connecting Neon from Vercel Marketplace):
//   curl -X POST https://aihrpilot.com/api/setup \
//        -H "Authorization: Bearer $SETUP_SECRET"
//
// Or via the onboarding wizard UI.
// ============================================================================

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { isDbAvailable, getDb } from "@/lib/db";
import { getSessionRole } from "@/lib/auth/rbac";

// -- DDL MUST run over Neon's WebSocket transport. The HTTP driver
//    (@neondatabase/serverless's neon() tagged-template) silently drops
//    CREATE TABLE / CREATE INDEX / ALTER TABLE for statements that run
//    inside its implicit auto-commit wrapper — it returns success but
//    the tables never appear in pg_tables. We saw this in production
//    when self_service_requests, and later the five payroll_* tables,
//    all "succeeded" via sql.unsafe() but never got created.
//
//    The WebSocket Pool transport does not have this defect. In Node/
//    serverless, Pool needs a WebSocket constructor injected explicitly
//    (browsers already have one; Node does not). --
neonConfig.webSocketConstructor = ws;

// -- Tables we expect to exist after setup, in dependency order.
//    Keep this in sync with lib/db/schema.sql AND with the identical list
//    in app/api/health/route.js. Missing entries here caused /api/setup
//    to report a healthy DB even when self_service_requests / document_chunks
//    were missing, silently masking schema drift in production. --
const EXPECTED_TABLES = [
  "organizations",
  "users",
  "tickets",
  "case_notes",
  "documents",
  "document_chunks",
  "audit_log",
  "regulatory_reviews",
  "integrations",
  "chat_messages",
  "cases",
  "api_keys",
  "self_service_requests",
  "payroll_connections",
  "payroll_employees",
  "payroll_paystubs",
  "payroll_pto_balances",
  "payroll_webhook_events",
];

// -- Two auth paths, either sufficient:
//    1. A signed-in hr_admin Clerk session. The onboarding wizard POSTs
//       here from the browser using the Clerk cookies, which is way
//       simpler than shipping SETUP_SECRET to the client as a
//       NEXT_PUBLIC_ var (that leaks the secret into the JS bundle).
//    2. A SETUP_SECRET bearer token, for curl / cron / server-to-server
//       calls that do not have a Clerk session.
//    Either alone is enough. --
async function isAuthorized(request) {
  // -- Bearer path --
  const secret = process.env.SETUP_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (secret && token && token === secret) return { ok: true, via: "bearer" };

  // -- Clerk hr_admin path --
  try {
    const session = await getSessionRole();
    if (session?.authed && session.role === "hr_admin") {
      return { ok: true, via: "session", clerkId: session.clerkId };
    }
  } catch {
    // fall through to unauthorized
  }

  // -- Dev fallback: if neither auth path is configured AND we are running
  //    outside production, allow through so a fresh clone works. --
  if (!secret && process.env.NODE_ENV !== "production") {
    return { ok: true, via: "dev-fallback" };
  }

  return { ok: false, reason: "no valid Clerk hr_admin session and no matching SETUP_SECRET bearer token" };
}

// ============================================================================
// GET /api/setup — Check which tables exist vs. are missing
// ============================================================================
export async function GET(request) {
  const authz = await isAuthorized(request);
  if (!authz.ok) {
    return NextResponse.json({
      error: "Unauthorized",
      reason: authz.reason || "sign in as an hr_admin, or send SETUP_SECRET as a Bearer token",
    }, { status: 401 });
  }

  if (!isDbAvailable()) {
    return NextResponse.json({
      status: "no_database",
      message: "DATABASE_URL is not configured. Add Neon from Vercel Marketplace.",
      tables: {},
    });
  }

  try {
    const sql = getDb();

    // -- Query pg_tables for our expected tables --
    const existingRows = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY(${EXPECTED_TABLES})
    `;
    const existing = new Set(existingRows.map((r) => r.tablename));

    const tables = {};
    for (const t of EXPECTED_TABLES) {
      tables[t] = existing.has(t) ? "exists" : "missing";
    }

    const missingCount = Object.values(tables).filter((v) => v === "missing").length;
    const status = missingCount === 0 ? "ready" : missingCount === EXPECTED_TABLES.length ? "empty" : "partial";

    return NextResponse.json({
      status,
      message: missingCount === 0
        ? "All tables exist. Database is ready."
        : `${missingCount} table(s) missing. POST /api/setup to initialize.`,
      tables,
    });
  } catch (err) {
    console.error("[Setup] GET error:", err);
    return NextResponse.json({ error: err.message, status: "error" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/setup — Apply schema.sql to Neon (idempotent)
// ============================================================================
export async function POST(request) {
  const authz = await isAuthorized(request);
  if (!authz.ok) {
    return NextResponse.json({
      error: "Unauthorized",
      reason: authz.reason || "sign in as an hr_admin, or send SETUP_SECRET as a Bearer token",
    }, { status: 401 });
  }

  if (!isDbAvailable()) {
    return NextResponse.json({
      success: false,
      error: "DATABASE_URL is not configured. Add Neon from Vercel Marketplace.",
    }, { status: 503 });
  }

  // -- Read schema.sql from the filesystem (only works server-side) --
  const schemaPath = join(process.cwd(), "lib", "db", "schema.sql");
  let schemaSql;
  try {
    schemaSql = readFileSync(schemaPath, "utf-8");
  } catch (readErr) {
    return NextResponse.json({
      success: false,
      error: `Could not read schema file: ${readErr.message}`,
    }, { status: 500 });
  }

  // -- Split into individual statements on semicolon boundaries.
  //    Strip comment lines and blank lines. Ignore empty statements. --
  const statements = schemaSql
    .split(";")
    .map((stmt) =>
      stmt
        .split("\n")
        .filter((line) => !line.trim().startsWith("--") && line.trim() !== "")
        .join("\n")
        .trim()
    )
    .filter((stmt) => stmt.length > 0);

  // -- Prefer the unpooled URL for DDL. The pooled URL runs through
  //    PgBouncer in transaction mode, which does not tolerate every
  //    session-level thing DDL wants to do. --
  const ddlConnStr = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: ddlConnStr });
  const results = [];
  let applied = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (const stmt of statements) {
      // -- Skip pure-comment blocks --
      if (!stmt.match(/CREATE|ALTER|INSERT|DROP|GRANT|INDEX/i)) {
        skipped++;
        continue;
      }
      try {
        // -- pool.query executes over WebSocket, which does NOT drop DDL. --
        await pool.query(stmt + ";");
        applied++;
        results.push({ stmt: stmt.slice(0, 80) + (stmt.length > 80 ? "…" : ""), status: "ok" });
      } catch (stmtErr) {
        // -- Non-fatal: IF NOT EXISTS means most re-runs are safe --
        errors++;
        results.push({
          stmt: stmt.slice(0, 80) + (stmt.length > 80 ? "…" : ""),
          status: "error",
          error: stmtErr.message,
        });
        console.warn("[Setup] Statement error (non-fatal):", stmtErr.message);
      }
    }

    // -- Verify tables after setup (HTTP driver is fine for SELECT). --
    const sql = getDb();
    const existingRows = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = ANY(${EXPECTED_TABLES})
    `;
    const existing = new Set(existingRows.map((r) => r.tablename));
    const tableStatus = {};
    for (const t of EXPECTED_TABLES) {
      tableStatus[t] = existing.has(t) ? "exists" : "missing";
    }
    const missingAfter = Object.values(tableStatus).filter((v) => v === "missing").length;

    return NextResponse.json({
      success: missingAfter === 0,
      applied,
      skipped,
      errors,
      tablesReady: EXPECTED_TABLES.length - missingAfter,
      tablesMissing: missingAfter,
      tables: tableStatus,
      message: missingAfter === 0
        ? `Database initialized successfully. ${applied} DDL statements applied.`
        : `Setup completed with issues. ${missingAfter} table(s) still missing.`,
      details: results,
    });
  } catch (err) {
    console.error("[Setup] POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    // -- Always close the pool. Fluid Compute reuses instances so a
    //    leaked pool would strand a WebSocket per invocation. --
    try { await pool.end(); } catch { /* ignore */ }
  }
}
