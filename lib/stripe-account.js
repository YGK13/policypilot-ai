// ============================================================================
// lib/stripe-account.js — Stripe-Context account routing
//
// STRIPE_SECRET_KEY is an Organization-level key, so every Stripe API call
// must be scoped to the AI HR Pilot account under that Organization. Stripe
// surfaces this as the "Stripe-Context" header; the Node SDK exposes it as
// the per-request `{ stripeAccount }` option.
//
// We centralize the account ID here so a future migration to a different
// Stripe account (or a future swap to an account-level key) is a single edit.
//
// The env override (STRIPE_ACCOUNT_ID) lets us flip accounts via Vercel
// without a redeploy of the constant.
// ============================================================================

export const STRIPE_ACCOUNT_ID =
  process.env.STRIPE_ACCOUNT_ID || "acct_18V7JzK4OdZVtHRP";

// Convenience wrapper — pass the return value as the 2nd arg to any Stripe
// method call to route it to the AI HR Pilot account:
//   await stripe.checkout.sessions.create(params, withAccount());
//   const event = stripe.webhooks.constructEvent(raw, sig, secret); // no account needed for verification
export function withAccount() {
  return { stripeAccount: STRIPE_ACCOUNT_ID };
}
