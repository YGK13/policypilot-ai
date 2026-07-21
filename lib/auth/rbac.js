// ============================================================================
// lib/auth/rbac.js — Server-side role-based access control helpers
//
// Uses Clerk's auth() to extract the current user's role from publicMetadata.
// Provides simple guard functions for use in API route handlers.
//
// Role hierarchy (highest → lowest):
//   hr_admin  — full access: team mgmt, billing, cases, regulatory, settings
//   legal     — sensitive cases + read-only HR data
//   hr_staff  — create/update tickets, cases, policies
//   employee  — read own tickets + self-service only
// ============================================================================

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserByClerkId, isDbAvailable } from "@/lib/db";

// -- Ordered role levels (higher index = more privilege) --
const ROLE_LEVELS = ["employee", "hr_staff", "legal", "hr_admin"];

// -- Canonical "is Clerk installed at all" signal. In deployments where the
//    publishable key is missing (only local dev before Clerk is wired), we
//    permit a demo-admin fallback so the app remains usable without auth.
//    In every deployment where Clerk IS configured — including all production
//    and preview deployments — an auth() failure must NEVER grant admin. --
const CLERK_CONFIGURED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// -- Check if roleA has at least as much privilege as roleB --
function hasLevel(userRole, requiredRole) {
  const userIdx = ROLE_LEVELS.indexOf(userRole || "employee");
  const reqIdx = ROLE_LEVELS.indexOf(requiredRole);
  return userIdx >= reqIdx;
}

// ============================================================================
// getSessionRole(request?)
// Returns { clerkId, role, orgId } from Clerk auth context.
// Falls back to "employee" when Clerk is not configured (demo mode).
// ============================================================================
export async function getSessionRole() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return { clerkId: null, role: "employee", orgId: null, authed: false };
    }

    // -- Authoritative role + org come from the DB, keyed on the authenticated
    //    Clerk user. We NEVER trust an orgId supplied by the client, so routes
    //    must use session.orgId (returned here) for every query. Falls back to
    //    publicMetadata claims if the user row is not synced yet. --
    let role    = sessionClaims?.publicMetadata?.role || "employee";
    let orgId   = null;
    let orgSlug = null;
    let user    = null;   // -- real user profile row: feeds the chat AI context (no demo data) --
    if (isDbAvailable()) {
      try {
        const dbUser = await getUserByClerkId(userId);
        if (dbUser) {
          role    = dbUser.role || role;
          orgId   = dbUser.org_id;
          orgSlug = dbUser.org_slug;
          user    = {
            id:         dbUser.id,
            name:       dbUser.name,
            email:      dbUser.email,
            department: dbUser.department,
            title:      dbUser.title,
            state:      dbUser.state,
            location:   dbUser.location,
          };
        }
      } catch {
        // -- DB unreachable: fall back to claims-only (orgId/orgSlug stay null) --
      }
    }

    return { clerkId: userId, role, orgId, orgSlug, user, authed: true };
  } catch (err) {
    // -- SECURITY: We must distinguish two very different failure modes here.
    //
    //    (1) Clerk is not installed at all (local dev before Clerk keys are
    //        wired). In that world, ANY request from ANY browser hits an
    //        unauthenticated endpoint and there is no user identity to speak
    //        of. The old behavior of returning a demo admin was appropriate
    //        so local dev remained usable. We preserve that here, gated on
    //        the publishable key being absent.
    //
    //    (2) Clerk IS installed and auth() threw for some other reason
    //        (network blip, upstream 5xx, unexpected exception). In this
    //        world, returning admin is a full authorization bypass — the
    //        attacker learns to trigger the exception and gets hr_admin on
    //        every request. We MUST return unauthenticated in this case and
    //        let requireRole() turn it into a 401. --
    if (!CLERK_CONFIGURED && process.env.NODE_ENV !== "production") {
      return { clerkId: null, role: "hr_admin", orgId: "default", authed: false, demo: true };
    }
    console.error("[rbac] auth() threw; denying request as unauthenticated. clerkConfigured=" + CLERK_CONFIGURED + " nodeEnv=" + process.env.NODE_ENV + " err=" + (err?.message || err));
    return { clerkId: null, role: "employee", orgId: null, authed: false };
  }
}

// ============================================================================
// requireRole(minimumRole)
// Call at the top of a route handler. Returns { session } or a 403 Response.
//
// Usage:
//   const guard = await requireRole("hr_admin");
//   if (guard.error) return guard.error;
//   const { session } = guard;
// ============================================================================
export async function requireRole(minimumRole) {
  const session = await getSessionRole();

  // -- Demo mode: skip enforcement --
  if (session.demo) {
    return { session, error: null };
  }

  if (!session.authed) {
    return {
      session,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  if (!hasLevel(session.role, minimumRole)) {
    return {
      session,
      error: NextResponse.json(
        {
          error: "Insufficient permissions",
          required: minimumRole,
          current: session.role,
        },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

// ============================================================================
// requireOrgMatch(requestOrgId, session)
// Returns a 403 if the request's orgId doesn't match the session's org.
// Admins can override to access any org (for internal tooling).
// ============================================================================
export function requireOrgMatch(requestOrgId, session) {
  if (session.demo) return null; // demo mode: skip
  if (!requestOrgId || requestOrgId === "default") return null; // unscoped: allow
  if (session.role === "hr_admin" && session.orgId === requestOrgId) return null;
  if (session.orgId && session.orgId !== requestOrgId && session.role !== "hr_admin") {
    return NextResponse.json({ error: "Cross-org access denied" }, { status: 403 });
  }
  return null;
}
