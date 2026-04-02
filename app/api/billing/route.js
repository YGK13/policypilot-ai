// ============================================================================
// API: /api/billing — Org subscription/plan endpoints
//
// GET: Fetch current org plan from Neon organizations table
//      Returns { plan, planName, updatedAt }
//      Falls back to { plan: "starter", demo: true } if DB not configured
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";

// -- Map DB plan slugs to display names --
const PLAN_NAMES = {
  starter:      "Starter",
  professional: "Professional",
  enterprise:   "Enterprise",
};

export async function GET(request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  if (!isDbAvailable()) {
    return NextResponse.json({ plan: "starter", planName: "Starter", demo: true });
  }

  try {
    const sql = getDb();
    const result = await sql`
      SELECT plan, updated_at
      FROM organizations
      WHERE id = ${orgId} OR slug = ${orgId}
      LIMIT 1
    `;
    if (!result.length) {
      return NextResponse.json({ plan: "starter", planName: "Starter", notFound: true });
    }
    const { plan, updated_at } = result[0];
    return NextResponse.json({
      plan: plan || "starter",
      planName: PLAN_NAMES[plan] || "Starter",
      updatedAt: updated_at,
    });
  } catch (err) {
    console.error("[API] getBilling error:", err);
    return NextResponse.json({ plan: "starter", planName: "Starter", error: err.message });
  }
}
