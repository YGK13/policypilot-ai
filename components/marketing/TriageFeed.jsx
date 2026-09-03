"use client";

import { useEffect, useRef, useState } from "react";
import { FEED_ROWS } from "@/lib/marketing/site";

// ============================================================================
// TRIAGE FEED — the hero product surface from the "Signal" concept.
// A scripted, clearly-labelled sample: rows ingest, the reasoning log types
// out in HR-operator English, then the row resolves (answered) or escalates.
// Statute references come from lib/data/jurisdictions.js. Under
// prefers-reduced-motion the finished rows render statically.
// ============================================================================

const VISIBLE = 4;
const CPS = 42; // characters per second for the log stream

function finished(row, id) {
  return { ...row, id, state: row.state, typed: row.log.join("\n"), done: true };
}

export default function TriageFeed() {
  const [rows, setRows] = useState(() => FEED_ROWS.slice(0, VISIBLE).map((r, i) => finished(r, `init-${i}`)));
  const idx = useRef(VISIBLE % FEED_ROWS.length);
  const timers = useRef([]);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cancelled = false;
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };

    function ingest() {
      if (cancelled) return;
      const src = FEED_ROWS[idx.current % FEED_ROWS.length];
      idx.current += 1;
      const id = `r-${Date.now()}`;
      const full = src.log.join("\n");
      setRows((prev) => [{ ...src, id, state: "processing", typed: "", done: false }, ...prev].slice(0, VISIBLE));

      let n = 0;
      const step = () => {
        if (cancelled) return;
        n = Math.min(full.length, n + 2);
        const typed = full.slice(0, n);
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, typed } : r)));
        if (n < full.length) later(step, 1000 / CPS);
        else later(() => {
          if (cancelled) return;
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, state: src.state, done: true } : r)));
          later(ingest, 3200);
        }, 350);
      };
      later(step, 420);
    }

    later(ingest, 1800);
    return () => { cancelled = true; clear(); };
  }, []);

  return (
    <div className="mk-feed" role="region" aria-label="Sample compliance triage feed">
      <div className="mk-feed__bar">
        <span className="mk-feed__title"><span className="mk-feed__live" aria-hidden="true" /> Triage feed</span>
        <span className="mk-mono" style={{ fontSize: 11 }}>sample · illustrative</span>
      </div>
      <ul className="mk-feed__list" aria-live="polite">
        {rows.map((r) => (
          <li key={r.id} className="mk-feed__row" data-state={r.state}>
            <span className="mk-feed__dot" aria-hidden="true" />
            <div>
              <div className="mk-feed__who">{r.who}</div>
              <div className="mk-feed__q">{r.q}</div>
              <div className="mk-feed__log">
                {r.typed}
                {!r.done && <span className="cursor" aria-hidden="true" />}
              </div>
              {r.done && r.state === "answered" && <span className="mk-feed__pill mk-feed__pill--ok">answered · cited</span>}
              {r.done && r.state === "escalated" && <span className="mk-feed__pill mk-feed__pill--esc">{r.to}</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="mk-feed__foot">Rows are sample questions. Statute references come from the product&apos;s jurisdiction database.</div>
    </div>
  );
}
