import Link from "next/link";
import TriageFeed from "@/components/marketing/TriageFeed";
import Reveal from "@/components/marketing/Reveal";
import Faq from "@/components/marketing/Faq";
import JsonLd from "@/components/marketing/JsonLd";
import NewsletterBox from "@/components/marketing/NewsletterBox";
import {
  pageMeta, softwareLd, faqLd, HOME_FAQS, SIXTY_SECONDS, COVERAGE_ROWS, STATE_NAMES,
  REG_UPDATES, LIVE_SYNCS, DIRECTORY_CONNECTORS, PLAN_ROWS, TRIAL_TERMS, PERSON,
  PRIMARY_CTA, SECONDARY_CTA, POLICY_TOPIC_COUNT,
} from "@/lib/marketing/site";

// ============================================================================
// HOME — "Signal" concept. Compliance-outcome hero with the triage feed as
// the product surface; proof bar; what it does in 60 seconds; outcomes by
// buyer; coverage proof from the jurisdiction database; security; pricing;
// integrations ledger; founder; FAQ; final CTA + newsletter.
// ============================================================================

export const metadata = pageMeta({
  title: "AI HR Pilot | AI HR Policy & Compliance Copilot",
  description:
    "Answer employee questions from your own handbook with citations, route ADA, FMLA and harassment questions to a human, and keep the record. Federal + 11-state coverage. From $99/mo.",
  path: "/",
});

const OUTCOMES = [
  {
    who: "For the HR Director or CHRO",
    points: [
      "Tier-1 questions (PTO, benefits, policy lookups) answered from the handbook with the section cited, so your team stops being a search engine.",
      "Every ADA, FMLA, harassment or wage question lands with a human, with the draft and context attached, never improvised by AI.",
      "One audit log of what was asked, what was answered and who reviewed it. When legal asks \"what did we tell them,\" you have the record.",
      "Analytics show the questions your handbook does not answer, which is the policy work worth doing next.",
    ],
  },
  {
    who: "For the PE portco operator",
    points: [
      "Multi-state teams without a multi-state HR department: answers carry the employee's work-state rules for final pay, sick leave, pay transparency and more.",
      "Consistent answers across business units and sibling companies instead of whatever the nearest manager remembers.",
      "Read-only payroll sync (Gusto, BambooHR, QuickBooks, Finch) means paycheck and PTO questions get cited answers, not \"check your paystub.\"",
      "A defensible record for diligence, carve-outs and exits. Pilot one portco, then roll to the rest at a portfolio rate.",
    ],
  },
];

const SECURITY = [
  ["Tenant isolation", "Every query is scoped to your organization on the server. The client never supplies an org id."],
  ["Roles on every route", "HR admin, HR staff, legal and employee roles are enforced at the API, not just in the UI."],
  ["Encrypted in transit and at rest", "TLS in transit; at rest via Vercel and Neon. Auth by Clerk (SOC 2 Type II provider). Payments by Stripe (PCI DSS Level 1)."],
  ["Your data never trains models", "Documents and conversations are used only to answer your organization's questions."],
  ["Payroll data minimization", "No SSNs, no bank routing numbers. Dropped at ingestion. Disconnect wipes synced data."],
  ["Audit log", "Questions, answers, escalations and admin actions are logged and reviewable by your admins."],
];

export default function HomePage() {
  return (
    <>
      {/* ================= HERO ================= */}
      <section className="mk-hero">
        <div className="mk-container mk-hero__grid">
          <div>
            <span className="mk-eyebrow">AI HR policy &amp; compliance copilot · teams of 50 to 2,000</span>
            <h1 className="mk-h1">
              Your handbook, answering. <span className="mk-mark">Your compliance risk, caught early.</span>
            </h1>
            <p className="mk-lead">
              AI HR Pilot reads your policies, answers employees with a citation to the exact section, and routes ADA, FMLA, harassment and wage questions to a human, with a full audit trail across federal law and {STATE_NAMES.length} state jurisdictions.
            </p>
            <div className="mk-ctarow">
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal mk-btn--full-sm" data-cta="hero-trial">{PRIMARY_CTA.label}</Link>
              <a href="#sixty" className="mk-btn mk-btn--link" data-cta="hero-sixty">See it read a real policy →</a>
            </div>
            <p className="mk-hero__note">{TRIAL_TERMS} Built by a 3x CHRO with a JD.</p>
          </div>
          <TriageFeed />
        </div>
      </section>

      {/* ================= PROOF BAR ================= */}
      <section className="mk-proof" aria-label="Proof points">
        <div className="mk-container">
          <div className="mk-proof__grid">
            {[
              ["Cited", "every answer names the handbook section"],
              [`Federal + ${STATE_NAMES.length}`, "state jurisdictions in the law database"],
              [String(POLICY_TOPIC_COUNT), "policy topics pre-mapped and risk-weighted"],
              ["4", "read-only payroll/HRIS syncs live"],
              ["Hours", "to first answer, not months"],
            ].map(([n, l]) => (
              <div key={l} className="mk-proof__item">
                <div className="mk-proof__num">{n}</div>
                <div className="mk-proof__label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 60 SECONDS ================= */}
      <section className="mk-section" id="sixty">
        <div className="mk-container">
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">What it does in 60 seconds</span>
            <h2 className="mk-h2">Upload. Ask. Score. Route. Record.</h2>
            <p className="mk-lead">One employee question, start to finish. No demo request needed to understand it.</p>
          </Reveal>
          <Reveal as="ol" className="mk-steps">
            {SIXTY_SECONDS.map((s) => (
              <li key={s.t} className="mk-step">
                <span className="mk-step__t">{s.t}</span>
                <div>
                  <div className="mk-step__title">{s.title}</div>
                  <p className="mk-body">{s.body}</p>
                </div>
              </li>
            ))}
          </Reveal>
          <div className="mk-ctarow mk-mt-24">
            <Link href="/features" className="mk-btn mk-btn--ghost" data-cta="sixty-features">Product in detail</Link>
          </div>
        </div>
      </section>

      <hr className="mk-rule" />

      {/* ================= OUTCOMES BY BUYER ================= */}
      <section className="mk-section">
        <div className="mk-container">
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">Outcomes</span>
            <h2 className="mk-h2">Built for the person who has to defend the answer.</h2>
            <p className="mk-lead">Two buyers, one product: the HR leader who owns the handbook and the operator who owns the risk.</p>
          </Reveal>
          <div className="mk-grid mk-grid--2">
            {OUTCOMES.map((o, i) => (
              <Reveal key={o.who} className={`mk-card ${i === 1 ? "mk-card--ink" : ""}`}>
                <h3 className="mk-h3">{o.who}</h3>
                <ul className={`mk-list mk-mt-16 ${i === 1 ? "mk-list--ink" : ""}`}>
                  {o.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COVERAGE PROOF ================= */}
      <section className="mk-section" id="coverage" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">Coverage proof</span>
            <h2 className="mk-h2">Federal law plus {STATE_NAMES.length} states, read for every answer.</h2>
            <p className="mk-lead">
              Rendered live from the product&apos;s jurisdiction database. Each state also carries meal-break, non-compete, overtime-threshold and at-will rules, and state leave programs where they exist.
            </p>
          </Reveal>
          <Reveal className="mk-tablewrap">
            <table className="mk-table mk-table--compact">
              <thead>
                <tr>
                  <th scope="col">Jurisdiction</th>
                  <th scope="col">Final pay</th>
                  <th scope="col">PTO payout</th>
                  <th scope="col">Paid sick leave</th>
                  <th scope="col">Pay transparency</th>
                </tr>
              </thead>
              <tbody>
                {COVERAGE_ROWS.map((r) => (
                  <tr key={r.name}>
                    <td className="mk-td-name">{r.name}</td>
                    <td className="mk-td-mono">{r.finalPay}</td>
                    <td className="mk-td-mono">{r.ptoPayout}</td>
                    <td className="mk-td-mono">{r.sickLeave}</td>
                    <td className="mk-td-mono">{r.payTransparency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <div className="mk-two mk-mt-40">
            <Reveal>
              <span className="mk-eyebrow">Regulatory feed</span>
              <h3 className="mk-h3 mk-mt-8">Recent changes the product tracks, with sources.</h3>
              <ul className="mk-reg mk-mt-16">
                {REG_UPDATES.map((u) => (
                  <li key={u.title}>
                    <span className="mk-reg__date">{u.date}</span>
                    <span className="mk-reg__jur">{u.jurisdiction}</span>
                    <span className="mk-reg__title">{u.title}</span>
                    <a className="mk-reg__src" href={u.sourceUrl} rel="noopener nofollow" target="_blank">{u.source}</a>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal>
              <span className="mk-eyebrow">Always escalated</span>
              <h3 className="mk-h3 mk-mt-8">Topics AI never answers on its own.</h3>
              <p className="mk-body mk-mt-8">
                The risk scorer weights critical keywords at 40 points, high at 20, medium at 10, then adds the topic category (Compliance &amp; Legal +40, Workplace Issues +30, Employment Status +25). Anything above the threshold becomes a case for a named human.
              </p>
              <div className="mk-chips mk-mt-16">
                {["harassment", "discrimination", "retaliation", "ADA accommodation", "FMLA", "pregnancy", "termination", "layoff", "investigation", "EEOC", "DOL complaint", "lawsuit", "whistleblower", "OSHA", "pay equity"].map((t) => (
                  <span key={t} className="mk-chip">{t}</span>
                ))}
              </div>
              <p className="mk-small mk-mt-16">You can tighten the rules further. Enterprise plans configure custom escalation with the founder.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================= SECURITY ================= */}
      <section className="mk-section" style={{ paddingTop: 0 }} id="security">
        <div className="mk-container">
          <Reveal className="mk-sec">
            <span className="mk-eyebrow">Security &amp; privacy</span>
            <h2 className="mk-h2">HR data, handled like HR data.</h2>
            <p className="mk-lead">What we do today, stated plainly, with nothing we have not earned.</p>
            <div className="mk-sec__grid">
              {SECURITY.map(([t, d]) => (
                <div key={t} className="mk-sec__item"><strong>{t}</strong><span>{d}</span></div>
              ))}
            </div>
            <div className="mk-sec__honest">
              Not yet: our own SOC 2 audit, a third-party pentest, SSO/SAML. On the roadmap by customer demand. Full detail on the <Link href="/security">security page</Link>.
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section className="mk-section" id="pricing" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">Pricing</span>
            <h2 className="mk-h2">Less than one HR coordinator&apos;s week. Every month.</h2>
            <p className="mk-lead">{TRIAL_TERMS} Founding customers keep their launch price.</p>
          </Reveal>
          <div className="mk-plans">
            {PLAN_ROWS.map((p) => (
              <Reveal key={p.id} className={`mk-plan ${p.popular ? "mk-plan--popular" : ""}`}>
                {p.popular && <span className="mk-plan__badge">Most teams start here</span>}
                <div className="mk-plan__name">{p.name}</div>
                <div className="mk-plan__price">${p.price}<small>/ month</small></div>
                <div className="mk-plan__meta">{p.employees} · {p.documents}</div>
                <ul className="mk-list">
                  {p.features.slice(0, 5).map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href={p.href} className={`mk-btn ${p.popular ? "mk-btn--signal" : "mk-btn--ghost"} mk-btn--block`} data-cta={`home-plan-${p.id}`}>{p.cta}</Link>
              </Reveal>
            ))}
          </div>
          <p className="mk-small mk-mt-16">Full feature matrix and billing questions on the <Link href="/pricing" style={{ textDecoration: "underline" }}>pricing page</Link>.</p>
        </div>
      </section>

      {/* ================= INTEGRATIONS ================= */}
      <section className="mk-section" style={{ paddingTop: 0 }} id="integrations">
        <div className="mk-container">
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">Integrations</span>
            <h2 className="mk-h2">Reads from the systems you already run. Writes nothing.</h2>
            <p className="mk-lead">Payroll is the source of truth. Sync is read-only and one-way, nightly plus provider webhooks.</p>
          </Reveal>
          <Reveal as="ul" className="mk-ledger">
            {LIVE_SYNCS.map((s) => (
              <li key={s.name}>
                <span className="mk-ledger__name">{s.name}</span>
                <span className="mk-ledger__auth">{s.auth}</span>
                <span className="mk-ledger__pulls">{s.pulls}</span>
              </li>
            ))}
          </Reveal>
          <p className="mk-small mk-mt-16">Connector directory (credentials stored today, live sync on the roadmap): {DIRECTORY_CONNECTORS.join(", ")}. Slack and Teams channels are roadmap; employees use the web app today.</p>
        </div>
      </section>

      <hr className="mk-rule" />

      {/* ================= FOUNDER ================= */}
      <section className="mk-section" id="founder">
        <div className="mk-container mk-founder">
          <Reveal>
            <span className="mk-eyebrow">Who built it</span>
            <h2 className="mk-h2">Built by a CHRO who has sat in the employee-relations meeting.</h2>
            <p className="mk-body">
              {PERSON.name} has run HR three times as CHRO, at companies from 200 to 20,000 employees, and holds a JD. Most HR chatbots were built by engineers who have never had to explain to counsel what the company told an employee. AI HR Pilot was built by someone who has, which is why the escalation rules are the architecture, not an add-on.
            </p>
            <div className="mk-creds">
              {PERSON.credentials.map((c) => <span key={c} className="mk-chip">{c}</span>)}
              <span className="mk-chip">Published by Portfolio Leverage Company</span>
            </div>
          </Reveal>
          <Reveal className="mk-card">
            <h3 className="mk-h3">Founding customer program</h3>
            <p className="mk-body mk-mt-8">AI HR Pilot is early on purpose. We will not show you invented testimonials. Founding customers get:</p>
            <ul className="mk-list mk-mt-16">
              <li>Escalation rules, policy edge cases and rollout reviewed personally by the founder, not a support queue.</li>
              <li>Launch pricing locked for as long as you stay.</li>
              <li>Roadmap votes that count double: Slack and Teams channels, additional states, HRIS sync order.</li>
            </ul>
            <div className="mk-ctarow mk-mt-24">
              <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--ghost" data-cta="founder-talk">{SECONDARY_CTA.label}</a>
              <Link href="/about" className="mk-btn mk-btn--link" data-cta="founder-about">About →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="mk-section" id="faq" style={{ paddingTop: 0 }}>
        <div className="mk-container" style={{ maxWidth: 860 }}>
          <Reveal className="mk-sectionhead">
            <span className="mk-eyebrow">Questions HR buyers ask</span>
            <h2 className="mk-h2">Direct answers.</h2>
          </Reveal>
          <Faq items={HOME_FAQS} />
          <p className="mk-small mk-mt-16">More on the <Link href="/faq" style={{ textDecoration: "underline" }}>full FAQ</Link>.</p>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="mk-section mk-final">
        <div className="mk-container mk-final__grid">
          <Reveal>
            <span className="mk-eyebrow">Start</span>
            <h2 className="mk-h2">Upload the handbook today. Answer with citations tomorrow.</h2>
            <p className="mk-lead">{TRIAL_TERMS}</p>
            <div className="mk-ctarow mk-mt-24">
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="final-trial">{PRIMARY_CTA.label}</Link>
              <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--ghost" data-cta="final-talk">{SECONDARY_CTA.label}</a>
            </div>
          </Reveal>
          <Reveal><NewsletterBox /></Reveal>
        </div>
      </section>

      <JsonLd data={[softwareLd(), faqLd(HOME_FAQS)]} />
    </>
  );
}
