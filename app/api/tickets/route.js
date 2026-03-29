// ============================================================================
// API: /api/tickets — CRUD for tickets
// GET:   List tickets (with optional status/userId filters)
// POST:  Create a new ticket from AI chat
// PATCH: Update ticket status, resolution, or satisfaction rating
// ============================================================================

import { NextResponse } from "next/server";
import {
  createTicket, getTickets, updateTicketStatus,
  updateTicketSatisfaction, isDbAvailable
} from "@/lib/db";

export async function GET(request) {
  // -- In demo mode, return empty (frontend uses localStorage) --
  if (!isDbAvailable()) {
    return NextResponse.json({ tickets: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";
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
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true, message: "Demo mode — ticket stored in localStorage" });
  }

  try {
    const body = await request.json();
    const { orgId, ticket } = body;
    if (!orgId || !ticket?.id || !ticket?.query) {
      return NextResponse.json({ error: "Missing required fields: orgId, ticket.id, ticket.query" }, { status: 400 });
    }

    const created = await createTicket(orgId, ticket);
    return NextResponse.json({ ticket: created }, { status: 201 });
  } catch (err) {
    console.error("[API] createTicket error:", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, ticketId, action, status, resolution, satisfaction } = body;

    if (!orgId || !ticketId || !action) {
      return NextResponse.json({ error: "Missing required fields: orgId, ticketId, action" }, { status: 400 });
    }

    if (action === "update_status") {
      if (!status) {
        return NextResponse.json({ error: "Missing status field" }, { status: 400 });
      }
      const updated = await updateTicketStatus(orgId, ticketId, status, resolution || null);
      return NextResponse.json({ ticket: updated });
    }

    if (action === "rate") {
      if (satisfaction == null) {
        return NextResponse.json({ error: "Missing satisfaction field" }, { status: 400 });
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
