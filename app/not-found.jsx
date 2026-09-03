import Link from "next/link";
import "./(marketing)/marketing.css";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";

// ============================================================================
// 404 — also what Clerk shows for protected routes hit while signed out
// (protect-rewrite), so it must be a sane, public, on-brand page.
// ============================================================================

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <div className="mk">
      <SiteHeader />
      <main id="main">
        <section className="mk-section">
          <div className="mk-container" style={{ maxWidth: 720 }}>
            <div className="mk-eyebrow">404</div>
            <h1 className="mk-h1">That page is not on the record.</h1>
            <p className="mk-lead">
              If you were heading for the app, <Link href="/sign-in" style={{ textDecoration: "underline" }}>log in</Link> first. Otherwise, these are the public pages:
            </p>
            <ul className="mk-list mk-mt-24">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/features">Product</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/compare">Compare alternatives</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/blog">Blog</Link></li>
            </ul>
            <div className="mk-ctarow mk-mt-32">
              <Link href="/" className="mk-btn mk-btn--primary">Back to home</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
