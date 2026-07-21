// ============================================================================
// lib/payroll/index.js — Shared plumbing for all payroll providers
//
// What lives here (provider-agnostic):
//   - AES-256-GCM encryption for OAuth tokens + webhook secrets
//   - Retry with exponential backoff (honors Retry-After)
//   - Idempotent webhook dedup helper
//   - Provider registry (name → module) so a route can dispatch by string
//   - Normalized shapes returned by every provider (employees, paystubs, PTO)
//
// What lives per-provider (in ./providers/<name>.js):
//   - Auth URL building + token exchange
//   - API calls + normalization to the shapes below
//   - Webhook signature verification
//   - Event routing (which fetcher to re-run when event X arrives)
//
// Encryption key handling:
//   Reads PAYROLL_ENCRYPTION_KEY from env (32-byte hex or base64).
//   In production this MUST be set — startup throws if missing at first use.
//   Rotate by copying old key to PAYROLL_ENCRYPTION_KEY_OLD; encrypt() writes
//   with the new key, decrypt() tries new then old. Re-encrypt in a batch
//   job when convenient.
// ============================================================================

import crypto from "node:crypto";

// ============================================================================
// Encryption
// ============================================================================

const ALG = "aes-256-gcm";

// -- Resolve a raw 32-byte key from a hex or base64 env string --
function keyFromEnv(name) {
  const raw = process.env[name];
  if (!raw) return null;
  let buf;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) buf = Buffer.from(raw, "hex");
  else buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `${name} must be 32 bytes (64 hex chars or 44 base64 chars). Got ${buf.length} bytes.`
    );
  }
  return buf;
}

let cachedKey = undefined;   // undefined = not loaded, null = intentionally absent
let cachedOldKey = undefined;

function getKey() {
  if (cachedKey !== undefined) return cachedKey;
  cachedKey = keyFromEnv("PAYROLL_ENCRYPTION_KEY");
  return cachedKey;
}
function getOldKey() {
  if (cachedOldKey !== undefined) return cachedOldKey;
  cachedOldKey = keyFromEnv("PAYROLL_ENCRYPTION_KEY_OLD");
  return cachedOldKey;
}

// -- Encrypt a plaintext string. Returns "v1:<ivB64>:<tagB64>:<ciphertextB64>". --
export function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PAYROLL_ENCRYPTION_KEY is not set. Refusing to store payroll credentials in plaintext."
      );
    }
    // -- Dev fallback: base64 with an explicit prefix so it is obvious that
    //    the value is NOT encrypted. Never ship this to prod. --
    return "dev:" + Buffer.from(String(plaintext), "utf8").toString("base64");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "v1:" + iv.toString("base64") + ":" + tag.toString("base64") + ":" + enc.toString("base64");
}

// -- Decrypt a value produced by encrypt(). Tries the new key first, then
//    the old key if PAYROLL_ENCRYPTION_KEY_OLD is set (rotation window). --
export function decrypt(value) {
  if (value == null) return null;
  if (value.startsWith("dev:")) {
    // -- Dev fallback path. Only exists when the key was absent at encrypt time. --
    return Buffer.from(value.slice(4), "base64").toString("utf8");
  }
  if (!value.startsWith("v1:")) {
    throw new Error("payroll decrypt: unknown ciphertext version");
  }
  const [, ivB64, tagB64, ctB64] = value.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tryKey = (key) => {
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  };
  const primary = getKey();
  if (primary) {
    try { return tryKey(primary); } catch { /* fall through to old key */ }
  }
  const old = getOldKey();
  if (old) return tryKey(old);
  throw new Error("payroll decrypt: no key could decrypt this value");
}

// ============================================================================
// HTTP retry
// ============================================================================

// -- Sleep helper --
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// -- Fetch with exponential backoff on 429 + 5xx. Honors Retry-After. --
export async function fetchWithRetry(url, init = {}, { maxAttempts = 4, baseDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * Math.pow(2, attempt - 1);
        if (attempt < maxAttempts) {
          await sleep(wait);
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("fetchWithRetry: exhausted attempts");
}

// ============================================================================
// Provider registry
// ============================================================================

// -- Dynamic import so provider modules load only when actually used. This
//    keeps the API surface serverless-friendly (cold start pays only for the
//    provider a given request hits). --
const PROVIDER_LOADERS = {
  gusto:    () => import("./providers/gusto.js").then((m) => m.default),
  bamboohr: () => import("./providers/bamboohr.js").then((m) => m.default),
  qbo:      () => import("./providers/qbo.js").then((m) => m.default),
  finch:    () => import("./providers/finch.js").then((m) => m.default),
  // Future: rippling (pending Finch partner-review outcome).
};

export function isKnownProvider(name) {
  return Object.prototype.hasOwnProperty.call(PROVIDER_LOADERS, String(name));
}

export async function loadProvider(name) {
  const loader = PROVIDER_LOADERS[String(name)];
  if (!loader) throw new Error(`Unknown payroll provider: ${name}`);
  return loader();
}

// ============================================================================
// Normalized shapes — every provider adapter returns these
// ============================================================================
//
// NormalizedEmployee {
//   providerEmployeeId: string
//   fullName: string
//   workEmail: string | null
//   department: string | null
//   title: string | null
//   managerProviderId: string | null
//   employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern' | null
//   hireDate: 'YYYY-MM-DD' | null
//   terminationDate: 'YYYY-MM-DD' | null
//   workLocation: string | null
//   workState: string | null      -- USPS 2-letter, for compliance heatmap
//   compRate: number | null
//   compCurrency: 'USD' | ...
//   payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | null
//   raw: object                   -- untouched provider payload
// }
//
// NormalizedPaystub {
//   providerPaystubId: string
//   providerEmployeeId: string
//   payDate: 'YYYY-MM-DD'
//   periodStart: 'YYYY-MM-DD' | null
//   periodEnd:   'YYYY-MM-DD' | null
//   grossPay: number | null
//   netPay:   number | null
//   federalWithholding: number | null
//   stateWithholding:   number | null
//   fica:               number | null
//   benefitDeductions:  number | null
//   otherDeductions:    number | null
//   raw: object                   -- SUMMARY only. Provider adapter MUST strip
//                                    SSN, bank routing, full deduction line
//                                    items, etc. before returning.
// }
//
// NormalizedPtoBalance {
//   providerEmployeeId: string
//   policyName: string
//   accruedHours: number | null
//   usedHours:    number | null
//   balanceHours: number | null
//   asOf: 'YYYY-MM-DD'
//   raw: object
// }
//
// NormalizedWebhookEvent {
//   providerEventId: string
//   type: string                  -- provider event type
//   receivedAt: Date
//   affectedEmployeeIds: string[] -- optional hint for targeted resync
//   raw: object
// }
// ============================================================================

// -- Small helpers used by adapters and callers alike --

export function pickState(anyLocationString) {
  if (!anyLocationString) return null;
  const m = String(anyLocationString).match(/\b([A-Z]{2})\b/);
  return m ? m[1] : null;
}

export function toIsoDate(x) {
  if (!x) return null;
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function toNumber(x) {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// -- Strip fields we never want to persist, no matter what the provider sent. --
const NEVER_STORE = new Set([
  "ssn", "social_security_number", "tax_id", "ein",
  "bank_account_number", "routing_number", "account_number",
  "date_of_birth", "dob",
]);

export function scrubRaw(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubRaw);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (NEVER_STORE.has(k.toLowerCase())) continue;
    out[k] = scrubRaw(v);
  }
  return out;
}
