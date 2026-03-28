// ============================================================================
// API: /api/tickets — CRUD for tickets
// GET: List tickets (with optional status/userId filters)
// POST: Create a new ticket from AI chat
// ============================================================================

import { NextResponse } from "next/server";
import { createTicket, getTickets, isDbAvailable } from "@/lib/db";

export async function GET(request) {
  // -- In demo mode, return empty (frontend uses localStorage) --
  if (!isDbAvailable()) {
    return NextResponse.json({ tickets: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "demo-org";
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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await createTicket(orgId, ticket);
    return NextResponse.json({ ticket: created }, { status: 201 });
  } catch (err) {
    console.error("[API] createTicket error:", err);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
