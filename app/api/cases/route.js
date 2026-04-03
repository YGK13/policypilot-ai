// ============================================================================
// API: /api/cases — Sensitive HR case management
// GET:  Fetch all cases for an org
// POST: Create a new sensitive case (harassment, investigation, etc.)
// PATCH: Update case status or append a note to the notes timeline
//
// Cases are stored as a separate table from tickets — they carry higher
// confidentiality levels, a full notes timeline (JSONB), and separate
// access controls. Org-scoped, demo-mode aware.
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getCases, createCase, updateCase } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// ============================================================================
// GET /api/cases?orgId=...
// Requires: hr_staff or above (cases are confidential)
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ cases: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  try {
    const rows = await getCases(orgId);
    // -- Parse JSONB columns back to arrays --
    const cases = rows.map((r) => ({
      ...r,
      notes: Array.isArray(r.notes) ? r.notes : JSON.parse(r.notes || "[]"),
      documents: Array.isArray(r.documents) ? r.documents : JSON.parse(r.documents || "[]"),
    }));
    return NextResponse.json({ cases, demo: false });
  } catch (err) {
    console.error("[API] getCases error:", err);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/cases
// Body: { orgId, caseObj }
// Creates a new sensitive case record in Neon
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, caseObj } = body;
    if (!orgId || !caseObj) {
      return NextResponse.json({ error: "Missing orgId or caseObj" }, { status: 400 });
    }

    const saved = await createCase(orgId, caseObj);
    return NextResponse.json({ saved: true, case: saved });
  } catch (err) {
    console.error("[API] createCase error:", err);
    return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/cases
// Body: { orgId, caseId, action: "update_status" | "add_note", status?, notes? }
// Updates case status or replaces the full notes array
// Requires: hr_staff or above
// ============================================================================
export async function PATCH(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, caseId, action, status, notes } = body;
    if (!orgId || !caseId) {
      return NextResponse.json({ error: "Missing orgId or caseId" }, { status: 400 });
    }

    const updates = {};
    if (action === "update_status" && status) updates.status = status;
    if (action === "add_note" && notes) updates.notes = notes;

    const updated = await updateCase(orgId, caseId, updates);
    return NextResponse.json({ saved: true, case: updated });
  } catch (err) {
    console.error("[API] updateCase error:", err);
    return NextResponse.json({ error: "Failed to update case" }, { status: 500 });
  }
}
