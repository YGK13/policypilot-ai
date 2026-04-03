// ============================================================================
// API: /api/audit — Audit log endpoints
// GET: List audit entries for an org
// POST: Create a new audit entry
// ============================================================================

import { NextResponse } from "next/server";
import { createAuditEntry, getAuditLog, isDbAvailable } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

export async function GET(request) {
  // Audit log read is restricted to hr_staff and above (sensitive compliance data)
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ entries: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "demo-org";
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const entries = await getAuditLog(orgId, { limit, offset });
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[API] getAuditLog error:", err);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}

export async function POST(request) {
  // Any authenticated user can create audit entries (employees log their own actions)
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, entry } = body;
    if (!orgId || !entry?.action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await createAuditEntry(orgId, entry);
    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (err) {
    console.error("[API] createAuditEntry error:", err);
    return NextResponse.json({ error: "Failed to create audit entry" }, { status: 500 });
  }
}
