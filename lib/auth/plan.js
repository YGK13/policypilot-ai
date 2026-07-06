// ============================================================================
// PLAN ENFORCEMENT — server-side limits per subscription tier.
// Source of truth for what each plan actually gates. Keep in sync with
// lib/data/plans.js (display) and the landing page pricing section.
//
// Enforced at:
//   /api/documents/upload  → documents limit
//   /api/team POST         → seats (active users) limit
// ============================================================================

import { getOrgPlan, countDocuments, countActiveUsers } from "@/lib/db";

export const PLAN_LIMITS = {
  starter:      { documents: 10,       seats: 100      },
  professional: { documents: 50,       seats: 500      },
  enterprise:   { documents: Infinity, seats: Infinity },
};

export function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

// -- Returns { ok, plan, limit, current } for a document upload attempt --
export async function checkDocumentLimit(orgId) {
  const plan = await getOrgPlan(orgId);
  const { documents: limit } = limitsFor(plan);
  const current = await countDocuments(orgId);
  return { ok: current < limit, plan, limit, current };
}

// -- Returns { ok, plan, limit, current } for a team invite attempt --
export async function checkSeatLimit(orgId) {
  const plan = await getOrgPlan(orgId);
  const { seats: limit } = limitsFor(plan);
  const current = await countActiveUsers(orgId);
  return { ok: current < limit, plan, limit, current };
}
