// ============================================================================
// API: /api/analytics — Dashboard statistics
// GET: Returns ticket stats, category breakdown, state distribution
// ============================================================================

import { NextResponse } from "next/server";
import {
  getTicketStats, getTicketsByCategory, getTicketsByState, getTicketsByRouting, getTicketsByRisk,
  getRoiSummary, getAdoptionSummary, getAdoptionByRole, getAnswerQualitySummary,
  getEscalationReasons, getComplianceHeatmap,
  isDbAvailable,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// -- Parse a days value that may be a positive integer OR one of the
//    calendar aliases 'qtd' / 'ytd'. Returns a numeric days count. --
function parseDays(raw) {
  const v = String(raw || "30").toLowerCase();
  const now = new Date();
  if (v === "qtd") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const qStart = new Date(now.getFullYear(), qStartMonth, 1);
    return Math.max(1, Math.ceil((now - qStart) / (24 * 60 * 60 * 1000)));
  }
  if (v === "ytd") {
    const yStart = new Date(now.getFullYear(), 0, 1);
    return Math.max(1, Math.ceil((now - yStart) / (24 * 60 * 60 * 1000)));
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export async function GET(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true, stats: null });
  }

  const url = new URL(request.url);
  const orgId = guard.session.orgId; // authoritative org from session, not the client
  const days = parseDays(url.searchParams.get("days"));

  try {
    // -- Fanning out in parallel so a heavier per-role or heatmap query
    //    does not serialize with the small stat lookups. --
    const [
      stats, byCategory, byState, byRouting, byRisk,
      roi, adoption, adoptionByRole, answerQuality,
      escalationReasons, heatmap,
    ] = await Promise.all([
      getTicketStats(orgId, days),
      getTicketsByCategory(orgId, days),
      getTicketsByState(orgId, days),
      getTicketsByRouting(orgId, days),
      getTicketsByRisk(orgId, days),
      getRoiSummary(orgId, days),
      getAdoptionSummary(orgId, days),
      getAdoptionByRole(orgId, days),
      getAnswerQualitySummary(orgId, days),
      getEscalationReasons(orgId, days),
      getComplianceHeatmap(orgId, days),
    ]);

    return NextResponse.json({
      days,
      stats,
      byCategory, byState, byRouting,
      byRisk: byRisk[0] || null,
      roi, adoption, adoptionByRole, answerQuality,
      escalationReasons, heatmap,
    });
  } catch (err) {
    console.error("[API] analytics error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
