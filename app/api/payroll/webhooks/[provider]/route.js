// ============================================================================
// POST /api/payroll/webhooks/[provider]
//
// Public route (registered in proxy.ts). Signature verification is
// enforced BEFORE any DB work. Unverified requests get 401 and no side
// effects.
//
// Design:
//  1. Read the raw body (needed for HMAC verification).
//  2. Ask the provider adapter to verify.
//  3. Look up which org the event is for. Gusto delivers company_uuid; we
//     match it to a payroll_connections row.
//  4. Dedup on (provider, provider_event_id) so a re-delivered event is a
//     202-no-op.
//  5. Ask the adapter for a resync plan and execute it.
//  6. Record success/failure on the webhook event row.
//
// Never 5xx a well-signed event unless we cannot record it — providers will
// re-deliver on any non-2xx and can eventually disable an endpoint that
// keeps failing.
// ============================================================================

import { NextResponse } from "next/server";
import {
  isKnownProvider, loadProvider,
} from "@/lib/payroll";
import {
  getPayrollConnection,
  claimPayrollWebhookEvent,
  markPayrollWebhookProcessed,
} from "@/lib/db";
import { fullSync, resyncEmployee } from "@/lib/payroll/sync";

export async function POST(request, { params }) {
  const providerName = String((await params).provider || "").toLowerCase();
  if (!isKnownProvider(providerName)) {
    return NextResponse.json({ error: `Unknown provider: ${providerName}` }, { status: 404 });
  }

  // -- Step 1: raw body for signature verification --
  const rawBody = await request.text();

  // -- Step 2: verify signature --
  let provider;
  try {
    provider = await loadProvider(providerName);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  // Providers deliver the signature in different headers. Try the common ones.
  const headerSignature =
    request.headers.get("x-gusto-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("signature") ||
    null;

  const verdict = provider.verifyWebhook({ rawBody, headerSignature });
  if (!verdict.ok) {
    console.warn(`[payroll/webhooks/${providerName}] rejected:`, verdict.reason);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // -- Parse body only AFTER signature is verified --
  let evt;
  try { evt = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const providerEventId =
    evt.uuid || evt.event_id || evt.id ||
    (evt.event_type && evt.timestamp ? `${evt.event_type}:${evt.timestamp}` : null);
  const eventType = evt.event_type || evt.type || "unknown";

  if (!providerEventId) {
    // No stable id means we cannot dedup. Log and 200 so the provider does
    // not treat us as broken, but do not process.
    console.warn(`[payroll/webhooks/${providerName}] no dedup id in payload`);
    return NextResponse.json({ received: true, processed: false, reason: "no event id" });
  }

  // -- Step 3: which org owns this event? Prefer explicit company_uuid; fall
  //    back to the resource_uuid path. If we cannot resolve, 202 (accepted
  //    but noop) so the provider stops retrying. --
  const companyUuid =
    evt.company_uuid || evt.data?.company_uuid || evt.resource_uuid || null;
  let orgId = null;
  if (companyUuid) {
    // Look up any connection that has this providerAccountId.
    const { getDb } = await import("@/lib/db");
    const sql = getDb();
    const rows = await sql`
      SELECT org_id FROM payroll_connections
      WHERE provider = ${providerName} AND provider_account_id = ${companyUuid}
      LIMIT 1
    `;
    orgId = rows[0]?.org_id || null;
  }
  if (!orgId) {
    return NextResponse.json({ received: true, processed: false, reason: "unknown org" }, { status: 202 });
  }

  const conn = await getPayrollConnection(orgId, providerName);
  if (!conn || conn.status !== "active") {
    return NextResponse.json({ received: true, processed: false, reason: "connection inactive" }, { status: 202 });
  }

  // -- Step 4: dedup --
  const first = await claimPayrollWebhookEvent(orgId, providerName, providerEventId, eventType);
  if (!first) {
    return NextResponse.json({ received: true, processed: false, reason: "duplicate" });
  }

  // -- Step 5: dispatch --
  try {
    const plan = provider.planFromEvent(evt);
    if (plan.action === "resync_employee" && plan.employeeUuid) {
      await resyncEmployee(orgId, providerName, plan.employeeUuid);
    } else if (plan.action === "resync_paystubs_company" || plan.action === "resync_all") {
      await fullSync(orgId, providerName);
    }
    await markPayrollWebhookProcessed(providerName, providerEventId, "processed");
    return NextResponse.json({ received: true, processed: true });
  } catch (err) {
    console.error(`[payroll/webhooks/${providerName}] processing error:`, err);
    await markPayrollWebhookProcessed(providerName, providerEventId, "error", err.message);
    // 200 so the provider does not retry; the event is recorded and can be
    // replayed manually if needed.
    return NextResponse.json({ received: true, processed: false, error: err.message });
  }
}
