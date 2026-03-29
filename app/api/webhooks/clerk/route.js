import { NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";

// ============================================================================
// POST /api/webhooks/clerk — Clerk webhook handler
//
// Handles user.created and user.updated events from Clerk.
// Auto-creates user records in Neon Postgres when someone signs up.
// Maps Clerk publicMetadata.role to the users table role column.
//
// In production: verify the webhook signature using CLERK_WEBHOOK_SECRET.
// For now: accepts all POST requests (proxy.ts allows /api/webhooks/*).
// ============================================================================

export async function POST(request) {
  try {
    const payload = await request.json();
    const { type, data } = payload;

    // -- Only handle user events --
    if (!type || !type.startsWith("user.")) {
      return NextResponse.json({ received: true, skipped: true });
    }

    // -- Skip if database not configured --
    if (!isDbAvailable()) {
      console.log("[Webhook] DB not available, skipping user sync");
      return NextResponse.json({ received: true, demo: true });
    }

    const sql = getDb();

    if (type === "user.created" || type === "user.updated") {
      const user = data;
      const email = user.email_addresses?.[0]?.email_address || "";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || email;
      const role = user.public_metadata?.role || "employee";
      const clerkId = user.id;

      // -- Ensure a default organization exists --
      const orgs = await sql`SELECT id FROM organizations WHERE slug = 'default' LIMIT 1`;
      let orgId;
      if (orgs.length === 0) {
        const newOrg = await sql`
          INSERT INTO organizations (name, slug, plan)
          VALUES ('Default Organization', 'default', 'starter')
          RETURNING id
        `;
        orgId = newOrg[0].id;
      } else {
        orgId = orgs[0].id;
      }

      // -- Upsert user record --
      await sql`
        INSERT INTO users (org_id, clerk_id, email, name, role)
        VALUES (${orgId}, ${clerkId}, ${email}, ${name}, ${role})
        ON CONFLICT (clerk_id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          updated_at = NOW()
      `;

      console.log(`[Webhook] User ${type}: ${name} (${email}) as ${role}`);
      return NextResponse.json({ received: true, synced: true, role });
    }

    if (type === "user.deleted") {
      const clerkId = data.id;
      if (clerkId) {
        await sql`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE clerk_id = ${clerkId}`;
        console.log(`[Webhook] User deactivated: ${clerkId}`);
      }
      return NextResponse.json({ received: true, deactivated: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Clerk webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
