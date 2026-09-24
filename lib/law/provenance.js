// ============================================================================
// LAW PROVENANCE — gating for every legal figure the app shows or feeds the LLM
//
// Each law fact in lib/data/jurisdictions.js and each item in
// lib/data/regulatory-updates.js carries:
//   value / summary   the claim itself
//   jurisdiction      where it applies
//   sourceUrl         primary source (DOL, EEOC, state labor dept, statute site)
//   effectiveDate     YYYY-MM-DD the rule took effect (null when not recorded)
//   lastVerified      YYYY-MM-DD a person/agent last checked it against the source
//   confidence        "high" | "medium" | "low"
//   verification      "verified" | "unverified"
//
// Rule: only a fact that passes isVerified() may be presented as fact.
// Everything else renders as SOURCE_PENDING and the LLM is told not to state it.
// Plain ESM with no path aliases so scripts/law-freshness.mjs can import it.
// ============================================================================

export const VERIFICATION_WINDOW_DAYS = 90;
export const SOURCE_PENDING = "Verify with counsel / source pending";

const PRESENTABLE_CONFIDENCE = new Set(["high", "medium"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// -- A fact may be shown as fact only when it is marked verified AND has the
//    provenance to back that up (https source, a real verification date, and
//    at least medium confidence). Missing provenance fails closed. --
export function isVerified(fact) {
  if (!fact || typeof fact !== "object") return false;
  if (fact.verification !== "verified") return false;
  if (typeof fact.sourceUrl !== "string" || !fact.sourceUrl.startsWith("https://")) return false;
  if (!parseDate(fact.lastVerified)) return false;
  return PRESENTABLE_CONFIDENCE.has(fact.confidence);
}

export function daysSinceVerified(fact, now = new Date()) {
  const d = parseDate(fact?.lastVerified);
  if (!d) return null;
  return Math.floor((now.getTime() - d.getTime()) / DAY_MS);
}

// -- Verified, but the last check is older than the window: still shown, with a
//    re-verify warning, and listed by `npm run law:freshness`. --
export function isStale(fact, now = new Date(), windowDays = VERIFICATION_WINDOW_DAYS) {
  const days = daysSinceVerified(fact, now);
  return days === null || days > windowDays;
}

// -- Text for any surface that prints a law fact inline (policy answers etc.) --
export function lawText(fact) {
  return isVerified(fact) ? fact.value : SOURCE_PENDING;
}

// -- Everything a UI needs to render a fact with its provenance --
export function describeFact(fact, now = new Date()) {
  const verified = isVerified(fact);
  return {
    verified,
    text: verified ? fact.value : SOURCE_PENDING,
    sourceUrl: verified ? fact.sourceUrl : null,
    effectiveDate: verified ? fact.effectiveDate || null : null,
    lastVerified: fact?.lastVerified || null,
    confidence: fact?.confidence || null,
    stale: verified && isStale(fact, now),
  };
}

// -- Human label for a jurisdiction field key ("overtimeThreshold" -> "Overtime Threshold") --
export function factLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

// -- The law-fact entries of one jurisdiction (skips display-only keys) --
export function factEntries(rules) {
  return Object.entries(rules || {}).filter(([, v]) => v && typeof v === "object" && "verification" in v);
}

// -- One line of law context for the LLM. Verified facts carry their citation;
//    unverified ones carry an explicit "do not state" instruction instead of
//    the value, so the model never sees an unsourced figure. --
export function formatFactForPrompt(key, fact, now = new Date()) {
  const label = factLabel(key);
  if (!isVerified(fact)) {
    return `- ${label}: UNVERIFIED (no primary source on file). Do not state any rule, figure or date for this topic; say it must be verified with counsel or the official agency.`;
  }
  const bits = [`source: ${fact.sourceUrl}`];
  if (fact.effectiveDate) bits.push(`effective ${fact.effectiveDate}`);
  bits.push(`last verified ${fact.lastVerified}`);
  if (isStale(fact, now)) bits.push("VERIFICATION OVERDUE: tell the user to confirm the current figure");
  return `- ${label}: ${fact.value} [${bits.join("; ")}]`;
}

// -- A regulatory-update item is presentable only when verified the same way --
export function isUpdateVerified(update) {
  return isVerified(update);
}

// -- Every fact/update that is unverified or past the verification window.
//    Used by scripts/law-freshness.mjs and the weekly GitHub Action. --
export function listFreshnessIssues(jurisdictions, updates, now = new Date(), windowDays = VERIFICATION_WINDOW_DAYS) {
  const issues = [];
  const check = (id, jurisdiction, field, fact, sourceUrl) => {
    const verified = isVerified(fact);
    const days = daysSinceVerified(fact, now);
    if (verified && days !== null && days <= windowDays) return;
    issues.push({
      id,
      jurisdiction,
      field,
      reason: verified ? "stale" : "unverified",
      lastVerified: fact?.lastVerified || null,
      daysSinceVerified: days,
      sourceUrl: sourceUrl || null,
    });
  };
  for (const [state, rules] of Object.entries(jurisdictions || {})) {
    for (const [key, fact] of factEntries(rules)) {
      check(`${state}.${key}`, state, key, fact, fact.sourceUrl);
    }
  }
  for (const u of updates || []) {
    check(u.id, u.jurisdiction, `update: ${u.title}`, u, u.sourceUrl);
  }
  return issues;
}
