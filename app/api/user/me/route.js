// ============================================================================
// API: /api/user/me — Get current Clerk user's Neon profile + org data
//
// Called by AppShell on mount when Clerk is active.
// Returns: { user: { id, orgId, role, name, email }, org: { id, name, slug } }
// Falls back to demo data when DB is not configured.
// ============================================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, isDbAvailable } from "@/lib/db";

export async function GET() {
  // -- Demo mode: no DB --
  if (!isDbAvailable()) {
    return NextResponse.json({
      demo: true,
      user: null,
      orgId: "default",
    });
  }

  try {
    // -- Get Clerk user ID from session --
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // -- Look up user in Neon (populated by Clerk webhook on sign-up) --
    const dbUser = await getUserByClerkId(userId);
    if (!dbUser) {
      // User hasn't been synced yet (webhook may not have fired yet)
      return NextResponse.json({
        demo: false,
        user: null,
        orgId: "default",
        message: "User not yet synced from Clerk webhook",
      });
    }

    return NextResponse.json({
      demo: false,
      user: {
        id: dbUser.id,
        clerkId: dbUser.clerk_id,
        orgId: dbUser.org_id,
        orgName: dbUser.org_name,
        orgSlug: dbUser.org_slug,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
      orgId: dbUser.org_id,
    });
  } catch (err) {
    console.error("[API] /api/user/me error:", err);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}
