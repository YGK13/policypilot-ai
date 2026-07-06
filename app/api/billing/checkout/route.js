import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireRole } from "@/lib/auth/rbac";
import { STRIPE_ACCOUNT_ID, withAccount } from "@/lib/stripe-account";
import PLANS from "@/lib/data/plans";

// ============================================================================
// POST /api/billing/checkout — Create a Stripe Checkout Session
// Accepts: { planId }
// Returns: { url } — redirect the browser to this Stripe-hosted checkout page
//
// The PRICE IS NEVER TAKEN FROM THE CLIENT: it is resolved server-side from
// lib/data/plans.js by planId. (A client-supplied priceInCents previously
// allowed checkout at any arbitrary amount.)
//
// Requires STRIPE_SECRET_KEY env var. Without it, returns a demo URL.
//
// NOTE: STRIPE_SECRET_KEY is an Organization-level key, so every Stripe API
// call must pass the target account in the Stripe-Context header. We do that
// via the per-request { stripeAccount } option (see lib/stripe-account.js).
// ============================================================================

const HAS_STRIPE = !!process.env.STRIPE_SECRET_KEY;

export async function POST(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  try {
    const { planId } = await request.json();
    // -- orgId from the authenticated session (never trust client-supplied value) --
    const orgId = guard.session.orgId;

    // -- Resolve the plan + price SERVER-SIDE. Client only names the plan. --
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json(
        { error: "Unknown planId. Expected one of: " + PLANS.map((p) => p.id).join(", ") },
        { status: 400 }
      );
    }
    const planName = plan.name;
    const priceInCents = plan.price * 100;

    // -- If no Stripe key, return a demo response --
    if (!HAS_STRIPE) {
      return NextResponse.json({
        url: null,
        demo: true,
        message: `Stripe not configured. Would create checkout for ${planName} at $${(priceInCents / 100).toFixed(0)}/mo.`,
      });
    }

    // -- Create real Stripe Checkout Session.
    //    Stripe-Context (stripeAccount) targets the AI HR Pilot account under
    //    our Stripe Organization — required because STRIPE_SECRET_KEY is an
    //    org-level key. --
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `AI HR Pilot — ${planName}`,
              description: `${planName} plan subscription`,
            },
            unit_amount: priceInCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?success=true&plan=${planId}`,
      cancel_url: `${origin}/billing?canceled=true`,
      // -- Embed orgId + planId so the Stripe webhook can update the right org --
      metadata: {
        planId,
        planName,
        orgId: orgId || "unknown",
      },
      // -- Pass metadata to the subscription object too (needed for
      //    subscription.updated / subscription.deleted webhook events) --
      subscription_data: {
        metadata: {
          planId,
          orgId: orgId || "unknown",
        },
      },
    }, withAccount());

    return NextResponse.json({ url: session.url, demo: false });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
