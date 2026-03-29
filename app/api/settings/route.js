// ============================================================================
// API: /api/settings — Org settings persistence
// GET:  Fetch settings for an org from Neon organizations.settings JSONB column
// PATCH: Update settings for an org
//
// Settings are stored as a JSONB blob in the organizations table.
// This allows settings to be shared across all users in the same org.
// Falls back to demo mode when DB is not configured.
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";

export async function GET(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ settings: null, demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  try {
    const sql = getDb();
    const result = await sql`
      SELECT settings FROM organizations WHERE id = ${orgId} OR slug = ${orgId} LIMIT 1
    `;
    if (result.length === 0) {
      return NextResponse.json({ settings: null, notFound: true });
    }
    return NextResponse.json({ settings: result[0].settings || {} });
  } catch (err) {
    console.error("[API] getSettings error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, settings } = body;
    if (!orgId || !settings) {
      return NextResponse.json({ error: "Missing orgId or settings" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      UPDATE organizations
      SET settings = ${JSON.stringify(settings)}::jsonb, updated_at = NOW()
      WHERE id = ${orgId} OR slug = ${orgId}
    `;

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error("[API] updateSettings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
