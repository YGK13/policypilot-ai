"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, PRIMARY_CTA } from "@/lib/marketing/site";

// ============================================================================
// SITE HEADER — sticky, paper background, wordmark per the "Signal" concept.
// Client component only for the mobile menu toggle + aria-current.
// ============================================================================

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "/";

  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="mk-header">
      <div className="mk-container mk-header__inner">
        <Link href="/" className="mk-logo" aria-label="AI HR Pilot home">
          <span className="mk-logo__top">AI HR</span>
          <span className="mk-logo__word">pilot</span>
        </Link>

        <nav className="mk-nav" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="mk-header__actions">
          <Link href="/sign-in" className="mk-login">Log in</Link>
          <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--primary mk-btn--sm" data-cta="header-trial">
            {PRIMARY_CTA.label}
          </Link>
        </div>

        <button
          type="button"
          className="mk-burger"
          aria-expanded={open}
          aria-controls="mk-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <div id="mk-mobile-menu" className="mk-mobile" data-open={open}>
        <ul>
          {NAV.map((n) => (
            <li key={n.href}><Link href={n.href}>{n.label}</Link></li>
          ))}
          <li><Link href="/sign-in">Log in</Link></li>
        </ul>
        <div className="mk-mobile__cta">
          <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--primary mk-btn--block" data-cta="mobile-menu-trial">
            {PRIMARY_CTA.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
