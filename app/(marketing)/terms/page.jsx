import Link from "next/link";
import L from "../legal-styles";

// ============================================================================
// TERMS OF SERVICE — real, binding terms. Required for Stripe and for any
// B2B procurement review. Drafted for founder review; the governing-law
// clause is a business decision and should be confirmed before enterprise deals.
// ============================================================================

export const metadata = {
  title: "Terms of Service | AI HR Pilot",
  description: "Terms of Service for AI HR Pilot, the AI-powered HR assistant by Portfolio Leverage Co.",
};

export default function TermsPage() {
  return (
    <div style={L.page}>
      <div style={L.container}>
        <Link href="/" style={L.back}>← Back to AI HR Pilot</Link>
        <h1 style={L.h1}>Terms of Service</h1>
        <p style={L.updated}>Last updated: July 6, 2026</p>

        <p style={L.p}>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of the AI HR Pilot
          platform at aihrpilot.com (the &quot;Service&quot;), operated by Portfolio Leverage Co.
          (&quot;PortLev&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or using the
          Service you agree to these Terms on behalf of yourself and, where applicable, the
          organization you represent (&quot;Customer&quot;).
        </p>

        <h2 style={L.h2}>1. The Service</h2>
        <p style={L.p}>
          AI HR Pilot provides an AI-assisted HR question-answering and workflow platform.
          Answers are generated from documents the Customer uploads, general employment-law
          reference material and large language models. The Service provides <strong>general
          HR policy guidance only</strong>. It does not provide legal advice, and no
          attorney-client relationship is created by using it. Customers remain solely
          responsible for their HR and legal decisions and should consult qualified counsel
          for legal matters.
        </p>

        <h2 style={L.h2}>2. Accounts and Acceptable Use</h2>
        <ul style={L.ul}>
          <li style={L.li}>You must provide accurate registration information and keep credentials secure. You are responsible for activity under your account.</li>
          <li style={L.li}>You may only upload documents your organization has the right to use.</li>
          <li style={L.li}>You may not use the Service to violate law, infringe rights, probe or disrupt the Service, resell it without written agreement, or attempt to extract its underlying models or prompts.</li>
        </ul>

        <h2 style={L.h2}>3. Subscriptions, Trials and Payment</h2>
        <ul style={L.ul}>
          <li style={L.li}>Paid plans are billed monthly in advance via Stripe at the prices shown at aihrpilot.com/#pricing, plus applicable taxes.</li>
          <li style={L.li}>Free trials convert to no plan (access is limited or suspended) unless a subscription is started; we do not auto-charge cards we did not collect.</li>
          <li style={L.li}>You may cancel any time from Billing; cancellation takes effect at the end of the current billing period. Fees already paid are non-refundable except where required by law or expressly stated otherwise.</li>
          <li style={L.li}>We may change pricing with at least 30 days notice; changes apply from your next billing period.</li>
        </ul>

        <h2 style={L.h2}>4. Customer Data</h2>
        <p style={L.p}>
          The Customer owns all documents, questions and records it submits
          (&quot;Customer Data&quot;). We process Customer Data only to provide the Service,
          as described in our <Link href="/privacy" style={L.a}>Privacy Policy</Link>.
          Customer Data is not used to train AI models. Upon written request following
          termination, we will delete Customer Data within 30 days, except where retention
          is required by law.
        </p>

        <h2 style={L.h2}>5. AI Output Disclaimer</h2>
        <p style={L.p}>
          AI-generated answers can be incomplete or incorrect. The Service labels its
          sources and escalates legally sensitive topics, but the Customer is responsible
          for reviewing AI output before relying on it, particularly for decisions affecting
          individual employees. The Service is not a substitute for professional judgment.
        </p>

        <h2 style={L.h2}>6. Intellectual Property</h2>
        <p style={L.p}>
          We retain all rights in the Service, its software and its content (excluding
          Customer Data). Customer receives a limited, non-exclusive, non-transferable
          right to use the Service during the subscription term.
        </p>

        <h2 style={L.h2}>7. Warranties and Limitation of Liability</h2>
        <p style={L.p}>
          The Service is provided &quot;as is&quot; without warranties of any kind, express
          or implied. To the maximum extent permitted by law, neither party will be liable
          for indirect, incidental, special or consequential damages, and our aggregate
          liability under these Terms is limited to the fees paid by Customer in the twelve
          months preceding the claim. Nothing in these Terms limits liability that cannot be
          limited by law.
        </p>

        <h2 style={L.h2}>8. Termination</h2>
        <p style={L.p}>
          Either party may terminate for material breach not cured within 30 days of notice.
          We may suspend access immediately for security risk, abuse or non-payment.
          Sections 4 through 9 survive termination.
        </p>

        <h2 style={L.h2}>9. General</h2>
        <p style={L.p}>
          These Terms are governed by the laws of the State of New York, without regard to
          conflict-of-law rules, and disputes will be resolved in the state or federal courts
          located in New York County, New York. We may update these Terms with reasonable
          notice; continued use after the effective date constitutes acceptance. If any
          provision is unenforceable, the rest remain in effect.
        </p>

        <h2 style={L.h2}>Contact</h2>
        <p style={L.p}>
          Questions about these Terms: <a href="mailto:support@aihrpilot.com" style={L.a}>support@aihrpilot.com</a>
        </p>
      </div>
    </div>
  );
}
