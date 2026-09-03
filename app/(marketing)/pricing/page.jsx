import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import Reveal from "@/components/marketing/Reveal";
import Faq from "@/components/marketing/Faq";
import JsonLd from "@/components/marketing/JsonLd";
import { pageMeta, softwareLd, faqLd, PLAN_ROWS, PRICING_MATRIX, TRIAL_TERMS, FAQ_GROUPS, SECONDARY_CTA } from "@/lib/marketing/site";

// ============================================================================
// PRICING — three real plans from lib/data/plans.js, full feature matrix,
// billing FAQ. SoftwareApplication offers + FAQPage JSON-LD.
// ============================================================================

export const metadata = pageMeta({
  title: "Pricing | $99, $349, $999 per month",
  description: "AI HR Pilot pricing: Starter $99/mo (100 employees), Professional $349/mo (500 employees), Enterprise $999/mo (unlimited). 7-day free trial, no credit card, month to month.",
  path: "/pricing",
});

const PRICING_FAQ = FAQ_GROUPS.find((g) => g.group === "Pricing").items.concat([
  {
    q: "What counts as an employee?",
    a: "Anyone in your organization who can ask questions in the app, whether they were invited directly or synced from payroll. Admin, HR staff and legal seats count toward the same limit.",
  },
  {
    q: "What happens if we grow past the plan limit?",
    a: "Invites and document uploads beyond the plan limit are blocked with a clear message; nothing is silently overcharged. Upgrade from the billing page and the limit lifts immediately.",
  },
  {
    q: "Can we pay annually?",
    a: "Yes, on Professional and Enterprise. Email support@aihrpilot.com and we will set up annual invoicing; founding customers on annual keep their launch price.",
  },
]);

function Cell({ v }) {
  if (v === true) return <span className="mk-check" aria-label="Included" />;
  if (v === false) return <span className="mk-dash" aria-label="Not included">—</span>;
  return <span>{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Pricing", path: "/pricing" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container">
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">Pricing</span>
            <h1 className="mk-h1">Three plans. Stated plainly.</h1>
            <p className="mk-lead">{TRIAL_TERMS} Prices are per organization per month, not per seat. Founding customers keep their launch price for as long as they stay.</p>
          </div>

          <div className="mk-plans">
            {PLAN_ROWS.map((p) => (
              <Reveal key={p.id} className={`mk-plan ${p.popular ? "mk-plan--popular" : ""}`}>
                {p.popular && <span className="mk-plan__badge">Most teams start here</span>}
                <div className="mk-plan__name">{p.name}</div>
                <div className="mk-plan__price">${p.price}<small>/ month</small></div>
                <div className="mk-plan__meta">{p.employees} · {p.documents}</div>
                <ul className="mk-list">
                  {p.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={p.href} className={`mk-btn ${p.popular ? "mk-btn--signal" : "mk-btn--ghost"} mk-btn--block`} data-cta={`pricing-plan-${p.id}`}>{p.cta}</Link>
              </Reveal>
            ))}
          </div>

          <Reveal className="mk-mt-40">
            <h2 className="mk-h2">What is in each plan</h2>
            <div className="mk-tablewrap mk-mt-16">
              <table className="mk-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">Starter</th>
                    <th scope="col">Professional</th>
                    <th scope="col">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_MATRIX.map((r) => (
                    <tr key={r.feature}>
                      <td>{r.feature}</td>
                      <td><Cell v={r.starter} /></td>
                      <td><Cell v={r.professional} /></td>
                      <td><Cell v={r.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>

          <div className="mk-two mk-mt-40">
            <Reveal className="mk-card mk-card--ink">
              <h2 className="mk-h3">Private-equity portfolio pilot</h2>
              <p className="mk-body mk-mt-8">
                One portco on Professional or Enterprise for 60 days, with the founder configuring escalation rules and reviewing the first month of escalations with your HR lead. Then a portfolio rate for sibling companies, one login per company, one record per company.
              </p>
              <div className="mk-ctarow mk-mt-24">
                <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="pricing-pe-pilot">Ask about a portfolio pilot</a>
              </div>
            </Reveal>
            <Reveal className="mk-card">
              <h2 className="mk-h3">How the math usually works</h2>
              <p className="mk-body mk-mt-8">
                An HR coordinator answering repeat questions costs roughly a week of salary every month. Professional is $349. The compliance value is the part you cannot price until the day you need the record; that is the part we built first.
              </p>
              <p className="mk-small mk-mt-16">Estimate your own numbers with the ROI figures in the analytics dashboard after your first month; the default cost-per-ticket baseline is $12 and is configurable.</p>
            </Reveal>
          </div>

          <Reveal className="mk-mt-40" style={{ maxWidth: 860 }}>
            <h2 className="mk-h2">Billing questions</h2>
            <Faq items={PRICING_FAQ} />
          </Reveal>
        </div>
      </section>
      <JsonLd data={[softwareLd(), faqLd(PRICING_FAQ)]} />
    </>
  );
}
