// ============================================================================
// lib/db tenancy guards — chat history is always scoped to the calling user,
// and invite rows never take a clerkId from the client.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = [];
vi.mock("@neondatabase/serverless", () => ({
  neon: () => async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    return [];
  },
}));

vi.stubEnv("DATABASE_URL", "postgres://test");
const db = await import("@/lib/db");

beforeEach(() => { calls.length = 0; });

describe("getChatHistory", () => {
  it("filters by user as well as org when a sessionId is given", async () => {
    await db.getChatHistory("org-1", "user-1", "sess_abc");
    expect(calls[0].text).toMatch(/org_id = \?.*user_id = \?.*session_id = \?/s);
    expect(calls[0].values.slice(0, 3)).toEqual(["org-1", "user-1", "sess_abc"]);
  });

  it("filters by user as well as org without a sessionId", async () => {
    await db.getChatHistory("org-1", "user-1", null);
    expect(calls[0].text).toMatch(/org_id = \?.*user_id = \?/s);
    expect(calls[0].values.slice(0, 2)).toEqual(["org-1", "user-1"]);
  });
});

describe("invites", () => {
  it("inviteUser never persists a client-supplied clerkId", async () => {
    await db.inviteUser("org-1", { email: "a@b.com", name: "A", clerkId: "user_victim" });
    const insert = calls.find((c) => c.text.includes("INSERT INTO users"));
    expect(insert.values).not.toContain("user_victim");
  });

  it("findPendingInvite matches only unlinked, active rows case-insensitively", async () => {
    await db.findPendingInvite(["Bob@Acme.com"]);
    expect(calls[0].text).toMatch(/clerk_id IS NULL/);
    expect(calls[0].text).toMatch(/is_active = TRUE/);
    expect(calls[0].values[0]).toEqual(["bob@acme.com"]);
  });

  it("findPendingInvite does not query with no verified emails", async () => {
    expect(await db.findPendingInvite([])).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("claimInvite is single-use (guards on clerk_id IS NULL)", async () => {
    await db.claimInvite("invite-1", "user_x");
    expect(calls[0].text).toMatch(/WHERE id = \? AND clerk_id IS NULL/);
  });
});

describe("getRecentSessionMessages", () => {
  it("scopes to org, user and session and returns the newest rows oldest-first", async () => {
    await db.getRecentSessionMessages("org-1", "user-1", "sess_abc", 6);
    expect(calls[0].text).toMatch(/org_id = \?.*user_id = \?.*session_id = \?.*DESC LIMIT \?/s);
    expect(calls[0].values).toEqual(["org-1", "user-1", "sess_abc", 6]);
  });

  it("never queries without a user or session", async () => {
    expect(await db.getRecentSessionMessages("org-1", null, "sess_abc")).toEqual([]);
    expect(await db.getRecentSessionMessages("org-1", "user-1", null)).toEqual([]);
    expect(calls.length).toBe(0);
  });
});
