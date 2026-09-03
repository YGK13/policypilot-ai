import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import Reveal from "@/components/marketing/Reveal";
import JsonLd from "@/components/marketing/JsonLd";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import { pageMeta, softwareLd, JURISDICTION_NAMES, STATE_NAMES, LIVE_SYNCS, DIRECTORY_CONNECTORS, POLICY_CATEGORIES, PRIMARY_CTA, SECONDARY_CTA, TRIAL_TERMS } from "@/lib/marketing/site";

// ============================================================================
// FEATURES / PRODUCT — pillars in depth, full jurisdiction matrix, risk
// scoring explained, roles, integrations. Everything here exists in the app.
// ============================================================================

export const metadata = pageMeta({
  title: "Product | Cited answers, risk triage, audit log",
  description: "How AI HR Pilot works: handbook-grounded answers with citations, risk scoring that escalates ADA, FMLA and harassment to humans, case management, audit log, federal + 11-state law context, read-only payroll sync.",
  path: "/features",
});

const PILLARS = [
  {
    title: "Answers from your handbook, with the section cited",
    body: "Upload PDF or Word policies. Each document is chunked with its section reference preserved, indexed with embeddings and a keyword fallback, and every answer names the chunk it came from. If the handbook does not cover it, the product says so instead of inventing an answer.",
    list: ["10 / 50 / unlimited documents by plan", "Employee's work state applied to leave, pay and break rules", "Confidence and citation shown to the employee and to HR"],
  },
  {
    title: "Risk scoring and human escalation",
    body: "Every question is scored before anything is sent. Critical keywords (lawsuit, EEOC, discrimination, wrongful termination, whistleblower, OSHA, class action, labor board) add 40 points. High keywords (harassment, terminated, retaliation, ADA, FMLA, pregnancy, accommodation, investigation, PIP) add 20. Medium (complaint, unfair, grievance, pay gap) add 10. Topic category adds up to 40. Above the threshold, AI does not answer; a case is opened for HR or legal with the draft attached.",
    list: ["Six escalation reasons tracked for analytics", "Employee sees a human is on it, not a hallucination", "Custom rules on Enterprise, configured with the founder"],
  },
  {
    title: "Cases, roles and self-service",
    body: "Sensitive matters become cases with notes, documents and assignment. Four roles are enforced on every API route: HR admin, HR staff, legal, employee. PTO, leave and information-change requests flow through structured self-service with HR review rather than scattered messages.",
    list: ["Team roles from Professional", "Case management for sensitive matters", "Self-service requests with HR review"],
  },
  {
    title: "Analytics and the audit log",
    body: "See what employees ask most, what auto-resolves, what escalates and why, and which topics your handbook never answers. The audit log records questions, answers, citations, escalations and admin actions so the record exists before anyone asks for it.",
    list: ["Ticket volume, resolution and escalation trends", "Policy gap list: the questions no document answers", "Exportable audit trail"],
  },
];

const FIELD_LABELS = {
  finalPay: "Final pay", ptoPayout: "PTO payout", mealBreaks: "Meal / rest breaks", sickLeave: "Paid sick leave",
  payTransparency: "Pay transparency", nonCompete: "Non-compete", minWage: "Minimum wage", overtimeThreshold: "Overtime threshold", atWill: "At-will",
};

export default function FeaturesPage() {
  const fields = Object.keys(FIELD_LABELS);
  return (
    <>
      <Breadcrumbs items={[{ name: "Product", path: "/features" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container">
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">Product</span>
            <h1 className="mk-h1">What the product does, and what it refuses to do.</h1>
            <p className="mk-lead">An AI HR copilot is only useful if it knows when not to answer. Here is the mechanism, not the adjectives.</p>
            <div className="mk-ctarow mk-mt-24">
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="features-trial">{PRIMARY_CTA.label}</Link>
              <a href={SECONDARY_CTA.href} className="mk-btn mk-btn--ghost" data-cta="features-talk">{SECONDARY_CTA.label}</a>
            </div>
          </div>

          <div className="mk-grid mk-grid--2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} className="mk-card">
                <div className="mk-card__idx">0{i + 1}</div>
                <h2 className="mk-h3">{p.title}</h2>
                <p className="mk-body mk-mt-8">{p.body}</p>
                <ul className="mk-list mk-mt-16">{p.list.map((l) => <li key={l}>{l}</li>)}</ul>
              </Reveal>
            ))}
          </div>

          <Reveal className="mk-mt-40" id="coverage">
            <span className="mk-eyebrow">Coverage</span>
            <h2 className="mk-h2">Federal + {STATE_NAMES.length} states: the full matrix.</h2>
            <p className="mk-lead">Rendered from the jurisdiction database the product answers with. Additional states are added on customer request.</p>
            <div className="mk-tablewrap mk-mt-24">
              <table className="mk-table mk-table--compact" style={{ minWidth: 1100 }}>
                <thead>
                  <tr>
                    <th scope="col">Jurisdiction</th>
                    {fields.map((f) => <th key={f} scope="col">{FIELD_LABELS[f]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {JURISDICTION_NAMES.map((name) => (
                    <tr key={name}>
                      <td className="mk-td-name">{name}</td>
                      {fields.map((f) => <td key={f} className="mk-td-mono">{JURISDICTIONS[name][f] || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mk-small mk-mt-16">State leave programs also carried where they exist: CA CFRA, PFL and PDL; NY PFL; NJ NJFLA; CO FAMLI; MA PFML; WA PFML.</p>
          </Reveal>

          <div className="mk-two mk-mt-40">
            <Reveal>
              <span className="mk-eyebrow">Policy topics</span>
              <h2 className="mk-h3 mk-mt-8">18 topics pre-mapped and risk-weighted</h2>
              <p className="mk-body mk-mt-8">Each topic carries keywords, the source policy, a risk level and an escalation flag. Categories:</p>
              <div className="mk-chips mk-mt-16">{POLICY_CATEGORIES.map((c) => <span key={c} className="mk-chip">{c}</span>)}</div>
            </Reveal>
            <Reveal>
              <span className="mk-eyebrow">Integrations</span>
              <h2 className="mk-h3 mk-mt-8">Read-only payroll and HRIS sync</h2>
              <ul className="mk-ledger mk-mt-16">
                {LIVE_SYNCS.map((s) => (
                  <li key={s.name}>
                    <span className="mk-ledger__name">{s.name}</span>
                    <span className="mk-ledger__auth">{s.auth}</span>
                    <span className="mk-ledger__pulls">{s.pulls}</span>
                  </li>
                ))}
              </ul>
              <p className="mk-small mk-mt-16">Directory (credentials stored, sync on roadmap): {DIRECTORY_CONNECTORS.join(", ")}.</p>
            </Reveal>
          </div>

          <Reveal className="mk-sec mk-mt-40">
            <span className="mk-eyebrow">Not on the list</span>
            <h2 className="mk-h2">What it does not do yet</h2>
            <p className="mk-lead">Slack and Teams channels, SSO/SAML, our own SOC 2 audit, and states beyond the eleven above. Each is on the roadmap in the order founding customers vote. We would rather tell you now than on a procurement call.</p>
            <div className="mk-ctarow mk-mt-24">
              <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="features-final-trial">{PRIMARY_CTA.label}</Link>
              <Link href="/pricing" className="mk-btn mk-btn--ghost" style={{ color: "#f7f7f5", borderColor: "#3a3b3f" }} data-cta="features-pricing">See pricing</Link>
            </div>
            <p className="mk-small mk-mt-16" style={{ color: "#b9bbbf" }}>{TRIAL_TERMS}</p>
          </Reveal>
        </div>
      </section>
      <JsonLd data={softwareLd()} />
    </>
  );
}
