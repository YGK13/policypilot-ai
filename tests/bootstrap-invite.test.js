// ============================================================================
// /api/bootstrap — team invite linkage + no shared "default" org.
// An invitee who signs up with a VERIFIED email matching a pending /api/team
// invite row must join the INVITER's org with the invited role, never become
// hr_admin of a brand-new org of their own.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const clerk = { getUser: vi.fn(), updateUserMetadata: vi.fn() };
const db = {
  isDbAvailable: vi.fn(() => true),
  getDb: vi.fn(),
  findPendingInvite: vi.fn(),
  claimInvite: vi.fn(),
};
const sqlCalls = [];

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_invitee" })),
  clerkClient: vi.fn(async () => ({ users: clerk })),
}));
vi.mock("@/lib/db", () => db);

const { POST } = await import("@/app/api/bootstrap/route.js");

function clerkUser({ metadata = {}, verified = true, email = "Bob@Acme.com" } = {}) {
  return {
    id: "user_invitee",
    firstName: "Bob",
    lastName: "Smith",
    publicMetadata: metadata,
    organizationMemberships: [],
    emailAddresses: [{ emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sqlCalls.length = 0;
  db.isDbAvailable.mockReturnValue(true);
  db.getDb.mockReturnValue(async (strings, ...values) => {
    sqlCalls.push({ text: strings.join("?"), values });
    return [{ id: "org-row-id" }];
  });
});

describe("POST /api/bootstrap — invites", () => {
  it("links a pending invite (verified email) into the inviter's org with the invited role", async () => {
    clerk.getUser.mockResolvedValue(clerkUser());
    db.findPendingInvite.mockResolvedValue({ id: "invite-1", role: "hr_staff", org_id: "org-a", org_slug: "org_user_admin" });
    db.claimInvite.mockResolvedValue({ id: "invite-1" });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, role: "hr_staff", invited: true });
    expect(db.findPendingInvite).toHaveBeenCalledWith(["Bob@Acme.com"]);
    expect(db.claimInvite).toHaveBeenCalledWith("invite-1", "user_invitee");
    expect(clerk.updateUserMetadata).toHaveBeenCalledWith("user_invitee", {
      publicMetadata: { role: "hr_staff", orgSlug: "org_user_admin" },
    });
    // -- Must not create a separate org for the invitee --
    expect(sqlCalls.some((c) => c.text.includes("INSERT INTO organizations"))).toBe(false);
  });

  it("ignores unverified email addresses when matching invites", async () => {
    clerk.getUser.mockResolvedValue(clerkUser({ verified: false }));
    db.findPendingInvite.mockResolvedValue(null);

    const res = await POST();
    expect(db.findPendingInvite).toHaveBeenCalledWith([]);
    // -- Falls through to normal self-signup (own org), not the invite --
    expect((await res.json()).role).toBe("hr_admin");
    expect(db.claimInvite).not.toHaveBeenCalled();
  });

  it("coerces an unknown invite role to employee", async () => {
    clerk.getUser.mockResolvedValue(clerkUser());
    db.findPendingInvite.mockResolvedValue({ id: "i", role: "superuser", org_id: "o", org_slug: "org_x" });
    db.claimInvite.mockResolvedValue({ id: "i" });
    expect((await (await POST()).json()).role).toBe("employee");
  });

  it("does not re-check invites for an already provisioned user", async () => {
    clerk.getUser.mockResolvedValue(clerkUser({ metadata: { role: "employee", orgSlug: "org_existing" } }));
    await POST();
    expect(db.findPendingInvite).not.toHaveBeenCalled();
  });

  it("fails closed (503) when the invite lookup errors instead of creating a new org", async () => {
    clerk.getUser.mockResolvedValue(clerkUser());
    db.findPendingInvite.mockRejectedValue(new Error("neon down"));
    const res = await POST();
    expect(res.status).toBe(503);
    expect(clerk.updateUserMetadata).not.toHaveBeenCalled();
  });

  it("self-signup with no invite gets its own org as hr_admin", async () => {
    clerk.getUser.mockResolvedValue(clerkUser());
    db.findPendingInvite.mockResolvedValue(null);
    const body = await (await POST()).json();
    expect(body.role).toBe("hr_admin");
    expect(clerk.updateUserMetadata).toHaveBeenCalledWith("user_invitee", {
      publicMetadata: { role: "hr_admin", orgSlug: "org_user_invitee" },
    });
  });

  it("never falls back to a shared 'default' org (409 instead)", async () => {
    // -- Role set by another app on the shared Clerk instance, but no org --
    clerk.getUser.mockResolvedValue(clerkUser({ metadata: { role: "employee" } }));
    db.findPendingInvite.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(409);
    expect(sqlCalls.some((c) => c.values.includes("default"))).toBe(false);
  });
});
