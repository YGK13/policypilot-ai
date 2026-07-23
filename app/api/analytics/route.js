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

  // -- Per-section try/catch instead of Promise.all so ONE failing query
  //    (e.g. a missing column when the operator has not re-run /api/setup
  //    after a schema delta) does not blank the entire analytics page.
  //    Each section returns null on failure and its error surfaces in the
  //    `sectionErrors` map so we can debug from the network tab. --
  const sectionErrors = {};
  async function safe(name, fn) {
    try { return await fn(); }
    catch (err) {
      console.error(`[analytics] ${name} failed:`, err.message);
      sectionErrors[name] = err.message;
      return null;
    }
  }

  const [
    stats, byCategory, byState, byRouting, byRisk,
    roi, adoption, adoptionByRole, answerQuality,
    escalationReasons, heatmap,
  ] = await Promise.all([
    safe("stats",              () => getTicketStats(orgId, days)),
    safe("byCategory",         () => getTicketsByCategory(orgId, days)),
    safe("byState",            () => getTicketsByState(orgId, days)),
    safe("byRouting",          () => getTicketsByRouting(orgId, days)),
    safe("byRisk",             () => getTicketsByRisk(orgId, days)),
    safe("roi",                () => getRoiSummary(orgId, days)),
    safe("adoption",           () => getAdoptionSummary(orgId, days)),
    safe("adoptionByRole",     () => getAdoptionByRole(orgId, days)),
    safe("answerQuality",      () => getAnswerQualitySummary(orgId, days)),
    safe("escalationReasons",  () => getEscalationReasons(orgId, days)),
    safe("heatmap",            () => getComplianceHeatmap(orgId, days)),
  ]);

  return NextResponse.json({
    days,
    stats,
    byCategory: byCategory || [],
    byState:    byState    || [],
    byRouting:  byRouting  || [],
    byRisk:     Array.isArray(byRisk) ? (byRisk[0] || null) : null,
    roi, adoption, adoptionByRole, answerQuality,
    escalationReasons: escalationReasons || [],
    heatmap:           heatmap           || [],
    sectionErrors,  // present so the frontend + curl can see which sections failed and why
  });
}
