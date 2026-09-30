// ============================================================================
// /api/chat — model slug, output cap, stream-error fallback, tenancy.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const streamText = vi.fn();
const session = { authed: true, role: "employee", orgId: "org-1", user: { id: "user-1", name: "Ann Lee" } };

vi.mock("ai", () => ({ streamText: (...a) => streamText(...a) }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/rag", () => ({ retrieveContext: vi.fn(async () => []) }));
vi.mock("@/lib/auth/rbac", () => ({ requireRole: vi.fn(async () => ({ session, error: null })) }));
const db = {
  saveChatMessage: vi.fn(async () => ({})),
  getChatHistory: vi.fn(async () => []),
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
