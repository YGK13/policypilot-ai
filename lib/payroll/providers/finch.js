// ============================================================================
// lib/payroll/providers/finch.js — Finch unified employment API adapter
//
// Read-only. One-way. Per-org.
//
// Docs: https://developer.tryfinch.com/docs (Finch Connect + Data API)
//
// Why Finch is in the pilot plan (see PAYROLL_INTEGRATIONS_SPEC_2026_07.md):
//   ADP Marketplace, Paychex direct, Paylocity direct, UKG direct are all
//   3-9 month partner programs that require SOC 2 Type II. Not viable
//   pre-pilot. Finch fronts all of them (plus ~25 more providers) behind
//   one OAuth flow and one normalized API. One integration on our side,
//   enterprise-provider coverage on the customer side, no per-provider
//   partner reviews.
//
// What we do NOT do here:
//   Write to any underlying provider (Finch offers "assisted" and
//   "automated" write connections; we never enable them).
//   Read SSN, bank routing, tax IDs. scrubRaw() strips these defensively.
//
// Env vars this module reads:
//   FINCH_CLIENT_ID           -- from your app in Finch's developer portal
//   FINCH_CLIENT_SECRET       -- ditto
//   FINCH_WEBHOOK_SECRET      -- signing secret for webhook events
//   FINCH_REDIRECT_URI        -- must exactly match the registered redirect,
//                                e.g. https://aihrpilot.com/api/payroll/oauth/finch
//   FINCH_API_ENV             -- 'sandbox' (default) | 'production'
//
// One product note that shapes the code below: Finch's normalized "provider"
// dimension means one Finch connection maps to ONE underlying provider
// (e.g. ADP). Customers pick the underlying provider inside the Finch
// Connect flow; our code stays agnostic.
// ============================================================================

import crypto from "node:crypto";
import { fetchWithRetry, toIsoDate, toNumber, pickState, scrubRaw } from "../index.js";

const AUTH_HOST = "https://connect.tryfinch.com";
const API_HOST  = "https://api.tryfinch.com";

// ============================================================================
// Config surface
// ============================================================================

export function isConfigured() {
  return !!(process.env.FINCH_CLIENT_ID && process.env.FINCH_CLIENT_SECRET);
}

export function configStatus() {
  return {
    provider: "finch",
    ready: isConfigured(),
    env: process.env.FINCH_API_ENV || "sandbox",
    authModel: "oauth2",
    missing: [
      !process.env.FINCH_CLIENT_ID     && "FINCH_CLIENT_ID",
      !process.env.FINCH_CLIENT_SECRET && "FINCH_CLIENT_SECRET",
      !process.env.FINCH_REDIRECT_URI  && "FINCH_REDIRECT_URI",
      !process.env.FINCH_WEBHOOK_SECRET && "FINCH_WEBHOOK_SECRET",
    ].filter(Boolean),
  };
}

// ============================================================================
// OAuth 2.0 via Finch Connect
// ============================================================================

// -- Finch Connect scopes: minimum viable for our HR context use case.
//    We ask for company, directory, individual, employment, pay statements,
//    and benefits. NO write scopes. --
const SCOPES = [
  "company",
  "directory",
  "individual",
  "employment",
  "pay_statement",
  "benefits",
].join(" ");

// -- Finch Connect optionally accepts `products` (equivalent to scopes) as
//    URL params to gate the picker to what we actually need. --
export function buildAuthorizeUrl({ state }) {
  if (!isConfigured()) throw new Error("Finch not configured");
  const params = new URLSearchParams({
    client_id:     process.env.FINCH_CLIENT_ID,
    redirect_uri:  process.env.FINCH_REDIRECT_URI,
    response_type: "code",
    products:      SCOPES,
    state:         String(state),
    sandbox:       (process.env.FINCH_API_ENV !== "production") ? "true" : "false",
  });
  return `${AUTH_HOST}/authorize?${params.toString()}`;
}

// -- Exchange auth code for access token. Finch tokens do NOT expire
//    (per their docs) and there is no refresh token — the access token
//    is the long-lived credential. That means we set expiresAt=null and
//    the sync engine never triggers a refresh. --
export async function exchangeCode(code) {
  if (!isConfigured()) throw new Error("Finch not configured");
  const res = await fetchWithRetry(`${API_HOST}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id:     process.env.FINCH_CLIENT_ID,
      client_secret: process.env.FINCH_CLIENT_SECRET,
      code,
      redirect_uri:  process.env.FINCH_REDIRECT_URI,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Finch token exchange failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: null,          // Finch does not use refresh tokens
    expiresAt:    null,
    scope:        data.scope || null,
    tokenType:    data.token_type || "Bearer",
  };
}

// -- Present but unused. Kept so the shared orchestrator sees the same
//    surface across providers. --
export async function refreshAccessToken() {
  throw new Error("Finch tokens do not refresh; reconnect via OAuth if revoked");
}

// ============================================================================
// Authenticated API calls
// ============================================================================

async function apiCall(method, path, { accessToken }, body = null) {
  const res = await fetchWithRetry(`${API_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Finch-API-Version": "2020-09-17",     // pin the API version, avoid silent field shifts
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new Error("finch_auth_revoked");
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Finch ${method} ${path} failed: ${res.status} ${errBody.slice(0, 200)}`);
  }
  return res.json();
}

// ============================================================================
// Core sync methods
// ============================================================================

// -- Finch's /introspect endpoint tells us which underlying provider the
//    customer picked, plus payroll_provider_id and company_id. We store
//    payroll_provider_id as providerAccountId so we can display "Connected
//    via Finch: ADP" in the UI. --
export async function discoverAccount(auth) {
  const info = await apiCall("GET", "/introspect", auth);
  return {
    providerAccountId: info?.payroll_provider_id || info?.company_id || null,
    raw: scrubRaw(info),
  };
}

// -- Directory returns a light employee list. Individual + employment give
//    us full detail. --
export async function fetchEmployees(auth) {
  const dir = await apiCall("GET", "/employer/directory", auth);
  const stubs = Array.isArray(dir?.individuals) ? dir.individuals : [];
  const ids = stubs.map((s) => s.id).filter(Boolean);
  if (ids.length === 0) return [];

  // -- Finch's individual + employment endpoints accept batches of ids in
  //    a POST body. Chunk to stay inside their per-request cap. --
  const CHUNK = 100;
  const individuals = [];
  const employments = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const requests = ids.slice(i, i + CHUNK).map((id) => ({ individual_id: id }));
    const [indBatch, empBatch] = await Promise.all([
      apiCall("POST", "/employer/individual", auth, { requests }),
      apiCall("POST", "/employer/employment", auth, { requests }),
    ]);
    for (const r of indBatch?.responses || []) if (r?.body) individuals.push(r.body);
    for (const r of empBatch?.responses || []) if (r?.body) employments.push(r.body);
  }

  const empById = new Map(employments.map((e) => [e.id, e]));
  return individuals.map((ind) => normalizeEmployee(ind, empById.get(ind.id) || null));
}

function normalizeEmployee(ind, emp) {
  const workAddr = emp?.location || {};
  const income = emp?.income || {};
  return {
    providerEmployeeId: String(ind.id),
    fullName:           [ind.first_name, ind.middle_name, ind.last_name].filter(Boolean).join(" ").trim() || null,
    workEmail:          (ind.emails || []).find((e) => e.type === "work")?.data
                        || ind.emails?.[0]?.data
                        || null,
    department:         emp?.department?.name || null,
    title:              emp?.title || null,
    managerProviderId:  emp?.manager?.id || null,
    employmentType:     mapEmploymentType(emp?.employment?.type),
    hireDate:           toIsoDate(emp?.start_date),
    terminationDate:    toIsoDate(emp?.end_date),
    workLocation:       [workAddr.city, workAddr.state].filter(Boolean).join(", ") || null,
    workState:          workAddr.state || pickState(workAddr.line1),
    compRate:           toNumber(income?.amount ? income.amount / 100 : null),  // Finch returns cents
    compCurrency:       income?.currency || "USD",
    payFrequency:       mapPayUnit(income?.unit),
    raw:                scrubRaw({ individual: ind, employment: emp }),
  };
}

function mapEmploymentType(x) {
  const s = String(x || "").toLowerCase();
  if (s === "part_time") return "part_time";
  if (s === "contractor" || s === "1099") return "contractor";
  if (s === "intern") return "intern";
  if (s === "employee" || s === "full_time") return "full_time";
  return null;
}
function mapPayUnit(x) {
  const s = String(x || "").toLowerCase();
  if (s === "hour")      return null;   // hourly rate; frequency not implied
  if (s === "week")      return "weekly";
  if (s === "biweek")    return "biweekly";
  if (s === "semimonth") return "semimonthly";
  if (s === "month")     return "monthly";
  if (s === "year")      return null;   // annualized salary; frequency not implied
  return null;
}

// -- Pay statements: Finch requires a payment_id from /employer/payment
//    first, then a batched call to /employer/pay-statement for the
//    employees in that pay run. We pull the most recent 6 pay runs per
//    company. --
export async function fetchPaystubs(auth, { employeeUuid }) {
  // -- Grab recent pay runs (last ~180 days, capped at 6). --
  const start = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const end   = new Date().toISOString().slice(0, 10);
  const runs = await apiCall("GET", `/employer/payment?start_date=${start}&end_date=${end}`, auth);
  const paymentIds = (Array.isArray(runs?.data) ? runs.data : []).slice(0, 6).map((r) => r.id).filter(Boolean);
  if (paymentIds.length === 0) return [];

  const out = [];
  for (const paymentId of paymentIds) {
    const stmts = await apiCall(
      "POST",
      "/employer/pay-statement",
      auth,
      { requests: [{ payment_id: paymentId }] }
    );
    const list = stmts?.responses?.[0]?.body?.pay_statements || [];
    for (const s of list) {
      if (String(s.individual_id) !== String(employeeUuid)) continue;
      out.push(normalizePaystub(s, employeeUuid, paymentId));
    }
  }
  return out;
}

function normalizePaystub(s, employeeUuid, paymentId) {
  // -- Finch returns amounts in cents. --
  const cents = (n) => (n == null ? null : Number(n) / 100);
  const taxes = Object.fromEntries((s.taxes || []).map((t) => [String(t.type || t.name).toLowerCase(), Number(t.amount || 0)]));
  const federal = cents(taxes["federal"] ?? taxes["fed"]);
  const state   = cents(taxes["state"]);
  const ss      = Number(taxes["ss"] ?? taxes["social_security"] ?? 0);
  const med     = Number(taxes["medicare"] ?? 0);
  return {
    providerPaystubId:  String(s.payment_id || s.id || `${paymentId}:${employeeUuid}`),
    providerEmployeeId: String(employeeUuid),
    payDate:            toIsoDate(s.pay_date || s.payment_date),
    periodStart:        toIsoDate(s.period_start),
    periodEnd:          toIsoDate(s.period_end),
    grossPay:           cents(s.gross_pay?.amount),
    netPay:             cents(s.net_pay?.amount),
    federalWithholding: federal,
    stateWithholding:   state,
    fica:               (ss + med) ? cents(ss + med) : null,
    benefitDeductions:  cents(s.total_hours ? null : (s.employee_deductions || [])
                          .filter((d) => /benefit|medical|dental|vision|401k/i.test(d.name || ""))
                          .reduce((sum, d) => sum + Number(d.amount || 0), 0)),
    otherDeductions:    cents((s.employee_deductions || [])
                          .filter((d) => !/benefit|medical|dental|vision|401k/i.test(d.name || ""))
                          .reduce((sum, d) => sum + Number(d.amount || 0), 0)),
    raw: scrubRaw({
      payment_id: s.payment_id, pay_date: s.pay_date, period_start: s.period_start,
      period_end: s.period_end, gross_pay: s.gross_pay, net_pay: s.net_pay,
      taxes, deduction_categories: (s.employee_deductions || []).map((d) => ({ name: d.name })),
    }),
  };
}

// -- Finch does not have a native PTO-balances endpoint on the standard
//    tier. Return empty; add-on when we productize the benefits scope. --
export async function fetchPtoBalances() {
  return [];
}

// ============================================================================
// Webhook signature verification
// ============================================================================
//
// Finch signs webhooks with HMAC-SHA256, hex-encoded, delivered in
// Finch-Signature. Format: "t=<unix_ts>,v1=<hex_hmac>" — split, verify v1.
// ============================================================================

export function verifyWebhook({ rawBody, headerSignature }) {
  const secret = process.env.FINCH_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "FINCH_WEBHOOK_SECRET not set" };
  if (!headerSignature) return { ok: false, reason: "missing signature header" };

  const parts = String(headerSignature).split(",").reduce((acc, kv) => {
    const [k, v] = kv.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts.t;
  const provided  = parts.v1;
  if (!timestamp || !provided) return { ok: false, reason: "malformed signature" };

  // -- Reject events older than 5 minutes to blunt replay attacks. --
  const ageSec = Math.abs((Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSec) || ageSec > 300) return { ok: false, reason: "stale timestamp" };

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? null : "signature mismatch" };
}

// -- Finch event types include company.*, individual.*, employment.*,
//    pay_statement.*. Individual + employment events map to per-employee
//    resync; everything else falls back to full sync so we never miss an
//    update we did not model yet. --
export function planFromEvent(evt) {
  const type = String(evt?.event_type || evt?.type || "").toLowerCase();
  const indId = evt?.data?.individual_id || evt?.individual_id || null;
  if ((type.startsWith("individual.") || type.startsWith("employment.")) && indId) {
    return { action: "resync_employee", employeeUuid: String(indId) };
  }
  return { action: "resync_all" };
}

export default {
  name: "finch",
  authModel: "oauth2",
  isConfigured,
  configStatus,
  buildAuthorizeUrl,
  exchangeCode,
  refreshAccessToken,
  discoverAccount,
  fetchEmployees,
  fetchPaystubs,
  fetchPtoBalances,
  verifyWebhook,
  planFromEvent,
};
