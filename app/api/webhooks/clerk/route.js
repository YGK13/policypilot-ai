import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { isDbAvailable, getDb } from "@/lib/db";

// ============================================================================
// POST /api/webhooks/clerk — Clerk webhook handler
//
// Handles user.created, user.updated, and user.deleted events from Clerk.
// Auto-creates user records in Neon Postgres when someone signs up.
// Maps Clerk publicMetadata.role to the users table role column.
//
// SECURITY: Verifies Svix webhook signature using CLERK_WEBHOOK_SECRET.
// Set this secret in Vercel env vars after configuring the webhook endpoint
// in the Clerk dashboard (Webhooks → Signing Secret).
//
// To bypass verification in local dev without a signing secret:
//   Set CLERK_WEBHOOK_SECRET_SKIP_VERIFY=true in .env.local (dev only).
// ============================================================================

// -- Read the raw request body as text for Svix signature verification --
async function getRawBody(request) {
  const buffer = await request.arrayBuffer();
  return Buffer.from(buffer).toString("utf-8");
}

export async function POST(request) {
  // -- Extract Svix signature headers --
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  // -- Read raw body BEFORE parsing JSON (Svix needs the exact bytes) --
  let rawBody;
  let payload;
  try {
    rawBody = await getRawBody(request);
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const skipVerify = process.env.CLERK_WEBHOOK_SECRET_SKIP_VERIFY === "true";

  // -- Verify signature when secret is configured --
  if (webhookSecret && !skipVerify) {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
    }
    try {
      const wh = new Webhook(webhookSecret);
      wh.verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (verifyError) {
      console.error("[Webhook] Signature verification failed:", verifyError.message);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
  } else if (!webhookSecret && !skipVerify) {
    // -- Warn in logs but allow through (set CLERK_WEBHOOK_SECRET to enforce) --
    console.warn(
      "[Webhook] CLERK_WEBHOOK_SECRET not set — skipping signature verification. " +
      "Set this secret in Vercel env vars for production security."
    );
  }

  try {
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

    // ========================================================================
    // USER CREATED / UPDATED — upsert user record in Neon
    // ========================================================================
    if (type === "user.created" || type === "user.updated") {
      const user = data;
      const email = user.email_addresses?.[0]?.email_address || "";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || email;
      const role = user.public_metadata?.role || "employee";
      const clerkId = user.id;

      // -- Resolve org: use Clerk organization if present, otherwise "default" --
      const clerkOrgId = user.organization_memberships?.[0]?.organization?.id;
      const clerkOrgName = user.organization_memberships?.[0]?.organization?.name;
      const orgSlug = clerkOrgId
        ? `clerk_${clerkOrgId}`
        : (user.public_metadata?.orgSlug || "default");
      const orgName = clerkOrgName || user.public_metadata?.orgName || "Default Organization";
      const plan = user.public_metadata?.plan || "starter";

      // -- Ensure the org exists (upsert) --
      const orgs = await sql`
        INSERT INTO organizations (name, slug, plan)
        VALUES (${orgName}, ${orgSlug}, ${plan})
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
        RETURNING id
      `;
      const orgId = orgs[0].id;

      // -- Upsert user record keyed on clerk_id --
      await sql`
        INSERT INTO users (org_id, clerk_id, email, name, role)
        VALUES (${orgId}, ${clerkId}, ${email}, ${name}, ${role})
        ON CONFLICT (clerk_id) DO UPDATE SET
          email       = EXCLUDED.email,
          name        = EXCLUDED.name,
          role        = EXCLUDED.role,
          org_id      = EXCLUDED.org_id,
          updated_at  = NOW()
      `;

      console.log(`[Webhook] ${type}: ${name} (${email}) role=${role} org=${orgSlug}`);
      return NextResponse.json({ received: true, synced: true, role, orgSlug });
    }

    // ========================================================================
    // USER DELETED — soft-delete (mark is_active = FALSE)
    // ========================================================================
    if (type === "user.deleted") {
      const clerkId = data.id;
      if (clerkId) {
        await sql`
          UPDATE users
          SET is_active = FALSE, updated_at = NOW()
          WHERE clerk_id = ${clerkId}
        `;
        console.log(`[Webhook] User deactivated: ${clerkId}`);
      }
      return NextResponse.json({ received: true, deactivated: true });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
