import { NextResponse } from "next/server";
import { streamText } from "ai";
import * as Sentry from "@sentry/nextjs";
import { generateResponse } from "@/lib/engine/response-gen";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";
import {
  buildJurisdictionContext,
  isPolicyDraftRequest,
  LAW_CITATION_RULES,
  POLICY_DRAFT_INSTRUCTIONS,
  LEGAL_DISCLAIMER_HTML,
  DRAFT_DISCLAIMER_HTML,
  ANSWER_MAX_OUTPUT_TOKENS,
  DRAFT_MAX_OUTPUT_TOKENS,
} from "@/lib/law/chat-prompt";
import { saveChatMessage, getChatHistory, isDbAvailable, countRecentChatMessages } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";
import { retrieveContext } from "@/lib/rag";

// ============================================================================
// POST /api/chat — Streaming LLM + local policy engine for HR queries
//
// LLM path (preferred):
//   Uses Vercel AI Gateway (OIDC) or direct Anthropic key.
//   The system prompt is grounded in the org's OWN uploaded handbook via
//   lib/rag.js retrieval — this is what backs "answers from your handbook".
//
// Local path (fallback when no LLM configured):
//   Returns JSON with the local keyword-matching engine response.
//
// Security invariants:
//   - orgId and user identity ALWAYS derive from the session, never the body.
//   - Real (Clerk) users get their real profile in the AI context; the demo
//     employee roster exists ONLY in Clerk-less demo mode.
//   - Per-user rate limit (DB-backed sliding window) caps LLM spend.
// ============================================================================

// -- AI Gateway is available when OIDC token exists.
//    In local dev: run `vercel env pull` to provision VERCEL_OIDC_TOKEN.
//    In production: Vercel auto-provisions it on every deployment. --
const HAS_LLM = !!process.env.VERCEL_OIDC_TOKEN;

// -- AI Gateway model slug. Gateway slugs use the DOTTED version form
//    ("anthropic/claude-sonnet-4.6"), not Anthropic's hyphenated API ids
//    ("claude-sonnet-4-6"), which the gateway rejects. Current Sonnet is
//    "anthropic/claude-sonnet-5" (listed in the @ai-sdk/gateway model catalog
//    from v4; the pinned 3.x types predate it, but the id is a plain string).
//    Env-overridable for upgrades. --
const AI_MODEL = process.env.AI_MODEL || "anthropic/claude-sonnet-5";

// -- Hard cap on generated tokens per answer (cost control). Policy drafts
//    get a larger, still bounded, budget (see lib/law/chat-prompt.js). --
const MAX_OUTPUT_TOKENS = ANSWER_MAX_OUTPUT_TOKENS;

// -- Appended when the model stream fails after some text was already sent --
const INTERRUPTED_NOTICE =
  "<br><br><em>The AI answer was interrupted. Standard policy guidance:</em><br>";

// -- Rate limit: messages per user per minute --
const CHAT_RATE_LIMIT = parseInt(process.env.CHAT_RATE_LIMIT || "20");

// -- Render retrieved handbook excerpts for the system prompt --
function buildHandbookContext(excerpts) {
  if (!excerpts || excerpts.length === 0) return "";
  const blocks = excerpts.map((e, i) => {
    const cite = `${e.document_name}${e.section ? ` § ${e.section}` : ""}`;
    return `### Excerpt ${i + 1} — [${cite}]\n${e.content}`;
  });
  return `\n## COMPANY HANDBOOK EXCERPTS (authoritative — answer from these first)\n` +
    blocks.join("\n\n") + "\n";
}

// -- Employee context block. Only states facts we actually have; never invents
//    balances or tenure for real users. --
function buildEmployeeContext(employee) {
  const lines = [
    `- Name: ${employee.firstName} ${employee.lastName || ""}`.trim(),
    employee.department ? `- Department: ${employee.department}` : null,
    `- Title: ${employee.title || "Employee"}`,
    `- State/Jurisdiction: ${employee.state}`,
    employee.location ? `- Location: ${employee.location}` : null,
    typeof employee.tenure === "number" ? `- Tenure: ${employee.tenure} years` : null,
    typeof employee.ptoBalance === "number" ? `- PTO Balance: ${employee.ptoBalance} days` : null,
    typeof employee.sickBalance === "number" ? `- Sick Leave Balance: ${employee.sickBalance} days` : null,
  ].filter(Boolean);

  let ctx = lines.join("\n");
  if (typeof employee.ptoBalance !== "number") {
    ctx += `\n- NOTE: No live balance data is connected. NEVER state a specific PTO, sick leave or benefits balance for this employee. Explain the policy and direct them to HR or the HRIS for their personal numbers.`;
  }
  return ctx;
}

// -- Full system prompt: employee context, org handbook, jurisdiction law.
//    Law context is provenance-gated: only verified facts (with source URL and
//    verified date) are given as values; the rest are marked UNVERIFIED. --
function buildSystemPrompt(employee, excerpts, { draft = false } = {}) {
  const hasHandbook = excerpts && excerpts.length > 0;
  return `You are AI HR Pilot, an expert HR policy assistant.

## Your Role
- Answer employee HR questions accurately, based FIRST on the company's own handbook excerpts below${hasHandbook ? "" : " (none uploaded yet — see fallback rule)"}, then on applicable employment law.
- Always cite your source. When answering from a handbook excerpt, cite it as [Document Name § Section]. When answering from general employment law, say so explicitly.
- ${hasHandbook
    ? "If the handbook excerpts do not cover the question, say so plainly and answer from general employment-law guidance, clearly labeled as such. Do NOT present generic guidance as company policy."
    : "This organization has not uploaded its handbook yet. Answer from general employment-law guidance only, clearly labeled as general guidance, and note that uploading the company handbook will produce company-specific answers."}
- Be empathetic but professional. Use clear, structured formatting.
- When a question involves potential legal risk (harassment, discrimination, termination, retaliation, whistleblowing), always include a disclaimer directing the employee to contact HR or Legal directly.
- Never provide actual legal advice. Always clarify that answers are general policy guidance.

${LAW_CITATION_RULES}
${draft ? `\n${POLICY_DRAFT_INSTRUCTIONS}\n` : ""}

## Current Employee Context
${buildEmployeeContext(employee)}
${buildHandbookContext(excerpts)}
## Applicable Employment Law
${buildJurisdictionContext(employee.state)}

## Response Guidelines
1. Start with a direct answer to the question.
2. Include specific numbers, dates, or thresholds ONLY when they come from the handbook excerpts or the VERIFIED LAW DATA above, with their citation. Never invent figures.
3. Mention state-specific laws when they differ from federal baseline.
4. Use bullet points and bold text for readability.
5. ${draft ? "Follow the Policy Drafting Mode structure in full." : "Keep responses under 300 words unless the topic requires more detail."}
6. End with a helpful next step.
7. Format your response in HTML using <strong>, <br>, bullet points (•), etc.
8. Do NOT use markdown headers or code blocks — use HTML formatting only.`;
}

// -- Resolve the employee context for this request.
//    Authed users: real profile from the session (never demo data).
//    Demo mode (no Clerk configured): the demo roster, as before. --
function resolveEmployee(session, body) {
  if (session.authed && !session.demo) {
    const u = session.user || {};
    const nameParts = (u.name || "").split(" ");
    return {
      id:         u.id || session.clerkId,
      firstName:  nameParts[0] || "there",
      lastName:   nameParts.slice(1).join(" ") || "",
      department: u.department || null,
      title:      u.title || "Employee",
      state:      u.state || body.jurisdiction || "Federal",
      location:   u.location || null,
      status:     "Active",
      // -- ptoBalance / sickBalance intentionally absent: no live HRIS data --
    };
  }
  // -- Demo mode only --
  const demo = DEMO_EMPLOYEES.find((e) => e.id === body.employee_id);
  return demo || {
    id: "DEMO_USER",
    firstName: "Demo",
    lastName: "User",
    state: body.jurisdiction || "Federal",
    department: "Demo",
    title: "Employee",
    location: body.jurisdiction || "Remote",
    status: "Active",
  };
}

// ============================================================================
// GET /api/chat — Load chat history from Neon for the CURRENT user's org
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ messages: [], demo: true });
  }

  // -- Tenant + user identity from the session, never the query string.
  //    No shared "default" fallback: an unprovisioned user fails closed. --
  const orgId  = guard.session.orgId;
  const userId = guard.session.user?.id || null;
  if (!orgId) {
    return NextResponse.json({ error: "Workspace not provisioned" }, { status: 409 });
  }

  const url       = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const limit     = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  try {
    const rows = await getChatHistory(orgId, userId, sessionId, { limit });
    return NextResponse.json({ messages: rows });
  } catch (err) {
    console.error("[API] getChatHistory error:", err);
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/chat — Streaming LLM or local JSON fallback
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { query, use_llm, sessionId } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }

    // -- Hard cap on query length to prevent prompt injection / LLM cost abuse --
    if (query.length > 2000) {
      return NextResponse.json({ error: "Query too long. Maximum 2000 characters." }, { status: 413 });
    }

    // -- Tenant + user identity from the session, never the body.
    //    No shared "default" fallback: an unprovisioned user fails closed. --
    const orgId  = guard.session.orgId;
    const userId = guard.session.user?.id || null;
    if (!orgId) {
      return NextResponse.json({ error: "Workspace not provisioned" }, { status: 409 });
    }

    // -- Rate limit: DB-backed sliding window per user (survives cold starts) --
    if (isDbAvailable() && userId) {
      try {
        const recent = await countRecentChatMessages(orgId, userId, 60);
        if (recent >= CHAT_RATE_LIMIT) {
          return NextResponse.json(
            { error: "Too many messages. Please wait a minute and try again." },
            { status: 429 }
          );
        }
      } catch (err) {
        console.warn("[Chat API] rate limit check failed (allowing):", err.message);
      }
    }

    // -- Resolve employee context (real profile for authed users) --
    const employee = resolveEmployee(guard.session, body);

    // -- Retrieve the org's own handbook excerpts for grounding --
    const excerpts = await retrieveContext(orgId, query, 6);

    // -- Always run local engine for triage metadata --
    const localResponse = generateResponse(query, employee);

    // -- Policy-drafting requests get the structured template + Legal basis
    //    table; every answer ends with the not-legal-advice disclaimer,
    //    appended here so the model cannot omit it. --
    const draft       = isPolicyDraftRequest(query);
    const disclaimer  = draft ? DRAFT_DISCLAIMER_HTML : LEGAL_DISCLAIMER_HTML;
    const localAnswer = localResponse.answer + LEGAL_DISCLAIMER_HTML;

    // -- Metadata headers: sent with EVERY response (streaming or JSON) --
    const metaHeaders = {
      "X-HR-Category":   localResponse.category    || "General",
      "X-HR-Risk":       String(localResponse.riskScore ?? 0),
      "X-HR-Routing":    localResponse.routing      || "auto",
      "X-HR-Confidence": String(localResponse.confidence ?? 50),
      "X-HR-Policy-Id":  localResponse.policyId     || "",
      "X-HR-Flags":      JSON.stringify(localResponse.flags || []),
      "X-HR-Disclaimer": localResponse.disclaimer   ? "1" : "0",
      "X-HR-Source":     localResponse.source       || "AI HR Pilot",
      "X-HR-Grounded":   excerpts.length > 0 ? "1" : "0",
      "X-HR-Mode":       draft ? "policy-draft" : "answer",
    };

    // -- Save user message to Neon (fire-and-forget) --
    if (isDbAvailable()) {
      saveChatMessage(orgId, {
        userId,
        sessionId: sessionId || null,
        role:      "user",
        content:   query,
        metadata:  { grounded: excerpts.length > 0 },
      }).catch((err) => console.warn("[Chat API] saveChatMessage failed:", err.message));
    }

    // ============================================================================
    // LLM PATH — streaming response via AI SDK streamText
    // ============================================================================
    if (HAS_LLM && use_llm !== false) {
      try {
        const result = streamText({
          model:     AI_MODEL,
          system:    buildSystemPrompt(employee, excerpts, { draft }),
          prompt:    query,
          maxOutputTokens: draft ? DRAFT_MAX_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,

          // -- Errors surface inside the stream (streamText never throws
          //    synchronously); report them, the stream handling below turns
          //    them into the local-engine fallback. --
          onError: ({ error }) => {
            console.error("[Chat API] LLM stream error:", error?.message || error);
            Sentry.captureException(error);
          },

          // -- onFinish: persist assistant message to Neon after stream completes --
          onFinish: ({ text }) => {
            if (isDbAvailable()) {
              saveChatMessage(orgId, {
                userId,
                sessionId: sessionId || null,
                role:      "assistant",
                content:   text + disclaimer,
                metadata:  {
                  category:   localResponse.category,
                  riskScore:  localResponse.riskScore,
                  routing:    localResponse.routing,
                  confidence: localResponse.confidence,
                  policyId:   localResponse.policyId,
                  grounded:   excerpts.length > 0,
                  llm:        true,
                },
              }).catch((err) => console.warn("[Chat API] saveChatMessage (stream) failed:", err.message));
            }
          },
        });

        // -- Wait for the first text chunk before committing to a streaming
        //    response. A gateway/model failure (bad slug, auth, overload) shows
        //    up here as an error part and throws into the JSON fallback below,
        //    instead of returning an empty 200 stream. --
        const parts = result.fullStream[Symbol.asyncIterator]();
        let firstText = null;
        while (firstText === null) {
          const { value, done } = await parts.next();
          if (done) throw new Error("LLM stream ended without text");
          if (value.type === "error") throw value.error instanceof Error ? value.error : new Error(String(value.error));
          if (value.type === "text-delta" && value.text) firstText = value.text;
        }

        // -- Stream the rest. A mid-stream failure appends the local-engine
        //    answer so the user never ends up with a truncated reply. --
        const encoder = new TextEncoder();
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(firstText));
          },
          async pull(controller) {
            try {
              while (true) {
                const { value, done } = await parts.next();
                if (done) {
                  controller.enqueue(encoder.encode(disclaimer));
                  controller.close();
                  return;
                }
                if (value.type === "error") throw value.error;
                if (value.type === "text-delta" && value.text) {
                  controller.enqueue(encoder.encode(value.text));
                  return;
                }
              }
            } catch (err) {
              console.error("[Chat API] LLM stream failed mid-response:", err?.message || err);
              controller.enqueue(encoder.encode(INTERRUPTED_NOTICE + localAnswer));
              controller.close();
            }
          },
          cancel() {
            parts.return?.();
          },
        });

        const responseHeaders = new Headers({ "Content-Type": "text/plain; charset=utf-8" });
        for (const [k, v] of Object.entries(metaHeaders)) {
          responseHeaders.set(k, v);
        }
        responseHeaders.set("X-HR-LLM", "1");
        responseHeaders.set("X-HR-LLM-Failed", "0");

        return new Response(body, { status: 200, headers: responseHeaders });
      } catch (llmError) {
        console.error("[Chat API] LLM failed, falling back to local:", llmError?.message || llmError);
        return NextResponse.json({
          answer:     localAnswer,
          source:     localResponse.source,
          category:   localResponse.category,
          riskScore:  localResponse.riskScore,
          routing:    localResponse.routing,
          flags:      localResponse.flags,
          disclaimer: localResponse.disclaimer,
          confidence: localResponse.confidence,
          policyId:   localResponse.policyId,
          llm:        false,
          llm_attempted: true,
          llm_failed: true,
        }, {
          headers: { ...metaHeaders, "X-HR-LLM": "0", "X-HR-LLM-Failed": "1" },
        });
      }
    }

    // ============================================================================
    // LOCAL-ONLY PATH — JSON response, no LLM configured
    // ============================================================================

    if (isDbAvailable()) {
      saveChatMessage(orgId, {
        userId,
        sessionId: sessionId || null,
        role:      "assistant",
        content:   localAnswer,
        metadata:  {
          category:   localResponse.category,
          riskScore:  localResponse.riskScore,
          routing:    localResponse.routing,
          confidence: localResponse.confidence,
          policyId:   localResponse.policyId,
          llm:        false,
        },
      }).catch((err) => console.warn("[Chat API] saveChatMessage (local) failed:", err.message));
    }

    return NextResponse.json({
      answer:        localAnswer,
      source:        localResponse.source,
      category:      localResponse.category,
      riskScore:     localResponse.riskScore,
      routing:       localResponse.routing,
      flags:         localResponse.flags,
      disclaimer:    localResponse.disclaimer,
      confidence:    localResponse.confidence,
      policyId:      localResponse.policyId,
      llm:           false,
      llm_attempted: false,
      llm_failed:    false,
    }, {
      headers: { ...metaHeaders, "X-HR-LLM": "0", "X-HR-LLM-Failed": "0" },
    });
  } catch (error) {
    console.error("[Chat API] Unhandled error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
