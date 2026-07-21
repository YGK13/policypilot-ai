// ============================================================================
// lib/payroll/providers/bamboohr.js — BambooHR HRIS adapter
//
// Read-only. One-way. Per-org.
//
// Docs: https://documentation.bamboohr.com/reference (v1 gateway API)
//
// Auth model: HTTP Basic where username = API key, password = literal "x".
// NOT OAuth. Admin pastes the API key + subdomain into the connect modal,
// we validate with a live call to /employees/directory before persisting.
//
// What this adapter covers:
//   - Employee directory (all active employees)
//   - Time-off balances via the time-off calculator endpoint
//   - Signed webhooks (Bamboo delivers HMAC-SHA256 in X-BambooHR-Signature)
//
// What it does NOT cover:
//   - Full paystubs. Bamboo Payroll is a paid add-on and its data surface
//     differs from the core API. When a customer has Bamboo Payroll and
//     asks for paystubs, we ship an add-on module. For now, paystubs
//     return an empty array so the sync engine records "0 paystubs
//     synced" instead of erroring.
//   - SSN, bank routing, tax IDs. scrubRaw() in ../index.js strips these
//     defensively even if a caller expands the field list.
//
// Env vars read (none for the app itself — creds are per-connection):
//   BAMBOOHR_WEBHOOK_SECRET  -- shared signing secret; if unset we still
//                               accept the connect flow but webhooks
//                               (which are optional in Bamboo) will 401
// ============================================================================

import crypto from "node:crypto";
import { fetchWithRetry, toIsoDate, toNumber, pickState, scrubRaw } from "../index.js";

// ============================================================================
// Config surface — API-key auth means "configured" is per-connection, so at
// the module level we only need the webhook secret to know if the receiver
// can verify signatures. The connect route validates the customer's key.
// ============================================================================

export function isConfigured() {
  // BambooHR has no per-app credentials. Any customer with a valid API key
  // for their own Bamboo instance can connect. We report "configured".
  return true;
}

export function configStatus() {
  return {
    provider: "bamboohr",
    ready: true,
    env: "production",
    authModel: "api_key",
    fields: ["apiKey", "subdomain"],
    missing: [
      !process.env.BAMBOOHR_WEBHOOK_SECRET && "BAMBOOHR_WEBHOOK_SECRET (only needed if you register webhooks)",
    ].filter(Boolean),
  };
}

// ============================================================================
// Auth helpers
// ============================================================================

function apiBase(subdomain) {
  if (!subdomain) throw new Error("BambooHR: subdomain required");
  return `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(subdomain)}/v1`;
}

function basicAuthHeader(apiKey) {
  const token = Buffer.from(`${apiKey}:x`, "utf8").toString("base64");
  return `Basic ${token}`;
}

// -- Validate a candidate (apiKey, subdomain) pair with a cheap directory call.
//    Called by /api/payroll/connect/bamboohr. Returns { ok, providerAccountId,
//    reason }. --
export async function validateCredentials({ apiKey, subdomain }) {
  if (!apiKey || !subdomain) return { ok: false, reason: "apiKey and subdomain are required" };
  try {
    const res = await fetchWithRetry(`${apiBase(subdomain)}/employees/directory`, {
      headers: { Authorization: basicAuthHeader(apiKey), Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, reason: "API key rejected by BambooHR" };
    }
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `BambooHR ${res.status}: ${body.slice(0, 200)}` };
    }
    // -- providerAccountId := the subdomain itself (Bamboo's stable tenant
    //    identifier; there is no separate company_uuid on the API surface). --
    return { ok: true, providerAccountId: subdomain };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ============================================================================
// Authenticated API calls
// ============================================================================

// -- Bamboo credentials do not refresh. The `auth` object here just carries
//    the api key + subdomain. If Bamboo returns 401 we surface it so the
//    sync engine can mark the connection expired. --
async function apiGet(path, { apiKey, subdomain }) {
  const res = await fetchWithRetry(`${apiBase(subdomain)}${path}`, {
    headers: { Authorization: basicAuthHeader(apiKey), Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("bamboohr_auth_expired");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BambooHR ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

// -- Shape the sync engine expects on `auth`. The generic OAuth
//    onRefresh callback is unused here (no refresh flow). --
function unwrap(auth) {
  return { apiKey: auth.accessToken, subdomain: auth.providerAccountId };
}

// ============================================================================
// Core sync methods
// ============================================================================

// -- Bamboo has no company discovery endpoint; the subdomain IS the account. --
export async function discoverAccount(auth) {
  return { providerAccountId: auth.providerAccountId || null, raw: {} };
}

// -- Directory returns id/name/email/department/title etc. For fields not in
//    the directory (hire_date, employment_status, work_state) we fetch each
//    employee individually with an explicit `fields` list. --
const EMPLOYEE_FIELDS = [
  "id", "firstName", "middleName", "lastName", "workEmail", "department",
  "jobTitle", "supervisorId", "hireDate", "terminationDate", "employmentHistoryStatus",
  "workPhone", "workLocation", "state",
  "payRate", "payType", "paySchedule", "payCurrency",
].join(",");

export async function fetchEmployees(auth) {
  const creds = unwrap(auth);
  const directory = await apiGet(`/employees/directory`, creds);
  const list = Array.isArray(directory.employees) ? directory.employees : [];
  const out = [];
  for (const stub of list) {
    // -- Skip inactive so we don't churn on ex-employees. Bamboo returns
    //    them in the directory if the customer's admin hasn't archived them. --
    if (stub.status === "Inactive") continue;
    try {
      const full = await apiGet(`/employees/${encodeURIComponent(stub.id)}?fields=${EMPLOYEE_FIELDS}`, creds);
      out.push(normalizeEmployee({ ...stub, ...full }));
    } catch (err) {
      // -- One-employee failure does not abort the batch. --
      console.warn(`[bamboohr] employee ${stub.id} fetch failed:`, err.message);
    }
  }
  return out;
}

function normalizeEmployee(e) {
  return {
    providerEmployeeId: String(e.id),
    fullName:           [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ").trim() || e.displayName || null,
    workEmail:          e.workEmail || null,
    department:         e.department || null,
    title:              e.jobTitle || null,
    managerProviderId:  e.supervisorId ? String(e.supervisorId) : null,
    employmentType:     mapEmploymentType(e.employmentHistoryStatus),
    hireDate:           toIsoDate(e.hireDate),
    terminationDate:    toIsoDate(e.terminationDate),
    workLocation:       e.workLocation || null,
    workState:          e.state || pickState(e.workLocation),
    compRate:           toNumber(e.payRate?.value ?? e.payRate),
    compCurrency:       e.payCurrency || "USD",
    payFrequency:       mapPaySchedule(e.paySchedule),
    raw:                scrubRaw(e),
  };
}

function mapEmploymentType(x) {
  const s = String(x || "").toLowerCase();
  if (s.includes("part")) return "part_time";
  if (s.includes("contractor") || s.includes("contract")) return "contractor";
  if (s.includes("intern")) return "intern";
  if (s.includes("full")) return "full_time";
  return null;
}
function mapPaySchedule(x) {
  const s = String(x || "").toLowerCase();
  if (!s) return null;
  if (s.includes("week") && !s.includes("bi")) return "weekly";
  if (s.includes("bi") || s.includes("every two")) return "biweekly";
  if (s.includes("semi") || s.includes("twice")) return "semimonthly";
  if (s.includes("month")) return "monthly";
  return null;
}

// -- Bamboo Payroll is an add-on with a separate data surface. Return an
//    empty array so the sync engine records "0 paystubs synced" rather than
//    erroring. When a customer has Bamboo Payroll and we ship the add-on
//    module, this becomes a real fetch. --
export async function fetchPaystubs() {
  return [];
}

// -- Time-off balances. Endpoint returns an array of policies for the
//    employee with current balance in the policy's own unit (usually hours). --
export async function fetchPtoBalances(auth, { employeeUuid }) {
  const creds = unwrap(auth);
  const today = new Date().toISOString().slice(0, 10);
  const list = await apiGet(
    `/employees/${encodeURIComponent(employeeUuid)}/time_off/calculator?end=${today}`,
    creds
  );
  return (Array.isArray(list) ? list : []).map((b) => ({
    providerEmployeeId: String(employeeUuid),
    policyName:         b.name || b.policyType?.name || "Time Off",
    accruedHours:       toNumber(b.balance?.accrued ?? b.accrued),
    usedHours:          toNumber(b.balance?.used ?? b.used),
    balanceHours:       toNumber(b.balance ?? b.balance?.total),
    asOf:               today,
    raw:                scrubRaw(b),
  }));
}

// ============================================================================
// Webhook signature verification
// ============================================================================
//
// Bamboo signs webhooks with HMAC-SHA256 using the endpoint's shared secret,
// delivered in X-BambooHR-Signature.
// ============================================================================

export function verifyWebhook({ rawBody, headerSignature }) {
  const secret = process.env.BAMBOOHR_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "BAMBOOHR_WEBHOOK_SECRET not set" };
  if (!headerSignature) return { ok: false, reason: "missing signature header" };
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = String(headerSignature).replace(/^sha256=/i, "").trim();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? null : "signature mismatch" };
}

// -- Bamboo webhooks always describe changes to one or more employees. If we
//    can identify which employee(s), resync those; otherwise fall back to a
//    full sync so we do not silently miss updates. --
export function planFromEvent(evt) {
  const changes = evt?.employees || evt?.data || [];
  const ids = Array.isArray(changes)
    ? changes.map((c) => c.id || c.employee_id).filter(Boolean).map(String)
    : [];
  if (ids.length === 1) return { action: "resync_employee", employeeUuid: ids[0] };
  if (ids.length > 1)   return { action: "resync_all" };
  return { action: "resync_all" };
}

export default {
  name: "bamboohr",
  authModel: "api_key",     // signals the connect route to use POST-creds, not OAuth
  isConfigured,
  configStatus,
  validateCredentials,      // API-key providers expose this instead of buildAuthorizeUrl/exchangeCode
  discoverAccount,
  fetchEmployees,
  fetchPaystubs,
  fetchPtoBalances,
  verifyWebhook,
  planFromEvent,
};
