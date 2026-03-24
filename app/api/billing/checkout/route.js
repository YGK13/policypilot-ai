import { NextResponse } from "next/server";
import Stripe from "stripe";

// ============================================================================
// POST /api/billing/checkout — Create a Stripe Checkout Session
// Accepts: { planId, planName, priceInCents }
// Returns: { url } — redirect the browser to this Stripe-hosted checkout page
//
// Requires STRIPE_SECRET_KEY env var. Without it, returns a demo URL.
// ============================================================================

const HAS_STRIPE = !!process.env.STRIPE_SECRET_KEY;

export async function POST(request) {
  try {
    const { planId, planName, priceInCents } = await request.json();

    if (!planId || !planName || !priceInCents) {
      return NextResponse.json(
        { error: "Missing required fields: planId, planName, priceInCents" },
        { status: 400 }
      );
    }

    // -- If no Stripe key, return a demo response --
    if (!HAS_STRIPE) {
      return NextResponse.json({
        url: null,
        demo: true,
        message: `Stripe not configured. Would create checkout for ${planName} at $${(priceInCents / 100).toFixed(0)}/mo.`,
      });
    }

    // -- Create real Stripe Checkout Session --
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
              name: `PolicyPilot AI — ${planName}`,
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
      metadata: {
        planId,
        planName,
      },
    });

    return NextResponse.json({ url: session.url, demo: false });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
