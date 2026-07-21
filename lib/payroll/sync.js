// ============================================================================
// lib/payroll/sync.js — Provider-agnostic orchestration for a full sync
//
// Called from:
//   - POST /api/payroll/sync?provider=gusto (manual trigger)
//   - The webhook receiver, after signature verification, using the plan
//     returned by provider.planFromEvent()
//
// Contract: throws on unrecoverable errors so the caller can 5xx cleanly.
// Records last_sync_status on the connection row on success + failure.
// ============================================================================

import {
  getPayrollConnection,
  upsertPayrollConnection,
  upsertPayrollEmployee,
  upsertPayrollPaystub,
  upsertPayrollPtoBalance,
  findPayrollEmployeeDbId,
  markPayrollSync,
} from "@/lib/db";
import { loadProvider, encrypt, decrypt } from "./index.js";

// -- Build the auth object we hand to the provider adapter. Includes an
//    onRefresh callback so provider-side token rotation is persisted back
//    to the payroll_connections row. --
function makeAuth(orgId, providerName, conn) {
  return {
    accessToken:  decrypt(conn.access_token_enc),
    refreshToken: conn.refresh_token_enc ? decrypt(conn.refresh_token_enc) : null,
    async onRefresh(refreshed) {
      await upsertPayrollConnection(orgId, providerName, {
        accessTokenEnc:  encrypt(refreshed.accessToken),
        refreshTokenEnc: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : null,
        tokenExpiresAt:  refreshed.expiresAt,
        scope:           refreshed.scope,
        status:          "active",
      });
    },
  };
}

// -- Full sync: employees + last-N paystubs each + PTO balances each. --
export async function fullSync(orgId, providerName) {
  const provider = await loadProvider(providerName);
  const conn = await getPayrollConnection(orgId, providerName);
  if (!conn) throw new Error(`No ${providerName} connection for org ${orgId}`);

  const auth = makeAuth(orgId, providerName, conn);
  let stats = { employees: 0, paystubs: 0, ptoBalances: 0, errors: [] };

  try {
    // -- Discover the company id (needed for the employees list) --
    let companyId = conn.provider_account_id;
    if (!companyId) {
      const discovered = await provider.discoverAccount(auth);
      companyId = discovered.providerAccountId;
      if (companyId) {
        await upsertPayrollConnection(orgId, providerName, {
          providerAccountId: companyId,
          accessTokenEnc:  conn.access_token_enc,        // keep existing tokens; they were not rotated here
          refreshTokenEnc: conn.refresh_token_enc,
          tokenExpiresAt:  conn.token_expires_at,
          webhookSecretEnc: conn.webhook_secret_enc,
          status:          "active",
        });
      }
    }
    if (!companyId) throw new Error(`${providerName}: could not discover companyId`);

    // -- Employees --
    const employees = await provider.fetchEmployees(auth, { companyId });
    for (const e of employees) {
      const dbId = await upsertPayrollEmployee(orgId, providerName, e);
      stats.employees++;

      // -- Per-employee paystubs (best-effort; one employee's failure does
      //    not abort the whole sync). --
      try {
        const paystubs = await provider.fetchPaystubs(auth, { employeeUuid: e.providerEmployeeId, limit: 6 });
        for (const p of paystubs) {
          await upsertPayrollPaystub(orgId, providerName, dbId, p);
          stats.paystubs++;
        }
      } catch (err) {
        stats.errors.push({ scope: "paystubs", employee: e.providerEmployeeId, error: err.message });
      }

      // -- Per-employee PTO balances --
      try {
        const balances = await provider.fetchPtoBalances(auth, { employeeUuid: e.providerEmployeeId });
        for (const b of balances) {
          await upsertPayrollPtoBalance(orgId, dbId, { ...b, provider: providerName });
          stats.ptoBalances++;
        }
      } catch (err) {
        stats.errors.push({ scope: "pto", employee: e.providerEmployeeId, error: err.message });
      }
    }

    const status = stats.errors.length === 0 ? "ok" : "partial";
    await markPayrollSync(orgId, providerName, status, stats.errors.length ? JSON.stringify(stats.errors).slice(0, 500) : null);
    return { ok: true, status, stats };
  } catch (err) {
    await markPayrollSync(orgId, providerName, "error", err.message);
    throw err;
  }
}

// -- Targeted resync of one employee, called from the webhook path when an
//    employees.* event arrives. --
export async function resyncEmployee(orgId, providerName, providerEmployeeId) {
  const provider = await loadProvider(providerName);
  const conn = await getPayrollConnection(orgId, providerName);
  if (!conn) throw new Error(`No ${providerName} connection for org ${orgId}`);

  const auth = makeAuth(orgId, providerName, conn);
  // Employees list is our source of truth — pull it fresh and pick the one row.
  const employees = await provider.fetchEmployees(auth, { companyId: conn.provider_account_id });
  const target = employees.find((e) => String(e.providerEmployeeId) === String(providerEmployeeId));
  if (!target) return { ok: false, reason: "employee not found in provider response" };

  const dbId = await upsertPayrollEmployee(orgId, providerName, target);
  const paystubs = await provider.fetchPaystubs(auth, { employeeUuid: providerEmployeeId, limit: 6 });
  for (const p of paystubs) await upsertPayrollPaystub(orgId, providerName, dbId, p);
  const balances = await provider.fetchPtoBalances(auth, { employeeUuid: providerEmployeeId });
  for (const b of balances) await upsertPayrollPtoBalance(orgId, dbId, { ...b, provider: providerName });

  return { ok: true, employee: providerEmployeeId, paystubs: paystubs.length, ptoBalances: balances.length };
}
