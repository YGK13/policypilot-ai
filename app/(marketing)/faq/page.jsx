import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import Faq from "@/components/marketing/Faq";
import JsonLd from "@/components/marketing/JsonLd";
import { pageMeta, faqLd, FAQ_GROUPS, ALL_FAQS, PRIMARY_CTA, SECONDARY_CTA, STATE_NAMES } from "@/lib/marketing/site";

// ============================================================================
// FAQ — the answer-engine page. Definition paragraph first, then grouped
// direct answers. FAQPage JSON-LD covers every question.
// ============================================================================

export const metadata = pageMeta({
  title: "FAQ | Coverage, pricing, security, escalation",
  description: "Direct answers: what AI HR Pilot is, the states it covers, how it handles ADA, FMLA and harassment, payroll connections, security and pricing.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: "FAQ", path: "/faq" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container" style={{ maxWidth: 880 }}>
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">FAQ</span>
            <h1 className="mk-h1">Direct answers for HR buyers.</h1>
            <p className="mk-lead">
              <strong>What is AI HR Pilot?</strong> An AI HR policy and compliance copilot for HR teams at 50 to 2,000 person companies. It answers employee questions from your own handbook with a citation, scores each question for legal risk, routes sensitive topics to a human, carries federal plus {STATE_NAMES.length}-state employment-law context, and keeps an audit log. Built by a 3x CHRO with a JD; published by Portfolio Leverage Company.
            </p>
          </div>
          <Faq groups={FAQ_GROUPS} />
          <div className="mk-card mk-mt-40">
            <h2 className="mk-h3">Still a question?</h2>
            <p className="mk-body mk-mt-8">Email the founder directly, or start the trial and ask the product with your own handbook loaded.</p>
            <div className="mk-ctarow mk-mt-16">
              <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--ghost" data-cta="faq-talk">{SECONDARY_CTA.label}</a>
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="faq-trial">{PRIMARY_CTA.label}</Link>
            </div>
          </div>
        </div>
      </section>
      <JsonLd data={faqLd(ALL_FAQS)} />
    </>
  );
}
