import Link from "next/link";
import { PRIMARY_CTA } from "@/lib/marketing/site";

// Mobile-only sticky CTA (hidden at >= 768px via CSS). Server component.
export default function StickyCta({ label = PRIMARY_CTA.label, href = PRIMARY_CTA.href, note = "7-day trial · no card" }) {
  return (
    <div className="mk-sticky" role="complementary" aria-label="Start free trial">
      <span className="mk-sticky__txt">{note}</span>
      <Link href={href} className="mk-btn mk-btn--signal mk-btn--sm" data-cta="sticky-trial">{label}</Link>
    </div>
  );
}
