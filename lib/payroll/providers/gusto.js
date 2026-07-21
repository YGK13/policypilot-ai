// ============================================================================
// lib/payroll/providers/gusto.js — Gusto Embedded Payroll adapter
//
// Read-only. One-way. Per-org.
//
// Docs: https://docs.gusto.com/embedded-payroll (Embedded API, not the older
//       Partner API — the two have different auth models and different scopes).
//
// Env vars this module reads:
//   GUSTO_CLIENT_ID          -- from your app in the Gusto Developer portal
//   GUSTO_CLIENT_SECRET      -- ditto
//   GUSTO_WEBHOOK_SECRET     -- signing secret from Gusto webhook config
//   GUSTO_API_ENV            -- 'sandbox' (default) | 'production'
//   GUSTO_REDIRECT_URI       -- must exactly match the redirect URI registered
//                               in the Gusto app (e.g.
//                               https://aihrpilot.com/api/payroll/oauth/gusto)
//
// What this module intentionally does NOT do:
//   - Write to payroll (create employees, modify comp, submit runs, etc.)
//   - Read SSN, bank routing, or full tax filings
//   - Talk to the older Gusto Partner API
// ============================================================================

import { fetchWithRetry, toIsoDate, toNumber, pickState, scrubRaw } from "../index.js";

const API_BASES = {
  sandbox:    "https://api.gusto-demo.com",
  production: "https://api.gusto.com",
};
function apiBase() {
  const env = process.env.GUSTO_API_ENV || "sandbox";
  return API_BASES[env] || API_BASES.sandbox;
}

// ============================================================================
// Config surface — used by routes to decide whether this provider is wired
// ============================================================================

export function isConfigured() {
  return !!(process.env.GUSTO_CLIENT_ID && process.env.GUSTO_CLIENT_SECRET);
}

export function configStatus() {
  return {
    provider: "gusto",
    ready: isConfigured(),
    env: process.env.GUSTO_API_ENV || "sandbox",
    missing: [
      !process.env.GUSTO_CLIENT_ID     && "GUSTO_CLIENT_ID",
      !process.env.GUSTO_CLIENT_SECRET && "GUSTO_CLIENT_SECRET",
      !process.env.GUSTO_REDIRECT_URI  && "GUSTO_REDIRECT_URI",
      !process.env.GUSTO_WEBHOOK_SECRET && "GUSTO_WEBHOOK_SECRET",
    ].filter(Boolean),
  };
}

// ============================================================================
// OAuth 2.0
// ============================================================================

const OAUTH_AUTHORIZE_PATH = "/oauth/authorize";
const OAUTH_TOKEN_PATH     = "/oauth/token";

// -- Build the URL the admin's browser is redirected to for consent. `state`
//    is opaque to Gusto and comes back on the callback so we can identify
//    which org initiated the flow (see app/api/payroll/oauth/gusto/route.js). --
export function buildAuthorizeUrl({ state }) {
  if (!isConfigured()) throw new Error("Gusto not configured");
  const params = new URLSearchParams({
    client_id:     process.env.GUSTO_CLIENT_ID,
    redirect_uri:  process.env.GUSTO_REDIRECT_URI,
    response_type: "code",
    state:         String(state),
  });
  return apiBase() + OAUTH_AUTHORIZE_PATH + "?" + params.toString();
}

// -- Exchange an authorization code for tokens. Returns
//    { accessToken, refreshToken, expiresAt, scope } --
export async function exchangeCode(code) {
  if (!isConfigured()) throw new Error("Gusto not configured");
  const res = await fetchWithRetry(apiBase() + OAUTH_TOKEN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     process.env.GUSTO_CLIENT_ID,
      client_secret: process.env.GUSTO_CLIENT_SECRET,
      redirect_uri:  process.env.GUSTO_REDIRECT_URI,
      code,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gusto token exchange failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return normalizeTokenResponse(data);
}

// -- Refresh an access token using its refresh token. Same shape as exchange. --
export async function refreshAccessToken(refreshToken) {
  if (!isConfigured()) throw new Error("Gusto not configured");
  const res = await fetchWithRetry(apiBase() + OAUTH_TOKEN_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     process.env.GUSTO_CLIENT_ID,
      client_secret: process.env.GUSTO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gusto token refresh failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return normalizeTokenResponse(await res.json());
}

function normalizeTokenResponse(data) {
  const expiresAt = data.expires_in
    ? new Date(Date.now() + Number(data.expires_in) * 1000)
    : null;
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scope:        data.scope || null,
    tokenType:    data.token_type || "Bearer",
  };
}

// ============================================================================
// Authenticated API calls
// ============================================================================

// -- One layer of automatic refresh on 401. Caller passes both current tokens
//    and an onRefresh callback so we can persist new tokens back to the
//    payroll_connections row. --
async function apiGet(path, { accessToken, refreshToken, onRefresh }) {
  const doCall = (tok) => fetchWithRetry(apiBase() + path, {
    headers: { Authorization: `Bearer ${tok}`, Accept: "application/json" },
  });
  let res = await doCall(accessToken);
  if (res.status === 401 && refreshToken && onRefresh) {
    const refreshed = await refreshAccessToken(refreshToken);
    await onRefresh(refreshed);
    res = await doCall(refreshed.accessToken);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gusto ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ============================================================================
// Core sync methods
// ============================================================================

// -- Discover the Gusto company_uuid tied to this access token. The Embedded
//    /v1/me endpoint returns the caller and, for a company-scoped token, the
//    company they operate on. --
export async function discoverAccount(auth) {
  const me = await apiGet("/v1/me", auth);
  // Gusto's response shape has evolved; look for a company id in the common
  // locations. Adapter is intentionally forgiving.
  const companyId =
    me?.roles?.payroll_admin?.companies?.[0]?.uuid ||
    me?.company_uuids?.[0] ||
    me?.current_company?.uuid ||
    null;
  return { providerAccountId: companyId, raw: scrubRaw(me) };
}

// -- Fetch every employee for the connected company, one page at a time. --
export async function fetchEmployees(auth, { companyId }) {
  if (!companyId) throw new Error("fetchEmployees: companyId required");
  const list = await apiGet(`/v1/companies/${companyId}/employees`, auth);
  return (Array.isArray(list) ? list : []).map(normalizeEmployee);
}

function normalizeEmployee(e) {
  const primaryJob = Array.isArray(e.jobs) ? e.jobs.find((j) => j.primary) || e.jobs[0] : null;
  const currentComp =
    primaryJob && Array.isArray(primaryJob.compensations)
      ? primaryJob.compensations[primaryJob.compensations.length - 1]
      : null;

  const workAddr = e.work_address || primaryJob?.location || {};

  return {
    providerEmployeeId: String(e.uuid || e.id),
    fullName:           [e.first_name, e.middle_initial, e.last_name].filter(Boolean).join(" ").trim() || null,
    workEmail:          e.email || e.work_email || null,
    department:         primaryJob?.title ? null : (e.department || null),
    title:              primaryJob?.title || e.title || null,
    managerProviderId:  e.manager_uuid || null,
    employmentType:     mapEmploymentType(e.employment_status || primaryJob?.employment_type),
    hireDate:           toIsoDate(primaryJob?.hire_date || e.hire_date),
    terminationDate:    toIsoDate(e.termination_date),
    workLocation:       workAddr.street_1
                          ? [workAddr.city, workAddr.state].filter(Boolean).join(", ")
                          : null,
    workState:          workAddr.state || pickState(workAddr.formatted_address),
    compRate:           toNumber(currentComp?.rate),
    compCurrency:       "USD",   // Gusto is US-only
    payFrequency:       mapPayFrequency(currentComp?.payment_unit || currentComp?.payment_frequency),
    raw:                scrubRaw(e),
  };
}

function mapEmploymentType(x) {
  const s = String(x || "").toLowerCase();
  if (s.includes("part")) return "part_time";
  if (s.includes("contractor")) return "contractor";
  if (s.includes("intern")) return "intern";
  if (s) return "full_time";
  return null;
}

function mapPayFrequency(x) {
  const s = String(x || "").toLowerCase();
  if (s.includes("week") && !s.includes("bi")) return "weekly";
  if (s.includes("bi") || s.includes("every two")) return "biweekly";
  if (s.includes("semi") || s.includes("twice")) return "semimonthly";
  if (s.includes("month")) return "monthly";
  return null;
}

// -- Fetch the last N paystubs for one employee. Summary only — we do not
//    read the full deduction line items. --
export async function fetchPaystubs(auth, { employeeUuid, limit = 6 }) {
  if (!employeeUuid) throw new Error("fetchPaystubs: employeeUuid required");
  const list = await apiGet(`/v1/employees/${employeeUuid}/pay_stubs?per=${limit}`, auth);
  return (Array.isArray(list) ? list : []).map((p) => normalizePaystub(p, employeeUuid));
}

function normalizePaystub(p, employeeUuid) {
  return {
    providerPaystubId:   String(p.uuid || p.id),
    providerEmployeeId:  String(employeeUuid),
    payDate:             toIsoDate(p.check_date || p.pay_date),
    periodStart:         toIsoDate(p.period_start),
    periodEnd:           toIsoDate(p.period_end),
    grossPay:            toNumber(p.gross_pay ?? p.totals?.gross_pay),
    netPay:              toNumber(p.net_pay   ?? p.totals?.net_pay),
    federalWithholding:  toNumber(p.employee_taxes?.federal_income_tax),
    stateWithholding:    toNumber(p.employee_taxes?.state_income_tax),
    fica:                toNumber(
                           (Number(p.employee_taxes?.social_security || 0) +
                            Number(p.employee_taxes?.medicare || 0)) || null
                         ),
    benefitDeductions:   toNumber(p.totals?.benefit_deductions),
    otherDeductions:     toNumber(p.totals?.other_deductions),
    raw:                 scrubRaw({
      uuid: p.uuid, check_date: p.check_date, pay_date: p.pay_date,
      period_start: p.period_start, period_end: p.period_end,
      totals: p.totals, employee_taxes: p.employee_taxes,
    }),
  };
}

// -- Fetch current PTO / time-off balances for one employee. --
export async function fetchPtoBalances(auth, { employeeUuid }) {
  if (!employeeUuid) throw new Error("fetchPtoBalances: employeeUuid required");
  const list = await apiGet(`/v1/employees/${employeeUuid}/time_off_balances`, auth);
  return (Array.isArray(list) ? list : []).map((b) => ({
    providerEmployeeId: String(employeeUuid),
    policyName:         b.name || b.policy_name || "PTO",
    accruedHours:       toNumber(b.accrued_hours),
    usedHours:          toNumber(b.used_hours),
    balanceHours:       toNumber(b.balance ?? b.remaining_hours),
    asOf:               toIsoDate(b.as_of || new Date()),
    raw:                scrubRaw(b),
  }));
}

// ============================================================================
// Webhook signature verification
// ============================================================================
//
// Gusto signs webhooks with HMAC-SHA256 of the raw request body using the
// endpoint's signing secret, delivered in the X-Gusto-Signature header.
// This must be verified BEFORE parsing the body. If verification fails, the
// receiver returns 401 without touching the DB.
// ============================================================================

import crypto from "node:crypto";

export function verifyWebhook({ rawBody, headerSignature }) {
  const secret = process.env.GUSTO_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "GUSTO_WEBHOOK_SECRET not set" };
  if (!headerSignature) return { ok: false, reason: "missing signature header" };

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = String(headerSignature).replace(/^sha256=/i, "").trim();

  // -- Constant-time compare to defeat timing attacks. --
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? null : "signature mismatch" };
}

// -- Given a validated event body, tell the sync engine what to refresh.
//    Adapter stays honest about what it can promise: employees.* and
//    pay_stubs.* map to concrete targeted resyncs; anything else falls back
//    to "resync everything for this company" so we do not silently miss
//    events we did not model yet. --
export function planFromEvent(evt) {
  const type = String(evt?.event_type || evt?.type || "").toLowerCase();
  if (type.startsWith("employees.")) {
    const uuid = evt?.resource_uuid || evt?.data?.employee_uuid;
    return { action: "resync_employee", employeeUuid: uuid || null };
  }
  if (type.startsWith("pay_stubs.") || type.startsWith("payrolls.")) {
    return { action: "resync_paystubs_company" };
  }
  return { action: "resync_all" };
}

// ============================================================================
// Default export — the shape lib/payroll/index.js's registry hands to callers
// ============================================================================

export default {
  name: "gusto",
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
