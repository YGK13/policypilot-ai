// ============================================================================
// API: /api/self-service — Employee self-service request CRUD
//
// GET:   List self-service requests for an org (HR view) or user (employee view)
// POST:  Submit a new self-service request (pto | leave | info_update)
// PATCH: HR approves/denies a request
//
// All action types (pto, leave, info_update) go through this single route.
// PTO and leave requests are also mirrored in /api/tickets for HR queue visibility;
// info_update requests are stored here only (no ticket needed — low risk).
// ============================================================================

import { NextResponse } from "next/server";
import {
  createSelfServiceRequest,
  getSelfServiceRequests,
  updateSelfServiceRequest,
  createTicket,
  isDbAvailable,
} from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { genId } from "@/lib/utils";

// ============================================================================
// GET /api/self-service — Fetch requests for an org or user
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  // -- In demo mode, return empty (frontend uses local state) --
  if (!isDbAvailable()) {
    return NextResponse.json({ requests: [], demo: true });
  }

  const url    = new URL(request.url);
  const orgId  = url.searchParams.get("orgId")  || "default";
  const userId = url.searchParams.get("userId");
  const action = url.searchParams.get("action");
  const status = url.searchParams.get("status");
  const limit  = parseInt(url.searchParams.get("limit") || "50");

  try {
    const rows = await getSelfServiceRequests(orgId, { userId, action, status, limit });
    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error("[Self-Service API] GET error:", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/self-service — Submit a new self-service request
//
// Body shape:
//   { orgId, userId, employeeId, action, payload, ticketId? }
//
//   action "pto"         → payload: { type, startDate, endDate, notes }
//   action "leave"       → payload: { leaveType, startDate, estimatedReturn, reason }
//   action "info_update" → payload: { address?, phone?, emergencyName?, emergencyPhone?, fields[] }
//
// For pto/leave, the client has already created a ticket via /api/tickets.
// We accept that ticketId and link it here so HR can cross-reference.
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { orgId, userId, employeeId, action, payload, ticketId, notes } = body;

    if (!action || !["pto", "leave", "info_update"].includes(action)) {
      return NextResponse.json(
        { error: "Missing or invalid action. Must be: pto | leave | info_update" },
        { status: 400 }
      );
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Missing payload object" }, { status: 400 });
    }

    const resolvedOrgId = orgId || "default";

    // -- Validate action-specific required fields --
    if (action === "pto" && (!payload.startDate || !payload.endDate)) {
      return NextResponse.json({ error: "PTO request requires startDate and endDate" }, { status: 400 });
    }
    if (action === "leave" && !payload.startDate) {
      return NextResponse.json({ error: "Leave request requires startDate" }, { status: 400 });
    }
    if (action === "info_update") {
      const hasField = payload.address || payload.phone || payload.emergencyName || payload.emergencyPhone;
      if (!hasField) {
        return NextResponse.json({ error: "info_update requires at least one changed field" }, { status: 400 });
      }
    }

    // -- For PTO/leave: create a mirror ticket in the tickets table if no ticketId provided --
    // (The client usually provides ticketId from its own /api/tickets call;
    //  this fallback ensures DB consistency when the client skips that call.)
    let resolvedTicketId = ticketId || null;

    if (!resolvedTicketId && isDbAvailable() && (action === "pto" || action === "leave")) {
      const generatedId = genId();
      const category    = "Leave & Time Off";
      const riskScore   = action === "leave" ? 35 : 5;
      const routing     = action === "leave" ? "hr" : "auto";

      const queryStr =
        action === "pto"
          ? `PTO Request: ${payload.type || "vacation"} from ${payload.startDate} to ${payload.endDate}`
          : `Leave of Absence: ${(payload.leaveType || "fmla").toUpperCase()} starting ${payload.startDate}`;

      try {
        await createTicket(resolvedOrgId, {
          id:         generatedId,
          userId:     userId || null,
          query:      queryStr,
          category,
          riskScore,
          routing,
          status:     routing === "hr" ? "pending" : "pending",
          priority:   riskScore >= 26 ? "medium" : "low",
          assignee:   routing === "hr" ? "HR Business Partner" : "Manager Approval",
          department: payload.department || null,
          state:      payload.state || null,
          flags:      action === "leave" ? ["LEAVE_REQUEST"] : [],
          resolution: routing === "hr" ? "Pending HR review" : "Awaiting manager approval",
          aiResponse:    null,
          aiConfidence:  null,
          policyId:      null,
        });
        resolvedTicketId = generatedId;
      } catch (ticketErr) {
        // Non-fatal — log but continue creating the self-service record
        console.warn("[Self-Service API] Ticket mirror failed:", ticketErr.message);
      }
    }

    // -- Persist the self-service request --
    const record = await createSelfServiceRequest(resolvedOrgId, {
      userId:     userId     || null,
      employeeId: employeeId || null,
      action,
      status:     "pending",
      payload,
      ticketId:   resolvedTicketId,
      notes:      notes || null,
    });

    return NextResponse.json({ request: record, ticketId: resolvedTicketId });
  } catch (err) {
    console.error("[Self-Service API] POST error:", err);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/self-service — HR reviews a request (approve/deny)
//
// Body: { orgId, requestId, status, reviewedBy, notes }
// status: "approved" | "denied" | "completed"
// ============================================================================
export async function PATCH(request) {
  // -- HR or admin only --
  const guard = await requireRole("hr");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true, message: "No database — update saved locally" });
  }

  try {
    const body = await request.json();
    const { orgId, requestId, status, reviewedBy, notes } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: "Missing requestId or status" }, { status: 400 });
    }
    if (!["approved", "denied", "completed"].includes(status)) {
      return NextResponse.json({ error: "status must be: approved | denied | completed" }, { status: 400 });
    }

    const updated = await updateSelfServiceRequest(orgId || "default", requestId, {
      status,
      reviewedBy: reviewedBy || null,
      notes:      notes || null,
    });

    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: updated });
  } catch (err) {
    console.error("[Self-Service API] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
