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
  const orgId = guard.session.orgId; // authoritative org from session, not the client
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
    const { entry } = body;
    const orgId = guard.session.orgId;
    if (!orgId || !entry?.action) {
      return NextResponse.json({ error: "Missing org context or action" }, { status: 400 });
    }

    // -- SECURITY: force actor identity from the authenticated session.
    //    Previously we accepted userId/userName/userRole from the request body
    //    verbatim, which let any authenticated user forge audit entries in
    //    someone else's name (or in a fake role like "System" or "Compliance
    //    Bot"). Audit rows must reflect who actually made the request. --
    const sanitizedEntry = {
      action:    String(entry.action),
      detail:    entry.detail   != null ? String(entry.detail) : null,
      level:     ["info", "warning", "error", "critical"].includes(entry.level) ? entry.level : "info",
      metadata:  entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {},
      // Actor fields are ALWAYS from the session, never from the client.
      userId:    guard.session.user?.id || null,
      userName:  guard.session.user?.name || guard.session.user?.email || "unknown",
      userRole:  guard.session.role || "employee",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                  || request.headers.get("x-real-ip")
                  || null,
    };

    const created = await createAuditEntry(orgId, sanitizedEntry);
    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (err) {
    console.error("[API] createAuditEntry error:", err);
    return NextResponse.json({ error: "Failed to create audit entry" }, { status: 500 });
  }
}
