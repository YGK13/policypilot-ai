// ============================================================================
// /api/health public response + Stripe webhook retry semantics.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

const session = { authed: false, role: "employee" };
vi.mock("@/lib/auth/rbac", () => ({ getSessionRole: vi.fn(async () => session) }));
const db = {
  isDbAvailable: vi.fn(() => true),
  getDb: vi.fn(() => async () => { throw new Error("password authentication failed for user neondb_owner @ ep-secret-host"); }),
  updateOrgPlan: vi.fn(),
  createAuditEntry: vi.fn(async () => ({})),
};
vi.mock("@/lib/db", () => db);

vi.stubEnv("SETUP_SECRET", "s3cret-value");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");

const health = await import("@/app/api/health/route.js");
const stripeWebhook = await import("@/app/api/webhooks/stripe/route.js");

beforeEach(() => {
  vi.clearAllMocks();
  session.authed = false;
  session.role = "employee";
});

describe("GET /api/health", () => {
  it("returns only { ok, timestamp } to anonymous callers", async () => {
    const res = await health.GET(new Request("http://x/api/health"));
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["ok", "timestamp"]);
    expect(JSON.stringify(body)).not.toMatch(/neondb|services|env|missingTables/);
  });

  it("rejects a wrong secret", async () => {
    const res = await health.GET(new Request("http://x/api/health", { headers: { authorization: "Bearer nope" } }));
    expect((await res.json()).services).toBeUndefined();
  });

  it("returns details with the SETUP_SECRET bearer, without the raw DB error", async () => {
    const res = await health.GET(new Request("http://x/api/health", { headers: { authorization: "Bearer s3cret-value" } }));
    const body = await res.json();
    expect(body.services.database.ok).toBe(false);
    expect(body.services.database.error).toBe("Database query failed");
    expect(JSON.stringify(body)).not.toMatch(/neondb_owner|ep-secret-host/);
  });

  it("returns details to a signed-in hr_admin", async () => {
    session.authed = true;
    session.role = "hr_admin";
    const res = await health.GET(new Request("http://x/api/health"));
    expect((await res.json()).services).toBeDefined();
  });
});

describe("POST /api/webhooks/stripe", () => {
  function signedRequest(event) {
    const payload = JSON.stringify(event);
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test" });
    return new Request("http://x/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": header },
    });
  }
  const checkoutEvent = {
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", metadata: { orgId: "org-1", planId: "professional" } } },
  };

  it("returns 5xx when the DB write fails so Stripe retries", async () => {
    db.updateOrgPlan.mockRejectedValue(new Error("neon blip"));
    const res = await stripeWebhook.POST(signedRequest(checkoutEvent));
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("returns 200 when the DB write succeeds", async () => {
    db.updateOrgPlan.mockResolvedValue({});
    const res = await stripeWebhook.POST(signedRequest(checkoutEvent));
    expect(res.status).toBe(200);
    expect(db.updateOrgPlan).toHaveBeenCalledWith("org-1", "professional");
  });

  it("rejects an unsigned payload", async () => {
    const res = await stripeWebhook.POST(new Request("http://x", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(res.status).toBe(400);
  });
});
