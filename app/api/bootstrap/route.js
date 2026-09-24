import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isDbAvailable, getDb, findPendingInvite, claimInvite } from "@/lib/db";

const INVITE_ROLES = ["employee", "hr_staff", "legal", "hr_admin"];

// ============================================================================
// POST /api/bootstrap — first-run setup for an authenticated user
//
// Replaces the Clerk webhook for user/org/role provisioning so we do NOT need
// a paid Clerk plan (webhooks are Pro-only). AppShell calls this once on first
// load. It is idempotent and never downgrades an existing role.
//
// What it does:
//   1. Role: if the user has no role in publicMetadata and no Clerk org
//      membership, they are a self-signup setting up their own company, so they
//      become that org's admin (hr_admin). Written back to Clerk publicMetadata
//      so client RBAC (useUser) and server RBAC (sessionClaims) both see it.
//   2. Invites: a user not yet provisioned here whose VERIFIED email matches a
//      pending /api/team invite row joins the inviter's org with that role.
//   3. DB: upserts organizations + users rows in Neon (best-effort).
//   Never falls back to a shared "default" org (409 instead).
// ============================================================================
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const client = await clerkClient();

  let user;
  try {
    user = await client.users.getUser(userId);
  } catch (err) {
    console.warn("[Bootstrap] getUser failed:", err.message);
    return NextResponse.json({ error: "Could not load user" }, { status: 502 });
  }

  // -- Resolve / assign role (never downgrade an existing one) --
  let role = user.publicMetadata?.role;
  const hasOrgMembership = (user.organizationMemberships?.length || 0) > 0;
  let assigned = false;
  let orgSlug = user.publicMetadata?.orgSlug || null;

  // -- Team invite: an hr_admin's POST /api/team pre-created a users row
  //    (clerk_id NULL) in THEIR org. If this user is not provisioned in AI HR
  //    Pilot yet (no orgSlug), link that row by VERIFIED email so the invitee
  //    joins the inviter's org with the invited role, instead of being treated
  //    as a self-signup with their own org. Clerk metadata is shared with other
  //    apps on this instance, so the DB invite row is the source of truth. --
  if (!orgSlug && isDbAvailable()) {
    const verifiedEmails = (user.emailAddresses || [])
      .filter((e) => e?.verification?.status === "verified" && e.emailAddress)
      .map((e) => e.emailAddress);
    try {
      const invite = await findPendingInvite(verifiedEmails);
      if (invite && (await claimInvite(invite.id, userId))) {
        role    = INVITE_ROLES.includes(invite.role) ? invite.role : "employee";
        orgSlug = invite.org_slug;
        try {
          await client.users.updateUserMetadata(userId, {
            publicMetadata: { ...(user.publicMetadata || {}), role, orgSlug },
          });
        } catch (err) {
          // -- Non-fatal: RBAC reads role + org from the (now linked) DB row --
          console.warn("[Bootstrap] updateUserMetadata (invite) failed:", err.message);
        }
        console.log(`[Bootstrap] Linked invited user ${userId} to ${orgSlug} as ${role}`);
        return NextResponse.json({ ok: true, role, assigned: true, invited: true });
      }
    } catch (err) {
      // -- Fail closed: never fall through to self-signup (which would create a
      //    separate org and make the invitee its admin) when the lookup errored. --
      console.error("[Bootstrap] invite lookup failed:", err.message);
      return NextResponse.json({ error: "Could not provision workspace" }, { status: 503 });
    }
  }

  // Each self-signup is a new company: make them admin AND give them their OWN
  // org (unique slug) for multi-tenant isolation.
  const isSelfSignup = !role && !hasOrgMembership;
  if (!orgSlug && isSelfSignup) orgSlug = `org_${userId}`;

  // -- Fail closed: never drop a user into a shared "default" tenant. A user
  //    with a role but no org (e.g. metadata written by another app on the
  //    shared Clerk instance) must be provisioned explicitly. --
  if (!orgSlug) {
    return NextResponse.json(
      { error: "Workspace not provisioned. Ask your HR admin to invite you." },
      { status: 409 }
    );
  }

  if (isSelfSignup) {
    role = "hr_admin";
    try {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { ...(user.publicMetadata || {}), role, orgSlug },
      });
      assigned = true;
      console.log(`[Bootstrap] Provisioned self-signup ${userId} as hr_admin in ${orgSlug}`);
    } catch (err) {
      console.warn("[Bootstrap] updateUserMetadata failed:", err.message);
    }
  }
  role = role || "employee";

  // -- Best-effort DB sync (app still works client-side if this fails) --
  if (isDbAvailable()) {
    try {
      const sql = getDb();
      const email = user.emailAddresses?.[0]?.emailAddress || "";
      const name =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || email;
      const orgName =
        user.publicMetadata?.orgName ||
        (user.firstName ? `${user.firstName}'s Organization` : "My Organization");
      const plan = user.publicMetadata?.plan || "starter";

      // -- Never rename an existing org here: teammates also hit this route,
      //    and their name must not overwrite the org's name. --
      const orgs = await sql`
        INSERT INTO organizations (name, slug, plan)
        VALUES (${orgName}, ${orgSlug}, ${plan})
        ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `;
      const orgId = orgs[0].id;

      await sql`
        INSERT INTO users (org_id, clerk_id, email, name, role)
        VALUES (${orgId}, ${userId}, ${email}, ${name}, ${role})
        ON CONFLICT (clerk_id) DO UPDATE SET
          email      = EXCLUDED.email,
          name       = EXCLUDED.name,
          org_id     = EXCLUDED.org_id,
          updated_at = NOW()
      `;
    } catch (err) {
      console.warn("[Bootstrap] DB sync failed:", err.message);
    }
  }

  return NextResponse.json({ ok: true, role, assigned });
}
