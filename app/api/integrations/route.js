// ============================================================================
// API: /api/integrations — Persist integration connection state to Neon
//
// GET:   List all integrations for an org
// POST:  Upsert an integration (connect / disconnect / update config)
// ============================================================================

import { NextResponse } from "next/server";
import { getIntegrations, upsertIntegration, isDbAvailable, createAuditEntry } from "@/lib/db";

// ============================================================================
// GET /api/integrations?orgId=xxx
// ============================================================================
export async function GET(request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  if (!isDbAvailable()) {
    return NextResponse.json({ integrations: [], demo: true });
  }

  try {
    const integrations = await getIntegrations(orgId);
    return NextResponse.json({ integrations });
  } catch (err) {
    console.error("[API] getIntegrations error:", err);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/integrations
// Body: { orgId, connectorId, status, config?, syncFields?, actor? }
// ============================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { orgId, connectorId, status, config, syncFields, actor } = body;

    if (!orgId || !connectorId) {
      return NextResponse.json({ error: "Missing required fields: orgId, connectorId" }, { status: 400 });
    }

    if (!isDbAvailable()) {
      return NextResponse.json({ integration: { connector_id: connectorId, status, config, syncFields }, demo: true });
    }

    const integration = await upsertIntegration(orgId, connectorId, {
      status: status || "pending",
      config: config || {},
      syncFields: syncFields || [],
      lastSyncAt: status === "connected" ? new Date().toISOString() : null,
    });

    // -- Audit trail --
    const action = status === "connected" ? "INTEGRATION_CONNECTED" : status === "disconnected" ? "INTEGRATION_DISCONNECTED" : "INTEGRATION_UPDATED";
    createAuditEntry(orgId, {
      userName: actor || "Admin",
      userRole: "hr_admin",
      action,
      detail: `${action.replace(/_/g, " ").toLowerCase()}: ${connectorId}`,
      level: "info",
    }).catch(() => {});

    return NextResponse.json({ integration });
  } catch (err) {
    console.error("[API] upsertIntegration error:", err);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}
