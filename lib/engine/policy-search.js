// ============================================================================
// POLICY SEARCH — Keyword-weighted matching against policy knowledge base
// ============================================================================

import POLICIES from "../data/policies";

export function searchPolicies(query) {
  const q = query.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const p of POLICIES) {
    let s = 0;
    for (const kw of p.keywords) {
      if (q.includes(kw)) {
        const wc = kw.split(" ").length;
        s += wc > 1 ? wc * 50 : 15;
      }
    }
    if (q.includes(p.id)) s += 30;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}
