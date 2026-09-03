// ============================================================================
// MARKETING SITE DATA — single source of truth for the public surface.
// Every claim here must be verifiable in this repo or on the live product.
// Pricing is imported from lib/data/plans.js (also used by Stripe checkout),
// jurisdiction coverage from lib/data/jurisdictions.js, regulatory feed from
// lib/data/regulatory-updates.js, integrations from lib/payroll + connectors.
// ============================================================================

import PLANS from "@/lib/data/plans";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import REGULATORY_UPDATES from "@/lib/data/regulatory-updates";
import { ALL_CONNECTORS } from "@/lib/data/connectors";

export const SITE_URL = "https://aihrpilot.com";
export const SITE_NAME = "AI HR Pilot";
export const TAGLINE = "AI HR policy and compliance copilot for HR teams of 50 to 2,000";
export const DEFAULT_DESCRIPTION =
  "AI HR Pilot answers employee questions from your own handbook with citations, routes ADA, FMLA, harassment and wage questions to a human, and keeps an audit trail across federal law and 11 state jurisdictions.";
export const LAST_UPDATED = "2026-09-02";
export const SUPPORT_EMAIL = "support@aihrpilot.com";

export const NAV = [
  { href: "/features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compare", label: "Compare" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

export const PRIMARY_CTA = { href: "/sign-up", label: "Start free trial", id: "start-trial" };
export const SECONDARY_CTA = { href: `mailto:${SUPPORT_EMAIL}?subject=AI%20HR%20Pilot%20walkthrough`, label: "Talk to the founder", id: "talk-founder" };

export const PERSON = {
  name: "Yuri Kruman",
  jobTitle: "Founder, AI HR Pilot; CEO, Portfolio Leverage Company",
  description: "Three-time CHRO with a JD who built AI HR Pilot after running HR at companies from 200 to 20,000 employees.",
  url: "https://yurikruman.com",
  sameAs: [
    "https://www.linkedin.com/in/yurikruman/",
    "https://yurikruman.com",
    "https://portlev.com",
    "https://substack.com/@commanderinchief",
    "https://leveragebrief.beehiiv.com",
  ],
  credentials: ["3x CHRO", "JD, Cardozo Law", "BA, University of Pennsylvania"],
};

export const ORG = {
  name: "Portfolio Leverage Company",
  alternateName: "PortLev",
  url: "https://portlev.com",
  founder: PERSON.name,
};

export const SISTER_LINKS = [
  { href: "https://portlev.com", label: "PortLev" },
  { href: "https://yurikruman.com", label: "Yuri Kruman" },
  { href: "https://leveragebrief.beehiiv.com", label: "The Leverage Brief" },
  { href: "https://duedrill.com", label: "DueDrill" },
  { href: "https://i9drill.com", label: "I9Drill" },
  { href: "https://hrtalentsys.com", label: "HR Talent Sys" },
  { href: "https://chairaise.com", label: "ChaiRaise" },
  { href: "https://commanderinchief.ai", label: "Commander-in-Chief AI" },
  { href: "https://booktocourse.ai", label: "BookToCourse.AI" },
  { href: "https://careerbeastmode.com", label: "Career Beast Mode" },
  { href: "https://aiwagegap.com", label: "AI Wage Gap" },
  { href: "https://aibuildgap.com", label: "AI Build Gap" },
  { href: "https://learn.portlev.com", label: "PortLev Academy" },
  { href: "https://apps.portlev.com", label: "PortLev Labs" },
];

export const NEWSLETTER_URL = "https://leveragebrief.beehiiv.com/subscribe";

// ----------------------------------------------------------------------------
// Coverage proof — rendered straight from the jurisdiction database.
// ----------------------------------------------------------------------------
export const JURISDICTION_NAMES = Object.keys(JURISDICTIONS);
export const STATE_NAMES = JURISDICTION_NAMES.filter((j) => j !== "Federal");

export const COVERAGE_ROWS = JURISDICTION_NAMES.map((name) => {
  const j = JURISDICTIONS[name];
  return {
    name,
    finalPay: j.finalPay,
    ptoPayout: j.ptoPayout,
    sickLeave: j.sickLeave,
    payTransparency: j.payTransparency,
    minWage: j.minWage,
  };
});

export const COVERAGE_FIELDS = [
  "finalPay", "ptoPayout", "mealBreaks", "sickLeave", "payTransparency",
  "nonCompete", "minWage", "overtimeThreshold", "atWill",
];

export const POLICY_TOPIC_COUNT = 18;
export const POLICY_CATEGORIES = [
  "Leave & Time Off", "Benefits", "Compensation", "Workplace Policies",
  "Career & Development", "General Information", "Employment Status",
  "Workplace Issues", "Compliance & Legal",
];

export const REG_UPDATES = [...REGULATORY_UPDATES]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 5)
  .map((u) => ({ date: u.date, jurisdiction: u.jurisdiction, title: u.title, source: u.source, sourceUrl: u.sourceUrl, impact: u.impact }));

// ----------------------------------------------------------------------------
// Integrations — live adapters exist in lib/payroll/providers/*.js (read-only,
// one-way). Directory connectors store credentials only; sync is roadmap.
// ----------------------------------------------------------------------------
export const LIVE_SYNCS = [
  { name: "Gusto", auth: "OAuth 2.0", pulls: "roster, comp, paystubs, PTO balances" },
  { name: "BambooHR", auth: "API key", pulls: "employee directory, time off" },
  { name: "QuickBooks Payroll", auth: "Intuit OAuth 2.0", pulls: "roster, paystub summaries" },
  { name: "Finch", auth: "OAuth 2.0 (unified API)", pulls: "ADP Workforce Now, Paychex, Paylocity, UKG Pro and 25+ more" },
];

export const DIRECTORY_CONNECTORS = ALL_CONNECTORS.map((c) => c.name);

// ----------------------------------------------------------------------------
// Pricing — mirrors lib/data/plans.js exactly (guarded by tests).
// ----------------------------------------------------------------------------
export const PLAN_ROWS = PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  period: "per month",
  popular: Boolean(p.popular),
  features: p.features,
  cta: p.cta,
  href: p.id === "enterprise" ? SECONDARY_CTA.href : PRIMARY_CTA.href,
  employees: p.id === "starter" ? "Up to 100 employees" : p.id === "professional" ? "Up to 500 employees" : "Unlimited employees",
  documents: p.id === "starter" ? "10 handbook documents" : p.id === "professional" ? "50 handbook documents" : "Unlimited documents",
}));

export const TRIAL_TERMS = "7-day free trial. No credit card required. Cancel any time.";

export const PRICING_MATRIX = [
  { feature: "Employees covered", starter: "Up to 100", professional: "Up to 500", enterprise: "Unlimited" },
  { feature: "Handbook documents indexed", starter: "10", professional: "50", enterprise: "Unlimited" },
  { feature: "Answers cite the exact handbook section", starter: true, professional: true, enterprise: true },
  { feature: "Risk triage + auto-escalation (ADA, FMLA, harassment, wage)", starter: true, professional: true, enterprise: true },
  { feature: "Federal + 11-state jurisdiction context", starter: true, professional: true, enterprise: true },
  { feature: "Ticket tracking + basic analytics", starter: true, professional: true, enterprise: true },
  { feature: "Team roles (admin, HR staff, legal, employee)", starter: false, professional: true, enterprise: true },
  { feature: "Case management for sensitive matters", starter: false, professional: true, enterprise: true },
  { feature: "Self-service requests (PTO, leave, info changes)", starter: false, professional: true, enterprise: true },
  { feature: "Full analytics + audit log", starter: false, professional: true, enterprise: true },
  { feature: "Read-only payroll/HRIS sync (Gusto, BambooHR, QuickBooks, Finch)", starter: false, professional: true, enterprise: true },
  { feature: "Custom escalation rules configured with you", starter: false, professional: false, enterprise: true },
  { feature: "Quarterly policy review with a 3x CHRO", starter: false, professional: false, enterprise: true },
  { feature: "Dedicated onboarding + response-time commitment", starter: false, professional: false, enterprise: true },
  { feature: "Support", starter: "Email", professional: "Priority email", enterprise: "Priority, with SLA" },
];

// ----------------------------------------------------------------------------
// FAQ — direct answers first (AEO). Home shows a subset; /faq shows all.
// ----------------------------------------------------------------------------
export const FAQ_GROUPS = [
  {
    group: "What it is",
    items: [
      {
        q: "What is AI HR Pilot?",
        a: "AI HR Pilot is an AI HR policy and compliance copilot for HR teams at companies with 50 to 2,000 employees. It answers employee questions from your own handbook with a citation to the exact section, scores every question for legal risk, routes sensitive topics (ADA, FMLA, harassment, wage disputes) to a human, and keeps an audit log of what was asked and answered.",
      },
      {
        q: "Who is AI HR Pilot for?",
        a: "HR Directors, VPs of People and CHROs at 50 to 2,000 person companies, and HR operators inside private-equity portfolio companies who run multi-state teams without a large HR department. It was built by Yuri Kruman, a three-time CHRO with a JD, and is published by Portfolio Leverage Company.",
      },
      {
        q: "Is this an employee handbook AI generator?",
        a: "Not primarily. AI HR Pilot reads the handbook and policies you already have and answers from them. Policy drafting help exists inside the product for gaps the analytics surface, but the core job is answering, triaging and documenting, not generating a handbook from scratch.",
      },
      {
        q: "How is it different from a generic HR chatbot?",
        a: "Three ways: every answer is grounded in your uploaded documents and cites the section; every question is risk-scored and legally sensitive topics escalate to a named human instead of being answered by AI; and answers carry federal plus state employment-law context for the employee's work state.",
      },
    ],
  },
  {
    group: "Coverage and accuracy",
    items: [
      {
        q: "Which states does AI HR Pilot cover?",
        a: `Federal law plus ${STATE_NAMES.length} state jurisdictions today: ${STATE_NAMES.join(", ")}. Each carries final-pay, PTO payout, meal-break, sick-leave, pay-transparency, non-compete, minimum-wage and overtime rules. Additional states are added on customer request.`,
      },
      {
        q: "What if the AI gives a wrong answer?",
        a: "Every answer includes a policy citation so the employee and HR can verify it. Low-confidence answers and high-risk topics do not go out unreviewed; they are escalated to HR staff with the draft attached. The audit log records what was answered so a mistake can be found and corrected.",
      },
      {
        q: "What topics are always escalated to a human?",
        a: "Harassment, discrimination, retaliation, ADA accommodations, FMLA and pregnancy-related leave, termination and layoffs, investigations, and anything mentioning lawsuits, the EEOC, the DOL or an attorney. The risk scorer weights keywords, topic category and context, and you can tighten the rules further.",
      },
      {
        q: "Does it keep up with new employment laws?",
        a: "The product ships a regulatory update feed of federal and state changes with source links (for example DOL overtime thresholds, California pay-scale enforcement, New York PFL rates). Enterprise customers also get a quarterly policy review session with the founder.",
      },
    ],
  },
  {
    group: "Setup and integrations",
    items: [
      {
        q: "How long does setup take?",
        a: "Hours, not months. Upload your handbook and policy documents (PDF or Word), invite your HR team, and employees can start asking questions the same day. No IT project is required.",
      },
      {
        q: "Which payroll and HRIS systems connect?",
        a: "Read-only, one-way sync is built for Gusto, BambooHR, QuickBooks Payroll, and Finch (which covers ADP Workforce Now, Paychex, Paylocity, UKG Pro and 25+ others). AI HR Pilot never writes to payroll. A wider connector directory (Workday, Rippling, Okta, Slack, Teams and more) stores credentials today with live sync on the roadmap.",
      },
      {
        q: "Does it work in Slack or Microsoft Teams?",
        a: "Not yet. Employees use the web app today. Slack and Teams channels are on the roadmap and founding customers vote on the order.",
      },
    ],
  },
  {
    group: "Security and privacy",
    items: [
      {
        q: "Is my HR data secure?",
        a: "Data is encrypted in transit (TLS) and at rest by our providers (Vercel, Neon). Every database query is scoped to your organization server-side. Roles are enforced on every API route. Your documents and conversations are never used to train AI models. AI HR Pilot has not completed its own SOC 2 audit yet and says so on its security page rather than showing an unearned badge.",
      },
      {
        q: "Who can see employee questions?",
        a: "Employees see their own conversations. HR staff and HR admins see tickets and cases for their organization. Legal role sees sensitive cases. All access is logged.",
      },
      {
        q: "What payroll data is stored?",
        a: "Roster, compensation rate, recent paystub summaries and PTO balances for the org that connected the provider. No SSNs and no bank routing numbers are stored; those fields are dropped at ingestion. Disconnecting a provider deletes its data.",
      },
    ],
  },
  {
    group: "Pricing",
    items: [
      {
        q: "How much does AI HR Pilot cost?",
        a: `Starter is $${PLANS[0].price}/month (up to 100 employees, 10 documents). Professional is $${PLANS[1].price}/month (up to 500 employees, 50 documents, team roles, case management, full analytics and audit log). Enterprise is $${PLANS[2].price}/month (unlimited employees and documents, custom escalation rules, quarterly policy review with a 3x CHRO). Every plan starts with a 7-day free trial and no credit card.`,
      },
      {
        q: "Is there a contract?",
        a: "No. Plans are month to month and can be cancelled any time from the billing page. Founding customers keep their launch price for as long as they stay.",
      },
      {
        q: "Do you offer a pilot for PE portfolio companies?",
        a: "Yes. A portfolio pilot runs one portco on Professional or Enterprise for 60 days with the founder configuring escalation rules, then rolls out to sibling companies at a portfolio rate. Email support@aihrpilot.com with the number of companies and headcount.",
      },
    ],
  },
];

export const ALL_FAQS = FAQ_GROUPS.flatMap((g) => g.items);
export const HOME_FAQS = [
  ALL_FAQS[0], ALL_FAQS[1], ALL_FAQS[4], ALL_FAQS[5], ALL_FAQS[8], ALL_FAQS[11], ALL_FAQS[14],
];

// ----------------------------------------------------------------------------
// "What it does in 60 seconds"
// ----------------------------------------------------------------------------
export const SIXTY_SECONDS = [
  { t: "0:00", title: "Upload the handbook", body: "PDF or Word. The document is chunked, indexed and cited by section. Ten documents on Starter, fifty on Professional." },
  { t: "0:15", title: "An employee asks", body: "\"Do I get paid out for unused PTO if I leave?\" The answer comes from your leave policy, adjusted for the employee's work state, with the section cited." },
  { t: "0:30", title: "Risk is scored", body: "Keywords, topic category and context produce a risk score. PTO payout in Illinois: low, answered. \"I think I was fired for reporting harassment\": critical, never answered by AI." },
  { t: "0:45", title: "Sensitive topics route to a human", body: "The critical question becomes a case, assigned to HR or legal with the draft and the employee's context attached. The employee gets a human reply, not a hallucination." },
  { t: "0:60", title: "Everything is on the record", body: "Question, answer, citation, score, escalation and reviewer are logged. Analytics show what employees ask most and where the handbook has gaps." },
];

// ----------------------------------------------------------------------------
// Sample triage feed for the hero — illustrative rows, statute references
// pulled from the jurisdiction database. Clearly labelled as a sample.
// ----------------------------------------------------------------------------
export const FEED_ROWS = [
  { who: "Employee, Illinois", q: "Do I get paid for unused vacation when I leave?", log: ["Matched: Leave & Time Off Policy §4.2", "Jurisdiction: Illinois — 820 ILCS 115/5 requires payout", "Risk score: 5 (low)"], state: "answered" },
  { who: "Employee, California", q: "How many sick days do I get?", log: ["Matched: Leave & Time Off Policy §4.5", "Jurisdiction: California — minimum 40 hours paid", "Risk score: 0 (low)"], state: "answered" },
  { who: "Employee, New York", q: "I think my manager cut my hours because I filed a complaint.", log: ["Flag: HIGH \"complaint\" + HIGH \"retaliation\" pattern", "Category: Workplace Issues (+30)", "Risk score: 70 (critical) — not answered by AI"], state: "escalated", to: "Routed to HR admin + legal" },
  { who: "Employee, Texas", q: "When is my final paycheck if I resign?", log: ["Matched: Compensation Policy §2.1", "Jurisdiction: Texas — next scheduled payday", "Risk score: 10 (low)"], state: "answered" },
  { who: "Employee, Colorado", q: "Can I see the salary range for the open role on my team?", log: ["Matched: Compensation Policy §2.4", "Jurisdiction: Colorado — EPEWA requires ranges in postings", "Risk score: 10 (low)"], state: "answered" },
  { who: "Employee, Massachusetts", q: "I need time off for a pregnancy-related condition.", log: ["Flag: HIGH \"pregnancy\" + \"accommodation\" context", "Category: Compliance & Legal (+40)", "Risk score: 60 (high) — draft held for review"], state: "escalated", to: "Routed to HR staff" },
  { who: "Employee, Washington", q: "What's the meal break rule for a 10-hour shift?", log: ["Matched: Workplace Policies §6.1", "Jurisdiction: Washington — 30 min meal per 5 hours", "Risk score: 5 (low)"], state: "answered" },
  { who: "Employee, New Jersey", q: "How do I request FMLA for my father's surgery?", log: ["Matched: Leave & Time Off Policy §4.7", "Jurisdiction: New Jersey — NJFLA runs alongside FMLA", "Risk score: 20 (medium) — answered with HR notified"], state: "answered" },
];

// ----------------------------------------------------------------------------
// Compare page — figures already published in the blog comparison posts.
// ----------------------------------------------------------------------------
export const COMPARE_ROWS = [
  { name: "AI HR Pilot", price: "$99 to $999 / month", size: "50 to 2,000 employees", scope: "HR policy answers, risk triage, cases, audit log, payroll sync (read-only)", setup: "Hours", compliance: "Risk scoring + escalation built in; federal + 11-state context", slug: null },
  { name: "Moveworks", price: "$200K to $1M+ / year", size: "10,000+ employees", scope: "IT + HR + Finance + Facilities employee support", setup: "3 to 9 months", compliance: "Enterprise certifications; HR compliance is not a core focus", slug: "ai-hr-pilot-vs-moveworks" },
  { name: "Leena AI", price: "$50K to $200K+ / year", size: "5,000+ employees", scope: "Enterprise HR service delivery", setup: "Months", compliance: "Enterprise certifications; generic HR knowledge", slug: "ai-hr-pilot-vs-leena-ai" },
  { name: "Workativ", price: "From $349 / month", size: "SMB to mid-market", scope: "General-purpose chatbot adapted to HR and IT", setup: "Days to weeks", compliance: "No HR-specific risk triage", slug: "ai-hr-pilot-vs-workativ" },
  { name: "Doing it by hand", price: "One HR coordinator's week, every week", size: "Any", scope: "Slack DMs, email, verbal answers", setup: "Already running", compliance: "Inconsistent answers, no record", slug: null },
];

// ----------------------------------------------------------------------------
// JSON-LD builders
// ----------------------------------------------------------------------------
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ORG.url}/#organization`,
    name: ORG.name,
    alternateName: ORG.alternateName,
    url: ORG.url,
    founder: { "@type": "Person", "@id": `${PERSON.url}/#person`, name: PERSON.name },
    brand: { "@type": "Brand", name: SITE_NAME, url: SITE_URL },
    contactPoint: { "@type": "ContactPoint", email: SUPPORT_EMAIL, contactType: "customer support" },
    sameAs: ["https://www.linkedin.com/in/yurikruman/", "https://yurikruman.com"],
  };
}

export function personLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${PERSON.url}/#person`,
    name: PERSON.name,
    jobTitle: PERSON.jobTitle,
    description: PERSON.description,
    url: PERSON.url,
    sameAs: PERSON.sameAs,
    worksFor: { "@type": "Organization", "@id": `${ORG.url}/#organization`, name: ORG.name },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@id": `${ORG.url}/#organization` },
    inLanguage: "en-US",
  };
}

export function softwareLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Human resources compliance software",
    operatingSystem: "Web",
    author: { "@id": `${PERSON.url}/#person` },
    publisher: { "@id": `${ORG.url}/#organization` },
    featureList: [
      "Answers employee questions from uploaded handbook with section citations",
      "Risk scoring and automatic escalation of ADA, FMLA, harassment and wage topics",
      `Federal plus ${STATE_NAMES.length}-state employment-law context`,
      "Case management, self-service requests, analytics and audit log",
      "Read-only payroll and HRIS sync: Gusto, BambooHR, QuickBooks Payroll, Finch",
    ],
    offers: PLANS.map((p) => ({
      "@type": "Offer",
      name: `${p.name} plan`,
      price: String(p.price),
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(p.price),
        priceCurrency: "USD",
        billingIncrement: 1,
        unitCode: "MON",
      },
    })),
  };
}

export function faqLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

// Route-level metadata helper: canonical + OG + Twitter with one call.
export function pageMeta({ title, description, path, type = "website" }) {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: `${SITE_NAME} — ${TAGLINE}` }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE_URL}/opengraph-image`] },
  };
}
