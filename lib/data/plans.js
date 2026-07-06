// =============================================================================
// PRICING PLANS — display data. MUST stay truthful: every bullet here is a
// feature that exists in the product today. Enforcement limits live in
// lib/auth/plan.js (documents + seats) and must match these numbers.
// Prices match the public landing page: $99 / $349 / $999.
// =============================================================================

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    period: "/mo",
    features: [
      "Up to 100 employees",
      "10 handbook documents, fully indexed",
      "AI answers grounded in your own handbook, with citations",
      "Risk triage + auto-escalation of sensitive topics (ADA, FMLA, harassment)",
      "Federal + 50-state employment law context",
      "Ticket tracking + basic analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "professional",
    name: "Professional",
    price: 349,
    period: "/mo",
    popular: true,
    features: [
      "Up to 500 employees",
      "50 handbook documents, fully indexed",
      "Everything in Starter",
      "Team roles (admin, HR staff, legal, employee)",
      "Case management for sensitive matters",
      "Self-service requests (PTO, leave, info changes)",
      "Full analytics + audit log",
      "Priority email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 999,
    period: "/mo",
    features: [
      "Unlimited employees",
      "Unlimited documents",
      "Everything in Professional",
      "Custom escalation rules configured with you",
      "Quarterly policy review session with a 3x CHRO",
      "Dedicated onboarding",
      "Priority support with response-time commitment",
    ],
    cta: "Contact Sales",
  },
];

export default PLANS;
