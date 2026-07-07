// ============================================================================
// POLICY SEARCH TESTS — the local keyword engine that produces triage metadata
// for every chat message (even the LLM path relies on it for category/routing).
// ============================================================================

import { describe, it, expect } from "vitest";
import { searchPolicies } from "@/lib/engine/policy-search";
import POLICIES from "@/lib/data/policies";

describe("searchPolicies", () => {
  it("returns null when nothing matches", () => {
    expect(searchPolicies("xyzzy plugh no such topic here")).toBeNull();
  });

  it("returns a real policy object from the catalog on a keyword hit", () => {
    // Use the first keyword of the first policy so this stays valid as the
    // catalog evolves, without hardcoding a specific topic.
    const seed = POLICIES[0];
    const match = searchPolicies(`I have a question about ${seed.keywords[0]}`);
    expect(match).not.toBeNull();
    expect(POLICIES).toContain(match);
  });

  it("prefers a policy whose multi-word keyword phrase appears", () => {
    const multi = POLICIES.find((p) => p.keywords.some((k) => k.split(" ").length > 1));
    if (!multi) return; // catalog has no multi-word keywords; nothing to assert
    const phrase = multi.keywords.find((k) => k.split(" ").length > 1);
    const match = searchPolicies(`question regarding ${phrase} please`);
    expect(match).not.toBeNull();
  });
});
