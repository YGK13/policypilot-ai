import Link from "next/link";
import L from "../legal-styles";

// ============================================================================
// PRIVACY POLICY — honest description of what we actually collect and where
// it goes. Subprocessor list must be kept current when infrastructure changes.
// ============================================================================

export const metadata = {
  title: "Privacy Policy | AI HR Pilot",
  description: "How AI HR Pilot collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div style={L.page}>
      <div style={L.container}>
        <Link href="/" style={L.back}>← Back to AI HR Pilot</Link>
        <h1 style={L.h1}>Privacy Policy</h1>
        <p style={L.updated}>Last updated: July 6, 2026</p>

        <p style={L.p}>
          This policy describes how Portfolio Leverage Co. (&quot;PortLev&quot;, &quot;we&quot;)
          handles personal data in connection with AI HR Pilot (aihrpilot.com). For customer
          organizations, we act primarily as a processor of the data your organization
          submits; your employer&apos;s own policies govern how it uses the Service.
        </p>

        <h2 style={L.h2}>What we collect</h2>
        <ul style={L.ul}>
          <li style={L.li}><strong>Account data:</strong> name, work email and role, via our authentication provider (Clerk).</li>
          <li style={L.li}><strong>Customer content:</strong> documents your organization uploads (e.g. employee handbooks) and the questions and answers exchanged with the assistant.</li>
          <li style={L.li}><strong>Usage and log data:</strong> feature usage, timestamps and technical logs needed to operate and secure the Service.</li>
          <li style={L.li}><strong>Billing data:</strong> processed by Stripe. We never store full card numbers.</li>
        </ul>

        <h2 style={L.h2}>How we use it</h2>
        <ul style={L.ul}>
          <li style={L.li}>To provide the Service: answering questions from your uploaded documents, routing escalations, maintaining audit logs your organization can review.</li>
          <li style={L.li}>To operate, secure and improve the platform.</li>
          <li style={L.li}>To communicate with you about the Service (transactional and, with consent, product emails; unsubscribe any time).</li>
          <li style={L.li}><strong>Never</strong> to train AI models. Your content is sent to AI providers solely to generate your organization&apos;s answers.</li>
        </ul>

        <h2 style={L.h2}>Subprocessors</h2>
        <p style={L.p}>We use the following infrastructure providers to run the Service:</p>
        <ul style={L.ul}>
          <li style={L.li}>Vercel (hosting, file storage, AI gateway) — United States</li>
          <li style={L.li}>Neon (Postgres database) — United States</li>
          <li style={L.li}>Clerk (authentication) — United States</li>
          <li style={L.li}>Anthropic and OpenAI via Vercel AI Gateway (AI answer generation and document embeddings)</li>
          <li style={L.li}>Stripe (payments)</li>
          <li style={L.li}>Resend (transactional email)</li>
        </ul>

        <h2 style={L.h2}>Security</h2>
        <p style={L.p}>
          Data is encrypted in transit (TLS) and at rest through our infrastructure
          providers. Access is scoped per organization: every database query is filtered by
          your organization&apos;s identifier, derived from your authenticated session. See
          our <Link href="/security" style={L.a}>Security page</Link> for a plain-language
          description of our current posture, including what certifications we do and do not
          hold yet.
        </p>

        <h2 style={L.h2}>Retention and deletion</h2>
        <p style={L.p}>
          Customer content is retained while the subscription is active. On written request
          after termination, we delete customer content within 30 days, except where law
          requires retention. Individual employees should direct access or deletion requests
          to their employer, who controls the workspace; we support employers in fulfilling
          them.
        </p>

        <h2 style={L.h2}>Your rights</h2>
        <p style={L.p}>
          Depending on your location, you may have rights to access, correct, delete or
          export personal data (including under GDPR and CCPA/CPRA). Contact us at the
          address below and we will respond within the legally required period. We do not
          sell personal data.
        </p>

        <h2 style={L.h2}>Contact</h2>
        <p style={L.p}>
          Privacy questions and requests: <a href="mailto:support@aihrpilot.com" style={L.a}>support@aihrpilot.com</a>
        </p>
      </div>
    </div>
  );
}
