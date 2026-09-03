import { NEWSLETTER_URL } from "@/lib/marketing/site";

// Email capture for The Leverage Brief (Beehiiv). Plain GET form so it works
// without JS and without adding a vendor script; Beehiiv prefills the email.
export default function NewsletterBox() {
  return (
    <div className="mk-news">
      <div className="mk-eyebrow">The Leverage Brief</div>
      <p className="mk-body mk-mt-8">
        Not ready to trial? Get the founder&apos;s weekly brief on AI in HR, compliance changes that matter, and what PE operators are actually doing about headcount.
      </p>
      <form action={NEWSLETTER_URL} method="get" target="_blank" rel="noopener">
        <label htmlFor="mk-news-email" className="mk-skip">Email address</label>
        <input id="mk-news-email" type="email" name="email" placeholder="you@company.com" required autoComplete="email" />
        <button type="submit" className="mk-btn mk-btn--ghost mk-btn--sm" data-cta="newsletter">Subscribe</button>
      </form>
    </div>
  );
}
