// ============================================================================
// GET /api/payroll/status
//
// One-shot inventory: for every payroll provider we support, return
//   - name
//   - authModel ('oauth2' | 'api_key')
//   - server-side config: ready y/n, list of missing env vars, provider docs link
//   - per-org connection: exists y/n, last sync at/status/error, connectedBy
//
// Used by the Integrations page to render honest per-provider chips
// (Configure on server / Ready to connect / Connected / Sync failing) and
// by the future Integrations Status admin surface.
// ============================================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { loadProvider } from "@/lib/payroll";
import { getPayrollConnection } from "@/lib/db";

const PAYROLL_PROVIDERS = [
  {
    name: "gusto",
    label: "Gusto",
    docsUrl: "https://docs.gusto.com/embedded-payroll",
    portalUrl: "https://dev.gusto.com/",
    envVarsHint: [
      "GUSTO_CLIENT_ID",
      "GUSTO_CLIENT_SECRET",
      "GUSTO_REDIRECT_URI",
      "GUSTO_WEBHOOK_SECRET",
      "GUSTO_API_ENV (sandbox | production)",
    ],
    redirectUriHint: "https://aihrpilot.com/api/payroll/oauth/gusto",
  },
  {
    name: "bamboohr",
    label: "BambooHR",
    docsUrl: "https://documentation.bamboohr.com/reference",
    portalUrl: "https://www.bamboohr.com/api/",
    envVarsHint: [
      "BAMBOOHR_WEBHOOK_SECRET (only if using webhooks — per-org api key + subdomain are entered in the UI)",
    ],
    redirectUriHint: null,   // API-key auth, no redirect
  },
  {
    name: "qbo",
    label: "QuickBooks Online",
    docsUrl: "https://developer.intuit.com/app/developer/qbo/docs",
    portalUrl: "https://developer.intuit.com/app/developer/dashboard",
    envVarsHint: [
      "INTUIT_CLIENT_ID",
      "INTUIT_CLIENT_SECRET",
      "INTUIT_REDIRECT_URI",
      "INTUIT_WEBHOOK_TOKEN",
      "INTUIT_API_ENV (sandbox | production)",
    ],
    redirectUriHint: "https://aihrpilot.com/api/payroll/oauth/qbo",
  },
  {
    name: "finch",
    label: "Finch",
    docsUrl: "https://developer.tryfinch.com/docs",
    portalUrl: "https://dashboard.tryfinch.com/",
    envVarsHint: [
      "FINCH_CLIENT_ID",
      "FINCH_CLIENT_SECRET",
      "FINCH_REDIRECT_URI",
      "FINCH_WEBHOOK_SECRET",
      "FINCH_API_ENV (sandbox | production)",
    ],
    redirectUriHint: "https://aihrpilot.com/api/payroll/oauth/finch",
  },
];

export async function GET() {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const results = [];
  for (const spec of PAYROLL_PROVIDERS) {
    let config = { ready: false, missing: spec.envVarsHint };
    let connection = null;

    try {
      const provider = await loadProvider(spec.name);
      config = {
        ready: provider.isConfigured(),
        authModel: provider.authModel || "oauth2",
        missing: provider.configStatus().missing || [],
        env: provider.configStatus().env,
      };
    } catch (err) {
      config = { ready: false, error: err.message, missing: spec.envVarsHint };
    }

    try {
      const conn = await getPayrollConnection(guard.session.orgId, spec.name);
      if (conn) {
        connection = {
          status:          conn.status,
          providerAccount: conn.provider_account_id,
          lastSyncAt:      conn.last_sync_at,
          lastSyncStatus:  conn.last_sync_status,
          lastSyncError:   conn.last_sync_error,
          connectedAt:     conn.connected_at,
          tokenExpiresAt:  conn.token_expires_at,
        };
      }
    } catch (err) {
      // -- Non-fatal: report the provider as "config only, connection unknown" --
      connection = { error: err.message };
    }

    results.push({
      name:            spec.name,
      label:           spec.label,
      docsUrl:         spec.docsUrl,
      portalUrl:       spec.portalUrl,
      redirectUriHint: spec.redirectUriHint,
      config,
      connection,
    });
  }

  return NextResponse.json({ providers: results });
}
