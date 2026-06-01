import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isDbAvailable, getDb } from "@/lib/db";

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
//   2. DB: upserts organizations + users rows in Neon (best-effort).
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

  if (!role && !hasOrgMembership) {
    role = "hr_admin"; // self-signup = company admin
    try {
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { ...(user.publicMetadata || {}), role },
      });
      assigned = true;
      console.log(`[Bootstrap] Assigned hr_admin to self-signup ${userId}`);
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
      const orgSlug = user.publicMetadata?.orgSlug || "default";
      const orgName = user.publicMetadata?.orgName || "Default Organization";
      const plan = user.publicMetadata?.plan || "starter";

      const orgs = await sql`
        INSERT INTO organizations (name, slug, plan)
        VALUES (${orgName}, ${orgSlug}, ${plan})
        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
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
