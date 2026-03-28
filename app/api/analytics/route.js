// ============================================================================
// API: /api/analytics — Dashboard statistics
// GET: Returns ticket stats, category breakdown, state distribution
// ============================================================================

import { NextResponse } from "next/server";
import { getTicketStats, getTicketsByCategory, getTicketsByState, isDbAvailable } from "@/lib/db";

export async function GET(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true, stats: null });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "demo-org";
  const days = parseInt(url.searchParams.get("days") || "30");

  try {
    const [stats, byCategory, byState] = await Promise.all([
      getTicketStats(orgId, days),
      getTicketsByCategory(orgId, days),
      getTicketsByState(orgId, days),
    ]);

    return NextResponse.json({ stats, byCategory, byState });
  } catch (err) {
    console.error("[API] analytics error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
