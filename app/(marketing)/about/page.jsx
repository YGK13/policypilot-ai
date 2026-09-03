import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import Reveal from "@/components/marketing/Reveal";
import JsonLd from "@/components/marketing/JsonLd";
import { pageMeta, personLd, organizationLd, PERSON, ORG, SISTER_LINKS, SECONDARY_CTA, PRIMARY_CTA, LAST_UPDATED } from "@/lib/marketing/site";

// ============================================================================
// ABOUT — entity clarity for people and answer engines: who built it, when,
// for whom, under what principles. Person + Organization JSON-LD.
// ============================================================================

export const metadata = pageMeta({
  title: "About | Built by a 3x CHRO with a JD",
  description: "AI HR Pilot is built by Yuri Kruman, a three-time CHRO with a JD, and published by Portfolio Leverage Company. Why it exists, who it is for, and the rules it is built under.",
  path: "/about",
});

const PRINCIPLES = [
  ["AI never answers the risky question", "Harassment, discrimination, ADA, FMLA, termination and anything that smells like a claim goes to a human with the draft attached. That rule is the product."],
  ["Every answer is traceable", "Citation, jurisdiction, risk score, reviewer. If it cannot be traced, it does not go out."],
  ["No unearned badges", "The security page lists what we do and what we have not done (own SOC 2, pentest, SSO). No invented testimonials, no logos of companies that did not buy."],
  ["Read-only by default", "Payroll and HRIS sync pull data; they never write. Writing to payroll is a different insurance conversation and we are not having it on a pilot."],
  ["Founding customers shape the order", "Slack and Teams, more states, more HRIS syncs: built in the order paying customers need them, priced at launch rates for as long as they stay."],
];

export default function AboutPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "About", path: "/about" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container">
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">About</span>
            <h1 className="mk-h1">Built by the person who has to defend the answer.</h1>
            <p className="mk-lead">
              AI HR Pilot exists because most HR AI was built by people who have never had to tell counsel what the company said to an employee.
            </p>
          </div>

          <div className="mk-founder">
            <Reveal className="mk-prose">
              <h2 className="mk-h2">{PERSON.name}</h2>
              <p className="mk-body">
                Three-time Chief Human Resources Officer at companies from 200 to 20,000 employees. JD from Cardozo Law, BA from the University of Pennsylvania. Has evaluated, bought and implemented enterprise HR technology, sat through the Moveworks demos, and signed six-figure contracts for platforms that took nine months to deploy.
              </p>
              <p className="mk-body">
                The observation behind the product: most companies buying enterprise AI chatbots are solving a $5,000 problem with a $500,000 tool, and the part of the problem that actually matters, the compliance record, is the part those tools treat as a feature card.
              </p>
              <p className="mk-body">
                Yuri writes <a href="https://leveragebrief.beehiiv.com" rel="noopener">The Leverage Brief</a> and publishes at <a href="https://yurikruman.com" rel="noopener">yurikruman.com</a> and <a href="https://www.linkedin.com/in/yurikruman/" rel="noopener">LinkedIn</a>.
              </p>
              <div className="mk-creds">
                {PERSON.credentials.map((c) => <span key={c} className="mk-chip">{c}</span>)}
              </div>
            </Reveal>
            <Reveal className="mk-card">
              <h2 className="mk-h3">{ORG.name}</h2>
              <p className="mk-body mk-mt-8">
                AI HR Pilot is published by {ORG.name} ({ORG.alternateName}), the studio that also builds diligence, compliance and workforce tools for operators and HR leaders. Product since 2026. Support at support@aihrpilot.com.
              </p>
              <h3 className="mk-eyebrow mk-mt-24">Sister products</h3>
              <ul className="mk-list mk-mt-8">
                {SISTER_LINKS.slice(0, 8).map((s) => <li key={s.href}><a href={s.href} rel="noopener">{s.label}</a></li>)}
              </ul>
            </Reveal>
          </div>

          <Reveal className="mk-mt-40">
            <span className="mk-eyebrow">Rules the product is built under</span>
            <div className="mk-grid mk-grid--2 mk-mt-16">
              {PRINCIPLES.map(([t, d]) => (
                <div key={t} className="mk-card">
                  <h2 className="mk-h3">{t}</h2>
                  <p className="mk-body mk-mt-8">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mk-mt-40 mk-card mk-card--ink">
            <h2 className="mk-h2">Talk to the founder before you trial, or after.</h2>
            <p className="mk-lead">Escalation rules and rollout plans for founding customers are reviewed by Yuri directly.</p>
            <div className="mk-ctarow mk-mt-24">
              <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="about-talk">{SECONDARY_CTA.label}</a>
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--ghost" style={{ color: "#f7f7f5", borderColor: "#3a3b3f" }} data-cta="about-trial">{PRIMARY_CTA.label}</Link>
            </div>
            <p className="mk-small mk-mt-16" style={{ color: "#b9bbbf" }}>Page last updated {LAST_UPDATED}.</p>
          </Reveal>
        </div>
      </section>
      <JsonLd data={[personLd(), organizationLd()]} />
    </>
  );
}
