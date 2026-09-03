import "./marketing.css";
import SiteHeader from "@/components/marketing/SiteHeader";
import SiteFooter from "@/components/marketing/SiteFooter";
import StickyCta from "@/components/marketing/StickyCta";
import CtaTracker from "@/components/marketing/CtaTracker";
import JsonLd from "@/components/marketing/JsonLd";
import { organizationLd, websiteLd, personLd } from "@/lib/marketing/site";

// ============================================================================
// MARKETING LAYOUT — No AppShell, no sidebar, no auth required.
// Shared header/footer, sticky mobile CTA, CTA instrumentation, and the
// site-wide entity JSON-LD (Organization + WebSite + Person).
// ============================================================================

export default function MarketingLayout({ children }) {
  return (
    <div className="mk mk-has-sticky">
      <a href="#main" className="mk-skip">Skip to content</a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <StickyCta />
      <CtaTracker />
      <JsonLd data={[organizationLd(), websiteLd(), personLd()]} />
    </div>
  );
}
