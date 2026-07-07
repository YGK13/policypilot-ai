// ============================================================================
// PLAN + PRICING TESTS — guards the two things that must never silently drift:
//   1. Enforcement limits (lib/auth/plan.js) match the display plans.
//   2. Display prices stay at the public $99 / $349 / $999 the landing page
//      and Stripe checkout resolve against (checkout now derives price from
//      plans.js server-side, so a wrong number here overcharges/undercharges).
// ============================================================================

import { describe, it, expect } from "vitest";
import PLANS from "@/lib/data/plans";
import { PLAN_LIMITS, limitsFor } from "@/lib/auth/plan";

describe("pricing display", () => {
  it("keeps the three published price points", () => {
    const byId = Object.fromEntries(PLANS.map((p) => [p.id, p.price]));
    expect(byId.starter).toBe(99);
    expect(byId.professional).toBe(349);
    expect(byId.enterprise).toBe(999);
  });

  it("exposes exactly starter / professional / enterprise", () => {
    expect(PLANS.map((p) => p.id).sort()).toEqual(["enterprise", "professional", "starter"]);
  });
});

describe("plan enforcement limits", () => {
  it("has a limit entry for every displayed plan", () => {
    for (const p of PLANS) {
      expect(PLAN_LIMITS[p.id], `missing limits for ${p.id}`).toBeDefined();
    }
  });

  it("orders document limits starter < professional < enterprise(∞)", () => {
    expect(PLAN_LIMITS.starter.documents).toBeLessThan(PLAN_LIMITS.professional.documents);
    expect(PLAN_LIMITS.enterprise.documents).toBe(Infinity);
  });

  it("orders seat limits starter < professional < enterprise(∞)", () => {
    expect(PLAN_LIMITS.starter.seats).toBeLessThan(PLAN_LIMITS.professional.seats);
    expect(PLAN_LIMITS.enterprise.seats).toBe(Infinity);
  });

  it("falls back to the starter limits for an unknown plan (fail-safe, not fail-open)", () => {
    expect(limitsFor("nonexistent")).toEqual(PLAN_LIMITS.starter);
  });

  it("document limits match what the plan bullets advertise", () => {
    // Starter bullet says 10, Professional says 50.
    expect(PLAN_LIMITS.starter.documents).toBe(10);
    expect(PLAN_LIMITS.professional.documents).toBe(50);
  });
});
