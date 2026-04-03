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
      return { clerkId: null, role: "employee", orgId: "default", authed: false };
    }

    // -- Role is stored in publicMetadata and synced to sessionClaims --
    const role = sessionClaims?.publicMetadata?.role || "employee";
    const orgId = sessionClaims?.publicMetadata?.orgId || "default";

    return { clerkId: userId, role, orgId, authed: true };
  } catch {
    // -- Clerk not configured (demo mode) — allow through as hr_admin for local dev --
    return { clerkId: null, role: "hr_admin", orgId: "default", authed: false, demo: true };
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
