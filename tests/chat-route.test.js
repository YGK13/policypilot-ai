// ============================================================================
// /api/chat — model slug, output cap, stream-error fallback, tenancy.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const streamText = vi.fn();
const session = { authed: true, role: "employee", orgId: "org-1", user: { id: "user-1", name: "Ann Lee" } };

vi.mock("ai", () => ({ streamText: (...a) => streamText(...a) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
const rag = { retrieveContext: vi.fn(async () => []) };
vi.mock("@/lib/rag", () => rag);
vi.mock("@/lib/auth/rbac", () => ({ requireRole: vi.fn(async () => ({ session, error: null })) }));
const db = {
  saveChatMessage: vi.fn(async () => ({})),
  getChatHistory: vi.fn(async () => []),
  getRecentSessionMessages: vi.fn(async () => []),
  isDbAvailable: vi.fn(() => true),
  countRecentChatMessages: vi.fn(async () => 0),
};
vi.mock("@/lib/db", () => db);

vi.stubEnv("VERCEL_OIDC_TOKEN", "test-oidc");
vi.stubEnv("AI_MODEL", "");
const { POST, GET } = await import("@/app/api/chat/route.js");
const { LEGAL_DISCLAIMER_HTML } = await import("@/lib/law/chat-prompt.js");

function fakeStream(parts) {
  return {
    fullStream: (async function* () { for (const p of parts) yield p; })(),
  };
}
const req = (body) => new Request("http://x/api/chat", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  rag.retrieveContext.mockImplementation(async () => []);
  db.getRecentSessionMessages.mockImplementation(async () => []);
  session.orgId = "org-1";
});

describe("POST /api/chat — LLM path", () => {
  it("uses the dotted gateway slug for the current Sonnet and caps output tokens", async () => {
    streamText.mockReturnValue(fakeStream([{ type: "text-delta", text: "Hi" }]));
    await POST(req({ query: "PTO?" }));
    const opts = streamText.mock.calls[0][0];
    expect(opts.model).toBe("anthropic/claude-sonnet-5");
    expect(opts.maxOutputTokens).toBe(1024);
    expect(opts.maxTokens).toBeUndefined();
    expect(typeof opts.onError).toBe("function");
  });

  it("streams text when the model succeeds", async () => {
    streamText.mockReturnValue(fakeStream([
      { type: "start" },
      { type: "text-delta", text: "Hello " },
      { type: "text-delta", text: "there" },
      { type: "finish" },
    ]));
    const res = await POST(req({ query: "PTO?" }));
    expect(res.headers.get("X-HR-LLM")).toBe("1");
    // -- The not-legal-advice disclaimer is appended server-side --
    expect(await res.text()).toBe("Hello there" + LEGAL_DISCLAIMER_HTML);
  });

  it("returns the local-engine fallback (not an empty 200) when the stream errors before any text", async () => {
    streamText.mockReturnValue(fakeStream([{ type: "start" }, { type: "error", error: new Error("model not found") }]));
    const res = await POST(req({ query: "How much PTO do I get?" }));
    expect(res.headers.get("X-HR-LLM-Failed")).toBe("1");
    const body = await res.json();
    expect(body.llm_failed).toBe(true);
    expect(body.answer.length).toBeGreaterThan(0);
  });

  it("appends the fallback answer when the stream fails mid-response", async () => {
    streamText.mockReturnValue(fakeStream([
      { type: "text-delta", text: "Partial" },
      { type: "error", error: new Error("overloaded") },
    ]));
    const res = await POST(req({ query: "How much PTO do I get?" }));
    const text = await res.text();
    expect(text.startsWith("Partial")).toBe(true);
    expect(text).toContain("interrupted");
    expect(text.length).toBeGreaterThan("Partial".length + 60);
  });
});

describe("/api/chat tenancy", () => {
  it("POST fails closed (409) for an authed user with no org instead of using 'default'", async () => {
    session.orgId = null;
    const res = await POST(req({ query: "hi" }));
    expect(res.status).toBe(409);
    expect(db.saveChatMessage).not.toHaveBeenCalled();
  });

  it("GET fails closed (409) for an authed user with no org", async () => {
    session.orgId = null;
    const res = await GET(new Request("http://x/api/chat?sessionId=s"));
    expect(res.status).toBe(409);
    expect(db.getChatHistory).not.toHaveBeenCalled();
  });

  it("GET passes the session user id for session-scoped history", async () => {
    await GET(new Request("http://x/api/chat?sessionId=sess_1"));
    expect(db.getChatHistory).toHaveBeenCalledWith("org-1", "user-1", "sess_1", { limit: 50 });
  });
});

describe("POST /api/chat — conversation, caching, citations", () => {
  it("sends earlier turns of the session so follow-ups keep context", async () => {
    db.getRecentSessionMessages.mockResolvedValue([
      { role: "user", content: "What is our parental leave policy?" },
      { role: "assistant", content: "<strong>12 weeks</strong> paid." + LEGAL_DISCLAIMER_HTML },
    ]);
    streamText.mockReturnValue(fakeStream([{ type: "text-delta", text: "Part-time: 6 weeks" }]));
    await POST(req({ query: "And for part-time staff?", sessionId: "sess_1" }));

    expect(db.getRecentSessionMessages).toHaveBeenCalledWith("org-1", "user-1", "sess_1", 6);
    const opts = streamText.mock.calls[0][0];
    expect(opts.prompt).toBeUndefined();
    expect(opts.messages).toEqual([
      { role: "user", content: "What is our parental leave policy?" },
      { role: "assistant", content: "12 weeks paid." },
      { role: "user", content: "And for part-time staff?" },
    ]);
    // -- Retrieval for a short follow-up includes the previous question --
    expect(rag.retrieveContext.mock.calls[0][1]).toContain("parental leave");
  });

  it("answers single-turn when history loading fails", async () => {
    db.getRecentSessionMessages.mockRejectedValue(new Error("neon blip"));
    streamText.mockReturnValue(fakeStream([{ type: "text-delta", text: "ok" }]));
    const res = await POST(req({ query: "PTO?", sessionId: "sess_1" }));
    expect(res.status).toBe(200);
    expect(streamText.mock.calls[0][0].messages).toEqual([{ role: "user", content: "PTO?" }]);
  });

  it("marks the static system prefix for prompt caching and keeps per-request data after it", async () => {
    rag.retrieveContext.mockResolvedValue([
      { document_name: "Handbook.pdf", section: "4.2 PTO", content: "Employees accrue 15 days." },
    ]);
    streamText.mockReturnValue(fakeStream([{ type: "text-delta", text: "15 days" }]));
    await POST(req({ query: "PTO?" }));
    const [stat, dyn] = streamText.mock.calls[0][0].system;
    expect(stat.role).toBe("system");
    expect(stat.providerOptions).toEqual({ anthropic: { cacheControl: { type: "ephemeral" } } });
    expect(stat.content).toContain("Legal Accuracy Rules");
    // -- Nothing user- or question-specific in the cached prefix --
    expect(stat.content).not.toContain("Ann");
    expect(stat.content).not.toContain("Handbook.pdf");
    expect(dyn.providerOptions).toBeUndefined();
    expect(dyn.content).toContain("[Handbook.pdf § 4.2 PTO]");
    expect(dyn.content).toContain("Ann");
  });

  it("returns the cited handbook sections in X-HR-Sources and stores them with the answer", async () => {
    rag.retrieveContext.mockResolvedValue([
      { document_name: "Handbook.pdf", section: "4.2 PTO", content: "a" },
      { document_name: "Handbook.pdf", section: "4.2 PTO", content: "b" },
    ]);
    streamText.mockImplementation((opts) => {
      opts.onFinish({ text: "15 days" });
      return fakeStream([{ type: "text-delta", text: "15 days" }]);
    });
    const res = await POST(req({ query: "PTO?" }));
    const { decodeSourcesHeader } = await import("@/lib/chat/conversation");
    expect(decodeSourcesHeader(res.headers.get("X-HR-Sources"))).toEqual([{ document: "Handbook.pdf", section: "4.2 PTO" }]);
    expect(res.headers.get("X-HR-Grounded")).toBe("1");
    const saved = db.saveChatMessage.mock.calls.find((c) => c[1].role === "assistant");
    expect(saved[1].metadata.sources).toEqual([{ document: "Handbook.pdf", section: "4.2 PTO" }]);
  });
});
