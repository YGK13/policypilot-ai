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
import { isDbAvailable, getDb } from "@/lib/db";

// -- Tables we expect to exist after setup, in dependency order --
const EXPECTED_TABLES = [
  "organizations",
  "users",
  "tickets",
  "case_notes",
  "documents",
  "audit_log",
  "regulatory_reviews",
  "integrations",
  "chat_messages",
  "cases",
  "api_keys",
];

// -- Verify caller is authorized: must supply SETUP_SECRET in Authorization header --
function isAuthorized(request) {
  const secret = process.env.SETUP_SECRET;
  // If no secret is configured, only allow in development
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === secret;
}

// ============================================================================
// GET /api/setup — Check which tables exist vs. are missing
// ============================================================================
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized — set SETUP_SECRET env var and pass it as Bearer token" }, { status: 401 });
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized — set SETUP_SECRET env var and pass it as Bearer token" }, { status: 401 });
  }

  if (!isDbAvailable()) {
    return NextResponse.json({
      success: false,
      error: "DATABASE_URL is not configured. Add Neon from Vercel Marketplace.",
    }, { status: 503 });
  }

  try {
    const sql = getDb();

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

    const results = [];
    let applied = 0;
    let skipped = 0;
    let errors = 0;

    for (const stmt of statements) {
      // -- Skip pure-comment blocks --
      if (!stmt.match(/CREATE|ALTER|INSERT|DROP|GRANT|INDEX/i)) {
        skipped++;
        continue;
      }

      try {
        // -- Use sql.unsafe for raw DDL (Neon tagged template doesn't support DDL) --
        await sql.unsafe(stmt + ";");
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

    // -- Verify tables after setup --
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
  }
}
