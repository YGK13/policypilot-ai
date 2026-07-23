// ============================================================================
// GET /api/analytics/export?section=X&days=Y
//
// Returns text/csv attachments for the analytics page's Download buttons.
// Every section reuses the same DB helpers the analytics page reads, so
// the CSV always matches what's on screen.
//
// Supported sections:
//   roi                -- ROI summary + savings
//   adoption           -- WAU/MAU + eligible reach + P50/P95 TTFA
//   adoption-by-role   -- per-role active users + ticket volume
//   answer-quality     -- citation coverage + rating + confidence buckets
//   escalation-reasons -- escalation reason buckets w/ counts
//   heatmap            -- state x category unanswered counts (compliance)
//   categories         -- category breakdown
//   states             -- state breakdown
//   routing            -- routing breakdown
// ============================================================================

import { NextResponse } from "next/server";
import {
  getRoiSummary, getAdoptionSummary, getAdoptionByRole, getAnswerQualitySummary,
  getEscalationReasons, getComplianceHeatmap,
  getTicketsByCategory, getTicketsByState, getTicketsByRouting,
  isDbAvailable,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// -- Duplicated from ../route.js so this file has no import cycle with it. --
function parseDays(raw) {
  const v = String(raw || "30").toLowerCase();
  const now = new Date();
  if (v === "qtd") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return Math.max(1, Math.ceil((now - new Date(now.getFullYear(), qStartMonth, 1)) / 86_400_000));
  }
  if (v === "ytd") {
    return Math.max(1, Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / 86_400_000));
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

// -- Minimal, RFC-4180-safe CSV escaping. Wraps in double-quotes if the
//    value contains a comma, quote, or newline; doubles internal quotes. --
function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvRow(cols) { return cols.map(csvCell).join(","); }
function toCsv(header, rows) {
  return [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}
function csvResponse(filename, body) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const section = String(url.searchParams.get("section") || "").toLowerCase();
  const days    = parseDays(url.searchParams.get("days"));
  const orgId   = guard.session.orgId;
  const stamp   = new Date().toISOString().slice(0, 10);

  try {
    switch (section) {
      case "roi": {
        const r = (await getRoiSummary(orgId, days)) || {};
        return csvResponse(
          `roi_${days}d_${stamp}.csv`,
          toCsv(
            ["metric", "value"],
            [
              ["window_days",       days],
              ["total_tickets",     r.total || 0],
              ["auto_resolved",     r.auto_resolved || 0],
              ["escalated_to_human", r.escalated_to_human || 0],
              ["minutes_saved",     r.minutes_saved || 0],
              ["dollars_avoided",   r.dollars_avoided || 0],
            ]
          )
        );
      }

      case "adoption": {
        const a = (await getAdoptionSummary(orgId, days)) || {};
        return csvResponse(
          `adoption_${days}d_${stamp}.csv`,
          toCsv(
            ["metric", "value"],
            [
              ["wau",           a.wau || 0],
              ["mau",           a.mau || 0],
              ["eligible",      a.eligible || 0],
              ["ttfa_p50_secs", a.ttfa_p50_secs || 0],
              ["ttfa_p95_secs", a.ttfa_p95_secs || 0],
            ]
          )
        );
      }

      case "adoption-by-role": {
        const rows = await getAdoptionByRole(orgId, days);
        return csvResponse(
          `adoption_by_role_${days}d_${stamp}.csv`,
          toCsv(
            ["role", "active_users", "tickets"],
            (rows || []).map((r) => [r.role, r.active_users, r.tickets])
          )
        );
      }

      case "answer-quality": {
        const a = (await getAnswerQualitySummary(orgId, days)) || {};
        return csvResponse(
          `answer_quality_${days}d_${stamp}.csv`,
          toCsv(
            ["metric", "value"],
            [
              ["answered",         a.answered || 0],
              ["cited",            a.cited || 0],
              ["rated",            a.rated || 0],
              ["thumbs_down",      a.thumbs_down || 0],
              ["confidence_high",  a.conf_high || 0],
              ["confidence_mid",   a.conf_mid || 0],
              ["confidence_low",   a.conf_low || 0],
              ["confidence_avg",   a.conf_avg || 0],
            ]
          )
        );
      }

      case "escalation-reasons": {
        const rows = await getEscalationReasons(orgId, days);
        return csvResponse(
          `escalation_reasons_${days}d_${stamp}.csv`,
          toCsv(
            ["reason", "count"],
            (rows || []).map((r) => [r.reason, r.count])
          )
        );
      }

      case "heatmap": {
        const rows = await getComplianceHeatmap(orgId, days);
        return csvResponse(
          `compliance_heatmap_${days}d_${stamp}.csv`,
          toCsv(
            ["state", "category", "unanswered"],
            (rows || []).map((r) => [r.state, r.category, r.unanswered])
          )
        );
      }

      case "categories": {
        const rows = await getTicketsByCategory(orgId, days);
        return csvResponse(
          `categories_${days}d_${stamp}.csv`,
          toCsv(
            ["category", "count"],
            (rows || []).map((r) => [r.category, r.count])
          )
        );
      }

      case "states": {
        const rows = await getTicketsByState(orgId, days);
        return csvResponse(
          `states_${days}d_${stamp}.csv`,
          toCsv(
            ["state", "count"],
            (rows || []).map((r) => [r.state, r.count])
          )
        );
      }

      case "routing": {
        const rows = await getTicketsByRouting(orgId, days);
        return csvResponse(
          `routing_${days}d_${stamp}.csv`,
          toCsv(
            ["routing", "count"],
            (rows || []).map((r) => [r.routing, r.count])
          )
        );
      }

      default:
        return NextResponse.json({
          error: `Unknown section: ${section}`,
          supported: [
            "roi", "adoption", "adoption-by-role", "answer-quality",
            "escalation-reasons", "heatmap", "categories", "states", "routing",
          ],
        }, { status: 400 });
    }
  } catch (err) {
    console.error(`[analytics/export/${section}] error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
