import Link from "next/link";
import L from "../legal-styles";

// ============================================================================
// SECURITY PAGE — plain-language, verifiable claims only. This page exists
// because HR data buyers ask, and because we would rather state what is true
// than display a badge we have not earned. NO SOC 2 claim until audited.
// ============================================================================

export const metadata = {
  title: "Security | AI HR Pilot",
  description: "How AI HR Pilot protects your organization's HR data — stated plainly, with no unearned badges.",
};

export default function SecurityPage() {
  return (
    <div style={L.page}>
      <div style={L.container}>
        <Link href="/" style={L.back}>← Back to AI HR Pilot</Link>
        <h1 style={L.h1}>Security</h1>
        <p style={L.updated}>Last updated: July 6, 2026</p>

        <p style={L.p}>
          HR data is among the most sensitive data a company holds. This page states
          exactly what we do to protect it, what our infrastructure providers certify,
          and what we have not certified yet. No badge on this site claims a certification
          we do not hold.
        </p>

        <h2 style={L.h2}>What we do today</h2>
        <ul style={L.ul}>
          <li style={L.li}><strong>Encryption:</strong> all traffic is encrypted in transit (TLS); data is encrypted at rest by our database and storage providers.</li>
          <li style={L.li}><strong>Tenant isolation:</strong> every database query is scoped to your organization&apos;s identifier, which is derived server-side from your authenticated session and never accepted from the client.</li>
          <li style={L.li}><strong>Role-based access:</strong> four permission levels (employee, HR staff, legal, HR admin) enforced on the server for every API route.</li>
          <li style={L.li}><strong>Audit logging:</strong> questions, answers, escalations and admin actions are logged and reviewable by your admins.</li>
          <li style={L.li}><strong>Sensitive-topic escalation:</strong> harassment, discrimination, ADA, FMLA and similar topics are flagged and routed to humans rather than answered casually by AI.</li>
          <li style={L.li}><strong>No training on your data:</strong> your documents and conversations are used only to answer your organization&apos;s questions.</li>
          <li style={L.li}><strong>Webhook and payment integrity:</strong> Stripe and authentication webhooks are cryptographically signature-verified.</li>
        </ul>

        <h2 style={L.h2}>Our infrastructure providers</h2>
        <p style={L.p}>
          The Service runs on providers that maintain their own security certifications:
          Vercel (hosting and storage), Neon (database), Clerk (authentication, SOC 2
          Type II certified) and Stripe (payments, PCI DSS Level 1). Their certifications
          apply to their infrastructure, not to AI HR Pilot as a product, and we say so
          plainly.
        </p>

        <h2 style={L.h2}>What we have not done yet</h2>
        <ul style={L.ul}>
          <li style={L.li}><strong>SOC 2:</strong> AI HR Pilot has not completed its own SOC 2 audit. It is on our roadmap, prioritized by customer demand.</li>
          <li style={L.li}><strong>Penetration test:</strong> no third-party pentest has been completed yet.</li>
          <li style={L.li}><strong>SSO/SAML:</strong> enterprise single sign-on is not yet available (Google and Microsoft OAuth are supported via Clerk).</li>
        </ul>

        <h2 style={L.h2}>Data processing and DPAs</h2>
        <p style={L.p}>
          Our data handling is described in the <Link href="/privacy" style={L.a}>Privacy
          Policy</Link>, including the current subprocessor list. If your procurement
          process requires a signed Data Processing Agreement, contact us and we will
          execute one as part of onboarding.
        </p>

        <h2 style={L.h2}>Reporting a vulnerability</h2>
        <p style={L.p}>
          If you believe you have found a security issue, email
          {" "}<a href="mailto:support@aihrpilot.com" style={L.a}>support@aihrpilot.com</a>{" "}
          with &quot;SECURITY&quot; in the subject line. We will acknowledge within 2 business
          days and keep you informed through resolution.
        </p>
      </div>
    </div>
  );
}
