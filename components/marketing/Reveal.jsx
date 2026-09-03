"use client";

import { useEffect, useRef } from "react";

// ============================================================================
// REVEAL — adds .is-in when the element enters the viewport. CSS handles the
// motion and disables it under prefers-reduced-motion. Progressive: content
// is visible without JS once hydration adds the class.
// ============================================================================
export default function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`mk-reveal ${className}`} {...rest}>{children}</Tag>;
}
