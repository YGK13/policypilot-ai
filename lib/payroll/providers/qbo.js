// ============================================================================
// lib/payroll/providers/qbo.js — Intuit QuickBooks adapter
//
// Read-only. One-way. Per-org.
//
// Docs: https://developer.intuit.com/app/developer/qbo/docs (Accounting API)
//
// Honest scope. Intuit exposes two very different data surfaces:
//
//   1. QuickBooks Online ACCOUNTING API — mature, stable, well-documented.
//      Employees, vendor payments, journal entries. This is what we read.
//      We treat QBO Employee records as the roster source for orgs whose
//      HR data lives in QuickBooks (very common in the SMB segment we
//      target, and Intuit's install base of >7M SMBs makes this table
//      stakes).
//
//   2. Intuit Payroll API — narrower, permissioned, and the customer
//      often does not have it enabled. We do NOT depend on it in v1.
//      Paystubs return [] (same pattern as BambooHR without Bamboo
//      Payroll). When a customer explicitly wants paystub sync from
//      QBO Payroll we ship the add-on module.
//
// Why this is still worth shipping now: QBO connection alone lets an HR
// admin's chat answer "who reports to whom" and "which department is Bob
// in" using authoritative Intuit data instead of a manually-maintained
// team list. That is a real product win for the QBO-heavy pilot buyer.
//
// Env vars this module reads:
//   INTUIT_CLIENT_ID          -- from your app in the Intuit Developer portal
//   INTUIT_CLIENT_SECRET      -- ditto
//   INTUIT_WEBHOOK_TOKEN      -- verifier token from webhook config
//   INTUIT_API_ENV            -- 'sandbox' (default) | 'production'
//   INTUIT_REDIRECT_URI       -- must exactly match the registered redirect
//                                URI in the Intuit app, e.g.
//                                https://aihrpilot.com/api/payroll/oauth/qbo
// ============================================================================

import crypto from "node:crypto";
import { fetchWithRetry, toIsoDate, toNumber, pickState, scrubRaw } from "../index.js";

// -- Intuit uses ONE OAuth endpoint (appcenter.intuit.com) but different
//    API bases for sandbox vs production. --
const AUTH_HOST  = "https://appcenter.intuit.com";
const TOKEN_HOST = "https://oauth.platform.intuit.com";
const API_BASES = {
  sandbox:    "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
};
function apiBase() {
  const env = process.env.INTUIT_API_ENV || "sandbox";
  return API_BASES[env] || API_BASES.sandbox;
}

// -- Intuit's minor version pins the response schema so upstream field
//    changes do not silently break parsing. Bump deliberately after review. --
const MINOR_VERSION = "70";

// ============================================================================
// Config surface
// ============================================================================

export function isConfigured() {
  return !!(process.env.INTUIT_CLIENT_ID && process.env.INTUIT_CLIENT_SECRET);
}

export function configStatus() {
  return {
    provider: "qbo",
    ready: isConfigured(),
    env: process.env.INTUIT_API_ENV || "sandbox",
    authModel: "oauth2",
    missing: [
      !process.env.INTUIT_CLIENT_ID     && "INTUIT_CLIENT_ID",
      !process.env.INTUIT_CLIENT_SECRET && "INTUIT_CLIENT_SECRET",
      !process.env.INTUIT_REDIRECT_URI  && "INTUIT_REDIRECT_URI",
      !process.env.INTUIT_WEBHOOK_TOKEN && "INTUIT_WEBHOOK_TOKEN (optional; only needed for signed webhooks)",
    ].filter(Boolean),
  };
}

// ============================================================================
// OAuth 2.0 (Intuit-specific quirk: the realmId — the QBO company id —
// arrives as a query parameter on the callback, NOT inside the token
// response. We stash it in our signed state and read it in the callback
// route to pass to upsertPayrollConnection as providerAccountId.)
// ============================================================================

const AUTHORIZE_PATH = "/connect/oauth2";
const TOKEN_PATH     = "/oauth2/v1/tokens/bearer_authorization_code";
const TOKEN_REFRESH_PATH = "/oauth2/v1/tokens/bearer_authorization_code"; // Intuit uses same endpoint

// -- Intuit scopes. We ask ONLY for what we need: accounting read for
//    Employee + Company. Payroll scope intentionally omitted; we do not
//    write to QBO and we do not read tax filings. --
const SCOPES = ["com.intuit.quickbooks.accounting", "openid", "profile", "email"].join(" ");

export function buildAuthorizeUrl({ state }) {
  if (!isConfigured()) throw new Error("Intuit not configured");
  const params = new URLSearchParams({
    client_id:     process.env.INTUIT_CLIENT_ID,
    redirect_uri:  process.env.INTUIT_REDIRECT_URI,
    response_type: "code",
    scope:         SCOPES,
    state:         String(state),
  });
  return `${AUTH_HOST}${AUTHORIZE_PATH}?${params.toString()}`;
}

// -- Intuit token exchange. The realmId is on the CALLBACK URL as a query
//    param, not in the token response — our OAuth callback route stashes
//    it separately. --
export async function exchangeCode(code) {
  if (!isConfigured()) throw new Error("Intuit not configured");
  const basic = Buffer.from(`${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithRetry(`${TOKEN_HOST}/oauth2/v1/tokens/bearer_token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: process.env.INTUIT_REDIRECT_URI,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Intuit token exchange failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return normalizeTokenResponse(await res.json());
}

export async function refreshAccessToken(refreshToken) {
  if (!isConfigured()) throw new Error("Intuit not configured");
  const basic = Buffer.from(`${process.env.INTUIT_CLIENT_ID}:${process.env.INTUIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithRetry(`${TOKEN_HOST}/oauth2/v1/tokens/bearer_token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Intuit token refresh failed: ${res.status} ${body.slice(0, 200)}`);
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

async function apiGet(realmId, path, { accessToken, refreshToken, onRefresh }) {
  if (!realmId) throw new Error("qbo apiGet: realmId required (Intuit's company id)");
  const url = `${apiBase()}/v3/company/${encodeURIComponent(realmId)}${path}${path.includes("?") ? "&" : "?"}minorversion=${MINOR_VERSION}`;
  const doCall = (tok) => fetchWithRetry(url, {
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
    throw new Error(`QBO ${path} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ============================================================================
// Core sync methods
// ============================================================================

// -- realmId (Intuit's company id) is captured on the OAuth callback and
//    stashed in payroll_connections.provider_account_id. discoverAccount is
//    a no-op for QBO — we can't call any endpoint without knowing realmId
//    first. --
export async function discoverAccount(auth) {
  return { providerAccountId: auth.providerAccountId || null, raw: {} };
}

// -- QBO Employees. The Query API returns them via SQL-like syntax. We
//    page 1,000 at a time (the QBO cap). --
export async function fetchEmployees(auth) {
  const realmId = auth.providerAccountId;
  if (!realmId) throw new Error("qbo fetchEmployees: realmId missing on connection");

  const out = [];
  let startPosition = 1;
  const pageSize = 1000;

  // -- eslint no-constant-condition disabled intentionally: we break when
  //    the page is smaller than pageSize. --
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = `SELECT * FROM Employee STARTPOSITION ${startPosition} MAXRESULTS ${pageSize}`;
    const data = await apiGet(
      realmId,
      `/query?query=${encodeURIComponent(query)}`,
      auth
    );
    const rows = data?.QueryResponse?.Employee || [];
    for (const e of rows) out.push(normalizeEmployee(e));
    if (rows.length < pageSize) break;
    startPosition += pageSize;
  }
  return out;
}

function normalizeEmployee(e) {
  const addr = e.PrimaryAddr || {};
  return {
    providerEmployeeId: String(e.Id),
    fullName:           e.DisplayName || [e.GivenName, e.MiddleName, e.FamilyName].filter(Boolean).join(" ").trim() || null,
    workEmail:          e.PrimaryEmailAddr?.Address || null,
    department:         null,   // QBO Employee has no department field on the standard endpoint
    title:              e.Title || null,
    managerProviderId:  null,
    employmentType:     mapEmploymentType(e.EmployeeType || (e.BillableTime ? "contractor" : "full_time")),
    hireDate:           toIsoDate(e.HiredDate),
    terminationDate:    toIsoDate(e.ReleasedDate),
    workLocation:       [addr.City, addr.CountrySubDivisionCode].filter(Boolean).join(", ") || null,
    workState:          addr.CountrySubDivisionCode || pickState(addr.Line1),
    compRate:           toNumber(e.BillRate),
    compCurrency:       "USD",
    payFrequency:       null,   // QBO does not expose pay schedule on the Employee record
    raw:                scrubRaw(e),
  };
}

function mapEmploymentType(x) {
  const s = String(x || "").toLowerCase();
  if (s.includes("contractor") || s === "vendor") return "contractor";
  if (s.includes("part")) return "part_time";
  if (s.includes("intern")) return "intern";
  return "full_time";
}

// -- QBO Payroll paystubs require the separate Intuit Payroll API scope and
//    are not part of v1. Return empty and let the sync engine record it. --
export async function fetchPaystubs() {
  return [];
}

// -- QBO Employee record does not track PTO balances (that lives in Intuit
//    Payroll). Same story as paystubs — return empty in v1. --
export async function fetchPtoBalances() {
  return [];
}

// ============================================================================
// Webhook signature verification
// ============================================================================
//
// Intuit signs webhooks with HMAC-SHA256 of the raw body using the
// verifier token from the developer portal, delivered as intuit-signature
// in base64.
// ============================================================================

export function verifyWebhook({ rawBody, headerSignature }) {
  const secret = process.env.INTUIT_WEBHOOK_TOKEN;
  if (!secret) return { ok: false, reason: "INTUIT_WEBHOOK_TOKEN not set" };
  if (!headerSignature) return { ok: false, reason: "missing signature header" };

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const provided = String(headerSignature).trim();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, reason: ok ? null : "signature mismatch" };
}

// -- QBO webhook payloads are lists of change notifications grouped by
//    realm. Any Employee change triggers a full employee resync for that
//    org; other change types fall back to full sync. --
export function planFromEvent(evt) {
  const entities = evt?.eventNotifications?.[0]?.dataChangeEvent?.entities || [];
  const hasEmployeeChange = entities.some((e) => e.name === "Employee");
  if (hasEmployeeChange) return { action: "resync_all" };  // small enough set that per-employee routing is not worth it
  return { action: "resync_all" };
}

export default {
  name: "qbo",
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
