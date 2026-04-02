// ============================================================================
// API: /api/regulatory-reviews — Regulatory update review/implementation tracking
//
// GET:   Fetch all review records for an org (keyed by update_id)
// POST:  Upsert a review: mark as reviewed or implemented
//        Returns the upserted record.
//
// Maps to the regulatory_reviews table in Neon with UNIQUE(org_id, update_id).
// Falls back silently to demo mode when DB is not configured.
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getDb, createAuditEntry } from "@/lib/db";

// ============================================================================
// GET /api/regulatory-reviews?orgId=xxx
// Returns { reviews: [{ update_id, status, reviewer_name, notes, created_at }] }
// ============================================================================
export async function GET(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ reviews: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  try {
    const sql = getDb();
    const reviews = await sql`
      SELECT update_id, status, reviewer_name, notes, affected_policies, created_at
      FROM regulatory_reviews
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("[API] getReviews error:", err);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/regulatory-reviews
// Body: { orgId, updateId, status, reviewerName, notes?, affectedPolicies? }
// ============================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { orgId, updateId, status, reviewerName, notes, affectedPolicies } = body;

    if (!orgId || !updateId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: orgId, updateId, status" },
        { status: 400 }
      );
    }

    if (!isDbAvailable()) {
      return NextResponse.json({ review: { update_id: updateId, status }, demo: true });
    }

    const sql = getDb();
    const result = await sql`
      INSERT INTO regulatory_reviews (org_id, update_id, status, reviewer_name, notes, affected_policies)
      VALUES (
        ${orgId},
        ${updateId},
        ${status},
        ${reviewerName || "Unknown"},
        ${notes || null},
        ${JSON.stringify(affectedPolicies || [])}::jsonb
      )
      ON CONFLICT (org_id, update_id) DO UPDATE SET
        status         = EXCLUDED.status,
        reviewer_name  = EXCLUDED.reviewer_name,
        notes          = COALESCE(EXCLUDED.notes, regulatory_reviews.notes),
        affected_policies = EXCLUDED.affected_policies,
        created_at     = regulatory_reviews.created_at  -- keep original timestamp
      RETURNING *
    `;

    // -- Audit trail --
    const action = status === "implemented" ? "POLICY_IMPLEMENTED" : "POLICY_REVIEWED";
    createAuditEntry(orgId, {
      userName: reviewerName || "Admin",
      userRole: "hr_admin",
      action,
      detail: `${action.replace(/_/g, " ").toLowerCase()}: update ${updateId}${notes ? ` — ${notes}` : ""}`,
      level: status === "implemented" ? "success" : "info",
      metadata: { updateId, status, affectedPolicies },
    }).catch(() => {});

    return NextResponse.json({ review: result[0] }, { status: 201 });
  } catch (err) {
    console.error("[API] upsertReview error:", err);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}
