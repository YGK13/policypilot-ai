import Link from "next/link";
import { NAV, SISTER_LINKS, SUPPORT_EMAIL, NEWSLETTER_URL, LAST_UPDATED } from "@/lib/marketing/site";

// ============================================================================
// SITE FOOTER — product links, resources, legal, and the "A PortLev build"
// strip that links the sibling properties. Server component.
// ============================================================================

export default function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer__grid">
          <div>
            <Link href="/" className="mk-logo" aria-label="AI HR Pilot home">
              <span className="mk-logo__top">AI HR</span>
              <span className="mk-logo__word">pilot</span>
            </Link>
            <p className="mk-body mk-mt-16" style={{ maxWidth: 380 }}>
              AI HR policy and compliance copilot for HR teams of 50 to 2,000. Answers from your handbook, with citations. Routes the risky questions to a human. Keeps the record.
            </p>
            <p className="mk-small mk-mt-16">
              Built by a 3x CHRO with a JD. Published by Portfolio Leverage Company. Last updated {LAST_UPDATED}.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              {NAV.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
              <li><Link href="/sign-up">Start free trial</Link></li>
              <li><Link href="/sign-in">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/security">Security</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><Link href="/blog/hr-chatbots-2026-complete-buyers-guide">HR chatbot buyer&apos;s guide</Link></li>
              <li><Link href="/blog/20-most-common-employee-questions-hr-teams-answer">20 most common employee questions</Link></li>
              <li><Link href="/compare">Alternatives compared</Link></li>
              <li><a href={NEWSLETTER_URL} rel="noopener">The Leverage Brief newsletter</a></li>
              <li><a href="/llms.txt">llms.txt</a></li>
            </ul>
          </div>
        </div>

        <div className="mk-footer__strip">
          <span><strong>A PortLev build.</strong> &copy; 2026 Portfolio Leverage Company.</span>
          {SISTER_LINKS.map((s) => (
            <a key={s.href} href={s.href} rel="noopener">{s.label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
