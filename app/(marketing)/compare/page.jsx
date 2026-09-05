import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import Reveal from "@/components/marketing/Reveal";
import JsonLd from "@/components/marketing/JsonLd";
import { pageMeta, faqLd, COMPARE_ROWS, PRIMARY_CTA, SECONDARY_CTA } from "@/lib/marketing/site";

// ============================================================================
// COMPARE — alternatives table (figures already published in the blog
// comparison posts) plus when each option is the right call.
// ============================================================================

export const metadata = pageMeta({
  title: "Compare | vs Moveworks, Leena AI, Workativ",
  description: "AI HR Pilot vs Moveworks, Leena AI and Workativ: price, company size, scope, setup time and compliance handling, side by side, from $99/mo.",
  path: "/compare",
});

const WHEN = [
  { name: "Choose Moveworks", body: "You have 10,000+ employees, five siloed support departments, a ServiceNow and Workday estate, and a budget that starts at $200K. Multi-department automation is the job; HR compliance is a feature.", slug: "ai-hr-pilot-vs-moveworks" },
  { name: "Choose Leena AI", body: "You are an enterprise standardizing HR service delivery across regions and you can run a months-long implementation with professional services.", slug: "ai-hr-pilot-vs-leena-ai" },
  { name: "Choose Workativ", body: "You want one general chatbot for IT and HR FAQs and you do not need risk triage, jurisdiction context or an escalation record.", slug: "ai-hr-pilot-vs-workativ" },
  { name: "Choose AI HR Pilot", body: "You are HR at a 50 to 2,000 person company or a PE portco, you employ people in more than one state, you want cited answers this week, and you are the person who has to defend the answer later.", slug: null },
];

const COMPARE_FAQ = [
  { q: "Is AI HR Pilot a Moveworks alternative?", a: "For companies with 50 to 2,000 employees, yes. Moveworks is built for 10,000+ employee enterprises at $200K to $1M+ per year with 3 to 9 month implementations. AI HR Pilot delivers HR-specific answers, risk triage and an audit log at $99 to $999 per month with setup in hours." },
  { q: "How does AI HR Pilot differ from Workativ?", a: "Workativ is a general-purpose chatbot adapted to HR and IT from $349/month. AI HR Pilot is HR-only: every answer is grounded in your handbook with a citation, every question is risk-scored, sensitive topics escalate to a named human, and answers carry the employee's work-state rules." },
  { q: "What does doing nothing cost?", a: "Roughly one HR coordinator's week per month answering repeat questions by hand, plus inconsistent verbal answers with no record. The record is the expensive part when a claim arrives." },
];

export default function ComparePage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "Compare", path: "/compare" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container">
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">Compare</span>
            <h1 className="mk-h1">AI HR Pilot against the alternatives, honestly.</h1>
            <p className="mk-lead">Moveworks and Leena AI are good products for companies ten times our buyer&apos;s size. Workativ is a general chatbot. Here is where each fits, using the figures from our published comparisons.</p>
          </div>

          <Reveal className="mk-tablewrap">
            <table className="mk-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th scope="col">Option</th>
                  <th scope="col">Price</th>
                  <th scope="col">Built for</th>
                  <th scope="col">Scope</th>
                  <th scope="col">Setup</th>
                  <th scope="col">Compliance handling</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td className="mk-td-name">{r.slug ? <Link href={`/blog/${r.slug}`} style={{ textDecoration: "underline" }}>{r.name}</Link> : r.name}</td>
                    <td className="mk-td-mono">{r.price}</td>
                    <td className="mk-td-mono">{r.size}</td>
                    <td>{r.scope}</td>
                    <td className="mk-td-mono">{r.setup}</td>
                    <td>{r.compliance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <p className="mk-small mk-mt-16">Competitor figures are public list or reported ranges as of the linked articles (April 2026); verify current pricing with each vendor.</p>

          <div className="mk-grid mk-grid--2 mk-mt-40">
            {WHEN.map((w) => (
              <Reveal key={w.name} className={`mk-card ${w.slug ? "" : "mk-card--ink"}`}>
                <h2 className="mk-h3">{w.name}</h2>
                <p className="mk-body mk-mt-8">{w.body}</p>
                {w.slug ? (
                  <Link href={`/blog/${w.slug}`} className="mk-btn mk-btn--link mk-mt-16" data-cta={`compare-${w.slug}`}>Full comparison →</Link>
                ) : (
                  <div className="mk-ctarow mk-mt-24">
                    <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="compare-trial">{PRIMARY_CTA.label}</Link>
                    <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--ghost" style={{ color: "#f7f7f5", borderColor: "#3a3b3f" }} data-cta="compare-talk">{SECONDARY_CTA.label}</a>
                  </div>
                )}
              </Reveal>
            ))}
          </div>

          <Reveal className="mk-mt-40 mk-prose" style={{ maxWidth: 860 }}>
            <h2 className="mk-h2">Common comparison questions</h2>
            {COMPARE_FAQ.map((f) => (
              <div key={f.q} className="mk-mt-24">
                <h3 className="mk-h3">{f.q}</h3>
                <p className="mk-body mk-mt-8">{f.a}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>
      <JsonLd data={faqLd(COMPARE_FAQ)} />
    </>
  );
}
