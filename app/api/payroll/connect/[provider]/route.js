// ============================================================================
// POST /api/payroll/connect/[provider]
//
// Used by API-key providers (BambooHR today; any future SaaS that hands out
// long-lived API keys instead of doing OAuth) to submit credentials, get
// them validated against the provider with a live call, and persist them
// encrypted.
//
// Requires: hr_admin. Scoped to the caller's org from the RBAC session.
//
// Body: { credentials: { apiKey, subdomain, ... } }
//   The exact shape is provider-specific; the route hands it straight to
//   provider.validateCredentials() which knows what it needs.
//
// Response:
//   200 { connected: true, provider, providerAccountId } on success
//   400 { error }                                       on bad body
//   422 { error, reason }                               on validation reject
//   503 { error }                                       if the provider is not
//                                                       an API-key provider
//
// OAuth providers do NOT use this route — they go through
// /api/payroll/oauth/[provider] instead.
// ============================================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { isKnownProvider, loadProvider, encrypt } from "@/lib/payroll";
import { upsertPayrollConnection } from "@/lib/db";

export async function POST(request, { params }) {
  const providerName = String((await params).provider || "").toLowerCase();
  if (!isKnownProvider(providerName)) {
    return NextResponse.json({ error: `Unknown provider: ${providerName}` }, { status: 404 });
  }

  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const provider = await loadProvider(providerName);
  if (provider.authModel !== "api_key" || typeof provider.validateCredentials !== "function") {
    return NextResponse.json({
      error: `${providerName} does not accept API-key connections. Use /api/payroll/oauth/${providerName} instead.`,
    }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  const credentials = body?.credentials || {};

  // -- Ask the provider to hit its own API with these creds. This proves
  //    they work AND surfaces bad-key errors before we persist anything. --
  const verdict = await provider.validateCredentials(credentials);
  if (!verdict.ok) {
    return NextResponse.json({
      error: "Credentials rejected by provider",
      reason: verdict.reason,
    }, { status: 422 });
  }

  // -- Persist. For API-key providers we store the key in access_token_enc
  //    (same column, same encryption) and the tenant id (subdomain for
  //    Bamboo) in provider_account_id. --
  try {
    await upsertPayrollConnection(guard.session.orgId, providerName, {
      accessTokenEnc:    encrypt(credentials.apiKey || credentials.token || ""),
      refreshTokenEnc:   null,
      tokenExpiresAt:    null,             // API keys do not expire on Bamboo
      providerAccountId: verdict.providerAccountId || credentials.subdomain || null,
      status:            "active",
      connectedByUserId: guard.session.user?.id || null,
    });
  } catch (err) {
    console.error(`[payroll/connect/${providerName}] persist error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({
    connected: true,
    provider: providerName,
    providerAccountId: verdict.providerAccountId || null,
  });
}
