// ============================================================================
// API: /api/tickets — CRUD for tickets
// GET:   List tickets (with optional status/userId filters)
// POST:  Create a new ticket from AI chat
// PATCH: Update ticket status, resolution, or satisfaction rating
// ============================================================================

import { NextResponse } from "next/server";
import {
  createTicket, getTickets, updateTicketStatus,
  updateTicketSatisfaction, getTicketById, isDbAvailable, getOrgSettings
} from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { sendEscalationEmail } from "@/lib/email";

export async function GET(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  // -- In demo mode, return empty (frontend uses localStorage) --
  if (!isDbAvailable()) {
    return NextResponse.json({ tickets: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = guard.session.orgId; // authoritative org from session, not the client
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("userId");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const tickets = await getTickets(orgId, { status, userId, limit, offset });
    return NextResponse.json({ tickets });
  } catch (err) {
    console.error("[API] getTickets error:", err);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true, message: "Demo mode — ticket stored in localStorage" });
  }

  try {
    const body = await request.json();
    const { ticket } = body;
    const orgId = guard.session.orgId;
    if (!orgId || !ticket?.id || !ticket?.query) {
      return NextResponse.json({ error: "Missing org context, ticket.id, or ticket.query" }, { status: 400 });
    }

    const created = await createTicket(orgId, ticket);

    // -- Fire-and-forget escalation email when routing is hr or legal.
    //    Direct internal call (not an HTTP hop to a public route) so there is
    //    no unauthenticated email-send surface. --
    const shouldNotify = ticket.routing === "hr" || ticket.routing === "legal";
    if (shouldNotify && process.env.RESEND_API_KEY) {
      getOrgSettings(orgId).then((settings) => {
        if (!settings.emailEnabled || !settings.supportEmail) return;
        return sendEscalationEmail({
          ticket,
          toEmail: settings.supportEmail,
          companyName: settings.companyName,
          supportEmail: settings.supportEmail,
        });
      }).catch((err) => console.warn("[API] escalation email failed:", err.message));
    }

    return NextResponse.json({ ticket: created }, { status: 201 });
  } catch (err) {
    console.error("[API] createTicket error:", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

export async function PATCH(request) {
  // Parse body first to determine action, then enforce the correct role:
  // - "update_status" (set resolved/escalated/pending + resolution note) → hr_staff only
  // - "rate" (employee satisfaction rating on their own ticket)         → any employee
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { ticketId, action, status, resolution, satisfaction } = body;

    if (!ticketId || !action) {
      return NextResponse.json({ error: "Missing required fields: ticketId, action" }, { status: 400 });
    }

    if (action === "update_status") {
      // -- Status changes are privileged: hr_staff or above --
      const guard = await requireRole("hr_staff");
      if (guard.error) return guard.error;
      const orgId = guard.session.orgId; // authoritative org, not client-supplied

      if (!status) {
        return NextResponse.json({ error: "Missing status field" }, { status: 400 });
      }
      const updated = await updateTicketStatus(orgId, ticketId, status, resolution || null);
      return NextResponse.json({ ticket: updated });
    }

    if (action === "rate") {
      // -- Rating is self-service: any authenticated user CAN rate, but only
      //    the ticket owner (or hr_staff+) can rate a specific ticket.
      //    Previously we let any employee rate any ticket in their org, which
      //    poisons the answer-quality metric and enables retaliation ratings
      //    across departments. --
      const guard = await requireRole("employee");
      if (guard.error) return guard.error;
      const orgId = guard.session.orgId;

      if (satisfaction == null) {
        return NextResponse.json({ error: "Missing satisfaction field" }, { status: 400 });
      }

      const existing = await getTicketById(orgId, ticketId);
      if (!existing) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      const isPrivileged = ["hr_staff", "legal", "hr_admin"].includes(guard.session.role);
      const isOwner      = existing.user_id && existing.user_id === guard.session.user?.id;
      if (!isPrivileged && !isOwner) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const updated = await updateTicketSatisfaction(orgId, ticketId, satisfaction);
      return NextResponse.json({ ticket: updated });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("[API] PATCH ticket error:", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
