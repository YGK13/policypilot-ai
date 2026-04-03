// ============================================================================
// API: /api/team — Org member management
// GET:   List all active users in the org
// POST:  Invite a new user (creates a users row; Clerk invite handled separately)
// PATCH: Update user role or active status
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getOrgUsers, inviteUser, updateUserRole, setUserActive } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// ============================================================================
// GET /api/team?orgId=...
// Requires: hr_staff or above
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("hr_staff");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ users: [], demo: true });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  try {
    const users = await getOrgUsers(orgId);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[API] getOrgUsers error:", err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/team
// Requires: hr_admin only
// Body: { orgId, user: { name, email, role, department, title, state } }
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, user } = body;
    if (!orgId || !user?.email || !user?.name) {
      return NextResponse.json({ error: "Missing orgId, email, or name" }, { status: 400 });
    }

    const saved = await inviteUser(orgId, user);
    return NextResponse.json({ saved: true, user: saved });
  } catch (err) {
    console.error("[API] inviteUser error:", err);
    return NextResponse.json({ error: "Failed to invite user" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/team
// Requires: hr_admin only (role changes are privileged)
// Body: { orgId, userId, action: "update_role" | "set_active", role?, isActive? }
// ============================================================================
export async function PATCH(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ demo: true });
  }

  try {
    const body = await request.json();
    const { orgId, userId, action, role, isActive } = body;
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Missing orgId or userId" }, { status: 400 });
    }

    let updated;
    if (action === "update_role" && role) {
      updated = await updateUserRole(orgId, userId, role);
    } else if (action === "set_active" && isActive !== undefined) {
      updated = await setUserActive(orgId, userId, isActive);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ saved: true, user: updated });
  } catch (err) {
    console.error("[API] updateUser error:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
