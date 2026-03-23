// =============================================================================
// PRICING PLANS
// 3 tiers: Starter ($299), Professional ($799), Enterprise ($1999)
// =============================================================================

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    period: "/mo",
    features: [
      "Up to 100 employees",
      "3 policy documents",
      "Basic AI chat",
      "Email support",
      "1 HRIS integration",
      "Federal jurisdiction",
      "Basic analytics"
    ],
    cta: "Start Free Trial"
  },
  {
    id: "professional",
    name: "Professional",
    price: 799,
    period: "/mo",
    popular: true,
    features: [
      "Up to 500 employees",
      "Unlimited documents",
      "Advanced AI with context memory",
      "Priority support + Slack",
      "All HRIS/ATS integrations",
      "50-state jurisdiction engine",
      "Advanced analytics & reporting",
      "Custom branding",
      "API access (10K calls/mo)",
      "Webhook notifications"
    ],
    cta: "Start Free Trial"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 1999,
    period: "/mo",
    features: [
      "Unlimited employees",
      "Unlimited everything",
      "AI with custom fine-tuning",
      "Dedicated CSM + SLA",
      "SSO (Okta, Azure AD, Google)",
      "Global jurisdiction support",
      "Custom compliance rules",
      "White-label deployment",
      "Unlimited API access",
      "Custom integrations",
      "SOC 2 Type II compliant",
      "On-premise option"
    ],
    cta: "Contact Sales"
  }
];

export default PLANS;
