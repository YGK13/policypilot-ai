"use client";

import { useEffect } from "react";

// ============================================================================
// CTA TRACKER — one delegated click listener. Every element with a data-cta
// attribute emits a `cta_click` event to window.dataLayer (GTM-compatible)
// and to window.va (Vercel Analytics) if that script is ever added. No new
// vendor is introduced here; this is the hook the analytics spec plugs into.
// ============================================================================
export default function CtaTracker() {
  useEffect(() => {
    function onClick(e) {
      const el = e.target instanceof Element ? e.target.closest("[data-cta]") : null;
      if (!el) return;
      const payload = { event: "cta_click", cta: el.getAttribute("data-cta"), href: el.getAttribute("href") || "", path: window.location.pathname };
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(payload);
        if (typeof window.va === "function") window.va("event", { name: "cta_click", data: payload });
      } catch { /* analytics must never break navigation */ }
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
