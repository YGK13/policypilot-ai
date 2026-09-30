// ============================================================================
// Law provenance gating: data shape, lawText/describeFact gating, LLM law
// context, freshness listing, policy answers, and /api/chat citation rules,
// disclaimer and policy-drafting mode.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import REGULATORY_UPDATES from "@/lib/data/regulatory-updates";
import POLICIES from "@/lib/data/policies";
import {
  isVerified,
  isStale,
  lawText,
  describeFact,
  factEntries,
  formatFactForPrompt,
  isUpdateVerified,
  listFreshnessIssues,
  SOURCE_PENDING,
  VERIFICATION_WINDOW_DAYS,
} from "@/lib/law/provenance";
import {
  buildJurisdictionContext,
  isPolicyDraftRequest,
  LEGAL_DISCLAIMER_HTML,
  DRAFT_DISCLAIMER_HTML,
  LAW_CITATION_RULES,
} from "@/lib/law/chat-prompt";

const NOW = new Date("2026-09-24T00:00:00Z");
const verifiedFact = (over = {}) => ({
  value: "$7.25/hr",
  jurisdiction: "Federal",
  sourceUrl: "https://www.dol.gov/agencies/whd/minimum-wage",
  effectiveDate: "2009-07-24",
  lastVerified: "2026-09-24",
  confidence: "high",
  verification: "verified",
  ...over,
});

const allFacts = () =>
  Object.entries(JURISDICTIONS).flatMap(([state, rules]) =>
    factEntries(rules).map(([key, fact]) => ({ state, key, fact }))
  );

describe("law data carries provenance", () => {
  it("every jurisdiction fact has the full provenance shape", () => {
    const facts = allFacts();
    expect(facts.length).toBeGreaterThan(100);
    for (const { state, key, fact } of facts) {
      const where = `${state}.${key}`;
      expect(fact, where).toMatchObject({ jurisdiction: state });
      for (const field of ["value", "sourceUrl", "effectiveDate", "lastVerified", "confidence", "verification"]) {
        expect(fact, `${where} missing ${field}`).toHaveProperty(field);
      }
      expect(["verified", "unverified"]).toContain(fact.verification);
      if (fact.verification === "verified") {
        expect(isVerified(fact), where).toBe(true);
      } else {
        expect(fact.sourceUrl, where).toBeNull();
        expect(isVerified(fact), where).toBe(false);
      }
    }
  });

  it("every verified fact cites an official source", () => {
    const official = /^https:\/\/([a-z0-9-]+\.)*(gov|twc\.texas\.gov|malegislature\.gov|paidfamilyleave\.ny\.gov|floridajobs\.org|phila\.gov)\//;
    for (const { state, key, fact } of allFacts().filter((f) => f.fact.verification === "verified")) {
      expect(fact.sourceUrl, `${state}.${key}`).toMatch(official);
    }
  });

  it("regulatory updates carry provenance; unverified ones have no source", () => {
    for (const u of REGULATORY_UPDATES) {
      expect(u, u.id).toHaveProperty("lastVerified");
      expect(u, u.id).toHaveProperty("confidence");
      expect(["verified", "unverified"]).toContain(u.verification);
      expect(isUpdateVerified(u), u.id).toBe(u.verification === "verified");
    }
  });

  it("the unsourced $58,656 federal overtime figure is gone", () => {
    const blob = JSON.stringify({ JURISDICTIONS, REGULATORY_UPDATES });
    expect(blob).not.toContain("58,656");
    expect(JURISDICTIONS.Federal.overtimeThreshold.value).toContain("$684/week");
  });
});

describe("isVerified fails closed", () => {
  it("accepts a fully sourced fact", () => {
    expect(isVerified(verifiedFact())).toBe(true);
  });

  it.each([
    ["missing fact", undefined],
    ["plain string (legacy shape)", "$7.25/hr"],
    ["marked unverified", verifiedFact({ verification: "unverified" })],
    ["no source", verifiedFact({ sourceUrl: null })],
    ["non-https source", verifiedFact({ sourceUrl: "http://www.dol.gov/x" })],
    ["no verification date", verifiedFact({ lastVerified: null })],
    ["malformed date", verifiedFact({ lastVerified: "Sept 2026" })],
    ["low confidence", verifiedFact({ confidence: "low" })],
  ])("rejects %s", (_label, fact) => {
    expect(isVerified(fact)).toBe(false);
    expect(lawText(fact)).toBe(SOURCE_PENDING);
    expect(describeFact(fact, NOW)).toMatchObject({ verified: false, text: SOURCE_PENDING, sourceUrl: null });
  });

  it("describeFact exposes source and dates only for verified facts", () => {
    expect(describeFact(verifiedFact(), NOW)).toMatchObject({
      verified: true,
      text: "$7.25/hr",
      sourceUrl: "https://www.dol.gov/agencies/whd/minimum-wage",
      lastVerified: "2026-09-24",
      stale: false,
    });
  });
});

describe("freshness window", () => {
  it(`a fact goes stale after ${VERIFICATION_WINDOW_DAYS} days`, () => {
    const fact = verifiedFact({ lastVerified: "2026-06-01" });
    expect(isStale(fact, new Date("2026-08-30T00:00:00Z"))).toBe(false); // 90 days
    expect(isStale(fact, new Date("2026-08-31T00:00:00Z"))).toBe(true); // 91 days
    // -- Stale facts are still shown, but flagged --
    expect(describeFact(fact, new Date("2026-12-01T00:00:00Z"))).toMatchObject({ verified: true, stale: true });
  });

  it("lists unverified items always and verified items only once stale", () => {
    const jur = {
      Federal: { flag: "x", minWage: verifiedFact(), atWill: { ...verifiedFact(), verification: "unverified", sourceUrl: null } },
    };
    const today = listFreshnessIssues(jur, [], NOW);
    expect(today.map((i) => [i.id, i.reason])).toEqual([["Federal.atWill", "unverified"]]);

    const later = listFreshnessIssues(jur, [], new Date("2027-01-10T00:00:00Z"));
    expect(later.map((i) => [i.id, i.reason])).toEqual([
      ["Federal.minWage", "stale"],
      ["Federal.atWill", "unverified"],
    ]);
  });

  it("covers the real data: unverified items are listed today", () => {
    const issues = listFreshnessIssues(JURISDICTIONS, REGULATORY_UPDATES, NOW);
    const unverifiedCount =
      allFacts().filter((f) => f.fact.verification === "unverified").length +
      REGULATORY_UPDATES.filter((u) => u.verification === "unverified").length;
    expect(issues.filter((i) => i.reason === "unverified")).toHaveLength(unverifiedCount);
  });
});

describe("LLM law context", () => {
  it("gives verified facts with source and date, and withholds unverified values", () => {
    const ctx = buildJurisdictionContext("Texas", NOW);
    expect(ctx).toContain("$7.25/hr (Texas adopts the federal minimum wage)");
    expect(ctx).toContain("source: https://www.twc.texas.gov/programs/wage-and-hour/texas-minimum-wage-law");
    expect(ctx).toContain("last verified 2026-09-24");
    // -- Texas.nonCompete is unverified: its text must not reach the model --
    expect(JURISDICTIONS.Texas.nonCompete.verification).toBe("unverified");
    expect(ctx).not.toContain("Enforceable if reasonable");
    expect(ctx).toMatch(/Non Compete: UNVERIFIED/);
    // -- Federal baseline is included for states --
    expect(ctx).toContain("Federal Baseline");
  });

  it("marks overdue facts for re-confirmation", () => {
    const line = formatFactForPrompt("minWage", verifiedFact({ lastVerified: "2026-01-01" }), NOW);
    expect(line).toContain("VERIFICATION OVERDUE");
  });

  it("falls back to Federal for an unknown jurisdiction", () => {
    expect(buildJurisdictionContext("Atlantis", NOW)).toContain("## Federal Employment Law");
  });
});

describe("policy answers use gated law text", () => {
  const answer = (id, emp) => POLICIES.find((p) => p.id === id).answer(emp);
  const base = { firstName: "A", lastName: "B", tenure: 3, ptoBalance: 5 };

  it("shows source-pending instead of an unverified Georgia final-pay rule", () => {
    const html = answer("termination", { ...base, state: "Georgia" });
    expect(html).toContain(`<strong>Final Pay:</strong> ${SOURCE_PENDING}`);
    expect(html).not.toContain("Next payday");
  });

  it("shows verified values for California", () => {
    const html = answer("termination", { ...base, state: "California" });
    expect(html).toContain(JURISDICTIONS.California.finalPay.value);
    expect(html).toContain(JURISDICTIONS.Federal.cobra.value);
  });

  it("never prints an object where a law fact belongs", () => {
    for (const state of Object.keys(JURISDICTIONS)) {
      for (const p of POLICIES) {
        if (typeof p.answer !== "function") continue;
        expect(p.answer({ ...base, state }), `${p.id}/${state}`).not.toContain("[object Object]");
      }
    }
  });
});

describe("policy-draft routing", () => {
  it.each([
    "Draft a remote work policy for our CA and NY employees",
    "Can you write a PTO policy?",
    "Create an AI-use policy",
    "I need a handbook section on harassment, please draft it",
    "policy template for bereavement leave",
  ])("routes %j to the template", (q) => {
    expect(isPolicyDraftRequest(q)).toBe(true);
  });

  it.each([
    "How much PTO do I get?",
    "What is the sick leave policy?",
    "Can I update my direct deposit?",
  ])("answers %j normally", (q) => {
    expect(isPolicyDraftRequest(q)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// /api/chat wiring
// ---------------------------------------------------------------------------
const streamText = vi.fn();
const session = { authed: true, role: "employee", orgId: "org-1", user: { id: "user-1", name: "Ann Lee", state: "Texas" } };
vi.mock("ai", () => ({ streamText: (...a) => streamText(...a) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/rag", () => ({ retrieveContext: vi.fn(async () => []) }));
vi.mock("@/lib/auth/rbac", () => ({ requireRole: vi.fn(async () => ({ session, error: null })) }));
vi.mock("@/lib/db", () => ({
  saveChatMessage: vi.fn(async () => ({})),
  getChatHistory: vi.fn(async () => []),
  getRecentSessionMessages: vi.fn(async () => []),
  isDbAvailable: vi.fn(() => false),
  countRecentChatMessages: vi.fn(async () => 0),
}));

describe("/api/chat law rules", () => {
  let POST;
  const req = (body) => new Request("http://x/api/chat", { method: "POST", body: JSON.stringify(body) });
  const stream = (parts) => ({ fullStream: (async function* () { for (const p of parts) yield p; })() });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_OIDC_TOKEN", "test-oidc");
    ({ POST } = await import("@/app/api/chat/route.js"));
  });

  it("system prompt requires citations and carries only provenance-gated law", async () => {
    streamText.mockReturnValue(stream([{ type: "text-delta", text: "Hi" }]));
    await POST(req({ query: "What is the minimum wage?" }));
    const { system: systemMessages, maxOutputTokens } = streamText.mock.calls[0][0];
    const system = systemMessages.map((m) => m.content).join("\n");
    expect(system).toContain(LAW_CITATION_RULES);
    expect(system).toContain("VERIFIED LAW DATA");
    expect(system).toContain("source: https://www.twc.texas.gov/programs/wage-and-hour/texas-minimum-wage-law");
    expect(system).not.toContain("Enforceable if reasonable");
    expect(system).not.toContain("Policy Drafting Mode");
    expect(maxOutputTokens).toBe(1024);
  });

  it("appends the not-legal-advice disclaimer to streamed answers", async () => {
    streamText.mockReturnValue(stream([{ type: "text-delta", text: "Answer" }, { type: "finish" }]));
    const res = await POST(req({ query: "What is the minimum wage?" }));
    expect(res.headers.get("X-HR-Mode")).toBe("answer");
    expect(await res.text()).toBe("Answer" + LEGAL_DISCLAIMER_HTML);
  });

  it("routes drafting requests to the policy template with a Legal basis table", async () => {
    streamText.mockReturnValue(stream([{ type: "text-delta", text: "Draft" }]));
    const res = await POST(req({ query: "Draft a PTO policy for our Texas office" }));
    const { system: systemMessages, maxOutputTokens } = streamText.mock.calls[0][0];
    const system = systemMessages.map((m) => m.content).join("\n");
    expect(system).toContain("Policy Drafting Mode");
    expect(system).toContain("Legal basis (internal, not part of the employee-facing policy)");
    expect(system).toContain("Requirement | Jurisdiction | Source | URL | Checked");
    expect(system).toContain("Open items / counsel flags");
    expect(maxOutputTokens).toBe(3000);
    expect(res.headers.get("X-HR-Mode")).toBe("policy-draft");
    expect(await res.text()).toBe("Draft" + DRAFT_DISCLAIMER_HTML);
  });

  it("appends the disclaimer to the local-engine fallback too", async () => {
    streamText.mockReturnValue(stream([{ type: "error", error: new Error("down") }]));
    const res = await POST(req({ query: "How much PTO do I get?" }));
    const body = await res.json();
    expect(body.llm_failed).toBe(true);
    expect(body.answer.endsWith(LEGAL_DISCLAIMER_HTML)).toBe(true);
  });
});
