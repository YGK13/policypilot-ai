// ============================================================================
// API: /api/team — Org member management
// GET:   List all active users in the org
// POST:  Invite a new user (creates a users row; Clerk invite handled separately)
// PATCH: Update user role or active status
// ============================================================================

import { NextResponse } from "next/server";
import { isDbAvailable, getOrgUsers, inviteUser, updateUserRole, setUserActive } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { checkSeatLimit } from "@/lib/auth/plan";
import { sendInviteEmail } from "@/lib/email";

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

  // -- org is derived from the authenticated user, never trusted from the client --
  const orgId = guard.session.orgId;

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
    const { user } = body;
    const orgId = guard.session.orgId;
    if (!orgId || !user?.email || !user?.name) {
      return NextResponse.json({ error: "Missing org context, email, or name" }, { status: 400 });
    }

    // -- Plan enforcement: seat count per tier --
    const gate = await checkSeatLimit(orgId);
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: `Seat limit reached: your ${gate.plan} plan includes ${gate.limit} team members (${gate.current} active). Upgrade in Billing to add more.`,
          code: "plan_limit",
        },
        { status: 402 }
      );
    }

    // -- Persist to DB so the member appears in the team list immediately --
    const saved = await inviteUser(orgId, user);

    // -- Send invite notification via Resend (NOT via Clerk invitation API).
    //    Using Clerk's invitations API caused cross-app contamination: the
    //    invitation email links to accounts.aihrpilot.com (this app's Clerk
    //    Account Portal), which broke any other app sharing the same Clerk
    //    instance (e.g. Career Beast Mode). Resend keeps the email on-domain
    //    and independent of Clerk instance configuration. --
    const orgSlug = guard.session.orgSlug;
    sendInviteEmail({
      toEmail:  user.email,
      toName:   user.name,
      role:     user.role || "employee",
      orgSlug,
      invitedBy: guard.session.clerkId,
    }).catch(err => console.warn("[Team] invite email failed (non-fatal):", err.message));

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
    const { userId, action, role, isActive } = body;
    const orgId = guard.session.orgId;
    if (!orgId || !userId) {
      return NextResponse.json({ error: "Missing org context or userId" }, { status: 400 });
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
