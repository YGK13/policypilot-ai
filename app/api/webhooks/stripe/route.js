// ============================================================================
// API: /api/webhooks/stripe — Handle Stripe payment events
//
// Events handled:
//   checkout.session.completed  → Record successful payment, upgrade org plan
//   customer.subscription.deleted → Downgrade org plan to 'starter'
//   customer.subscription.updated → Sync plan status changes
//
// Requires env vars:
//   STRIPE_SECRET_KEY         — Stripe secret key
//   STRIPE_WEBHOOK_SECRET     — Signing secret from Stripe Dashboard → Webhooks
//
// Webhook URL to register in Stripe Dashboard:
//   https://your-domain.vercel.app/api/webhooks/stripe
//
// To test locally with Stripe CLI:
//   stripe listen --forward-to localhost:3000/api/webhooks/stripe
// ============================================================================

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { updateOrgPlan, createAuditEntry, isDbAvailable } from "@/lib/db";

const HAS_STRIPE = !!process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// -- Map Stripe plan metadata to our plan slugs --
const PLAN_SLUGS = {
  starter: "starter",
  professional: "professional",
  enterprise: "enterprise",
};

// ============================================================================
// POST /api/webhooks/stripe
// ============================================================================
export async function POST(request) {
  if (!HAS_STRIPE || !WEBHOOK_SECRET) {
    // -- Demo mode: log the event but don't fail --
    const body = await request.text();
    console.log("[Stripe Webhook] Not configured — raw payload:", body.slice(0, 200));
    return NextResponse.json({ received: true, demo: true });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    // -- Verify webhook signature to prevent spoofing --
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {

      // ========================================================================
      // checkout.session.completed — Payment successful
      // Update org plan in DB and write audit log entry
      // ========================================================================
      case "checkout.session.completed": {
        const session = event.data.object;
        const { orgId, planId, planName } = session.metadata || {};

        if (!orgId || !planId) {
          console.warn("[Stripe Webhook] checkout.session.completed missing orgId/planId in metadata");
          break;
        }

        const planSlug = PLAN_SLUGS[planId] || planId;

        if (isDbAvailable()) {
          await updateOrgPlan(orgId, planSlug);
          await createAuditEntry(orgId, {
            userName: "Stripe Webhook",
            userRole: "system",
            action: "PLAN_UPGRADED",
            detail: `Plan upgraded to ${planName || planSlug} via Stripe checkout`,
            level: "success",
            metadata: {
              stripeSessionId: session.id,
              stripeCustomerId: session.customer,
              planId,
              planName,
              amountTotal: session.amount_total,
              currency: session.currency,
            },
          });
        }

        console.log(`[Stripe Webhook] Org ${orgId} upgraded to plan: ${planSlug}`);
        break;
      }

      // ========================================================================
      // customer.subscription.deleted — Subscription canceled or expired
      // Downgrade org to starter plan
      // ========================================================================
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;

        if (orgId && isDbAvailable()) {
          await updateOrgPlan(orgId, "starter");
          await createAuditEntry(orgId, {
            userName: "Stripe Webhook",
            userRole: "system",
            action: "PLAN_DOWNGRADED",
            detail: "Subscription canceled — plan downgraded to Starter",
            level: "warning",
            metadata: {
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer,
              canceledAt: subscription.canceled_at,
            },
          });
          console.log(`[Stripe Webhook] Org ${orgId} downgraded to starter (subscription canceled)`);
        }
        break;
      }

      // ========================================================================
      // customer.subscription.updated — Plan tier or status changed
      // ========================================================================
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;

        // -- Only act on active subscriptions --
        if (orgId && subscription.status === "active" && isDbAvailable()) {
          // -- planId is stored in subscription metadata (set at checkout) --
          const planId = subscription.metadata?.planId;
          if (planId) {
            await updateOrgPlan(orgId, PLAN_SLUGS[planId] || planId);
            console.log(`[Stripe Webhook] Org ${orgId} subscription updated to: ${planId}`);
          }
        }
        break;
      }

      // -- Log unhandled events for debugging --
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, err);
    // -- Return 200 so Stripe doesn't retry indefinitely --
    return NextResponse.json({ received: true, warning: err.message });
  }

  return NextResponse.json({ received: true });
}
