// ============================================================================
// POST /api/payroll/sync?provider=gusto
//
// Manual trigger for a full payroll sync. Requires hr_admin. Scoped to the
// caller's org (never trust a body-supplied orgId).
//
// Also serves GET /api/payroll/sync?provider=gusto which returns the
// current connection status (last sync, config readiness, etc.) so the UI
// can render a "Last synced X ago" badge without touching provider APIs.
// ============================================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { isKnownProvider, loadProvider } from "@/lib/payroll";
import { getPayrollConnection, deletePayrollData } from "@/lib/db";
import { fullSync } from "@/lib/payroll/sync";

function parseProvider(request) {
  const url = new URL(request.url);
  const name = String(url.searchParams.get("provider") || "").toLowerCase();
  return name;
}

export async function GET(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const name = parseProvider(request);
  if (!isKnownProvider(name)) {
    return NextResponse.json({ error: `Unknown provider: ${name}` }, { status: 400 });
  }

  const provider = await loadProvider(name);
  const conn = await getPayrollConnection(guard.session.orgId, name);
  return NextResponse.json({
    provider: name,
    config: provider.configStatus(),
    connection: conn ? {
      status:           conn.status,
      lastSyncAt:       conn.last_sync_at,
      lastSyncStatus:   conn.last_sync_status,
      lastSyncError:    conn.last_sync_error,
      providerAccount:  conn.provider_account_id,
      connectedAt:      conn.connected_at,
      tokenExpiresAt:   conn.token_expires_at,
    } : null,
  });
}

export async function POST(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const name = parseProvider(request);
  if (!isKnownProvider(name)) {
    return NextResponse.json({ error: `Unknown provider: ${name}` }, { status: 400 });
  }

  const provider = await loadProvider(name);
  if (!provider.isConfigured()) {
    return NextResponse.json({
      error: `${name} is not configured on the server`,
      missing: provider.configStatus().missing,
    }, { status: 503 });
  }

  try {
    const result = await fullSync(guard.session.orgId, name);
    return NextResponse.json(result);
  } catch (err) {
    console.error(`[payroll/sync/${name}] error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const name = parseProvider(request);
  if (!isKnownProvider(name)) {
    return NextResponse.json({ error: `Unknown provider: ${name}` }, { status: 400 });
  }

  // -- Full teardown: wipe all payroll_* rows for (org, provider) and drop
  //    the connection. Runs the spec's "disconnect wipes payroll data within
  //    1 minute" promise, synchronously. --
  try {
    await deletePayrollData(guard.session.orgId, name);
    return NextResponse.json({ ok: true, deleted: true, provider: name });
  } catch (err) {
    console.error(`[payroll/sync/${name}] delete error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
