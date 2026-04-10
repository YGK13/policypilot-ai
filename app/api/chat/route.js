import { NextResponse } from "next/server";
import { streamText } from "ai";
import { generateResponse } from "@/lib/engine/response-gen";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import POLICIES from "@/lib/data/policies";
import { saveChatMessage, getChatHistory, isDbAvailable } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// ============================================================================
// POST /api/chat — Streaming LLM + local policy engine for HR queries
//
// LLM path (preferred):
//   Uses Vercel AI Gateway (OIDC) or direct Anthropic key.
//   Returns a streaming SSE response via streamText().toDataStreamResponse().
//   Client uses useChat() from 'ai/react' to render tokens as they arrive.
//
// Local path (fallback when no LLM configured):
//   Returns JSON with the local keyword-matching engine response.
//   Client chat page detects non-streaming JSON and renders it directly.
//
// Metadata (routing, riskScore, category) from the local risk scorer
// is always computed and sent as response headers so the client can
// create tickets without waiting for the stream to finish.
// ============================================================================

// -- AI Gateway is available when OIDC token exists.
//    In local dev: run `vercel env pull` to provision VERCEL_OIDC_TOKEN.
//    In production: Vercel auto-provisions it on every deployment. --
const HAS_LLM = !!process.env.VERCEL_OIDC_TOKEN;

// -- Build jurisdiction context for the system prompt --
function buildJurisdictionContext(state) {
  const j   = JURISDICTIONS[state] || JURISDICTIONS["Federal"];
  const fed = JURISDICTIONS["Federal"];
  let ctx   = `\n## ${state} Employment Law Summary\n`;
  for (const [key, val] of Object.entries(j)) {
    if (key === "flag") continue;
    ctx += `- ${key}: ${val}\n`;
  }
  if (state !== "Federal") {
    ctx += `\n## Federal Baseline\n`;
    for (const [key, val] of Object.entries(fed)) {
      if (key === "flag") continue;
      ctx += `- ${key}: ${val}\n`;
    }
  }
  return ctx;
}

// -- Build policy catalog summary --
function buildPolicyCatalog() {
  return POLICIES.map((p) =>
    `- [${p.id}] ${p.source} (Category: ${p.category}, Risk: ${p.riskLevel})` +
    `\n  Keywords: ${p.keywords.join(", ")}` +
    (p.escalate ? `\n  Escalation: ${p.escalate}` : "")
  ).join("\n");
}

// -- Full system prompt with employee context, jurisdiction law, policy catalog --
function buildSystemPrompt(employee) {
  return `You are AI HR Pilot, an expert HR policy assistant for enterprise organizations.

## Your Role
- Answer employee HR questions accurately based on company policies and applicable employment law.
- Always cite which policy document your answer comes from.
- Be empathetic but professional. Use clear, structured formatting.
- When a question involves potential legal risk (harassment, discrimination, termination, retaliation, whistleblowing), always include a disclaimer directing the employee to contact HR or Legal directly.
- Never provide actual legal advice. Always clarify that answers are general policy guidance.

## Current Employee Context
- Name: ${employee.firstName} ${employee.lastName}
- Department: ${employee.department}
- Title: ${employee.title || "Employee"}
- State/Jurisdiction: ${employee.state}
- Location: ${employee.location}
- Tenure: ${employee.tenure} years
- PTO Balance: ${employee.ptoBalance} days
- Sick Leave Balance: ${employee.sickBalance} days
- Status: ${employee.status}

## Applicable Employment Law
${buildJurisdictionContext(employee.state)}

## Company Policy Catalog
${buildPolicyCatalog()}

## Response Guidelines
1. Start with a direct answer to the question.
2. Include specific numbers, dates, or thresholds when available.
3. Mention state-specific laws when they differ from federal baseline.
4. Use bullet points and bold text for readability.
5. Keep responses under 300 words unless the topic requires more detail.
6. End with a helpful next step or resource link.
7. Format your response in HTML using <strong>, <br>, bullet points (•), etc.
8. Do NOT use markdown headers or code blocks — use HTML formatting only.`;
}

// ============================================================================
// GET /api/chat — Load chat history from Neon for a session
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ messages: [], demo: true });
  }

  const url       = new URL(request.url);
  const orgId     = url.searchParams.get("orgId")     || "default";
  const userId    = url.searchParams.get("userId");
  const sessionId = url.searchParams.get("sessionId");
  const limit     = parseInt(url.searchParams.get("limit") || "50");

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
    const { query, employee_id, jurisdiction, use_llm, orgId, userId, sessionId } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }

    // -- Hard cap on query length to prevent prompt injection / LLM cost abuse --
    if (query.length > 2000) {
      return NextResponse.json({ error: "Query too long. Maximum 2000 characters." }, { status: 413 });
    }

    // -- Resolve employee context --
    let employee = DEMO_EMPLOYEES.find((e) => e.id === employee_id);
    if (!employee) {
      employee = {
        id: "API_USER",
        firstName: "API",
        lastName: "User",
        state: jurisdiction || "Federal",
        tenure: 2,
        department: "Unknown",
        title: "Employee",
        location: jurisdiction || "Remote",
        ptoBalance: 15,
        sickBalance: 8,
        status: "Active",
      };
    }

    // -- Always run local engine for triage metadata --
    const localResponse = generateResponse(query, employee);

    // -- Metadata headers: sent with EVERY response (streaming or JSON)
    //    Client reads these immediately to create tickets without waiting for stream end --
    const metaHeaders = {
      "X-HR-Category":   localResponse.category    || "General",
      "X-HR-Risk":       String(localResponse.riskScore ?? 0),
      "X-HR-Routing":    localResponse.routing      || "auto",
      "X-HR-Confidence": String(localResponse.confidence ?? 50),
      "X-HR-Policy-Id":  localResponse.policyId     || "",
      "X-HR-Flags":      JSON.stringify(localResponse.flags || []),
      "X-HR-Disclaimer": localResponse.disclaimer   ? "1" : "0",
      "X-HR-Source":     localResponse.source       || "AI HR Pilot",
    };

    // -- Save user message to Neon (fire-and-forget) --
    const saveOrg = orgId || "default";
    if (isDbAvailable()) {
      saveChatMessage(saveOrg, {
        userId:    userId    || null,
        sessionId: sessionId || null,
        role:      "user",
        content:   query,
        metadata:  { employeeId: employee_id, jurisdiction },
      }).catch((err) => console.warn("[Chat API] saveChatMessage failed:", err.message));
    }

    // ============================================================================
    // LLM PATH — streaming response via AI SDK streamText
    // ============================================================================
    if (HAS_LLM && use_llm !== false) {
      try {
        // -- AI Gateway: plain "provider/model" string routes via OIDC automatically.
        //    No API key needed — VERCEL_OIDC_TOKEN handles auth. --
        const aiModel = "anthropic/claude-sonnet-4.6";

        const result = streamText({
          model:     aiModel,
          system:    buildSystemPrompt(employee),
          prompt:    query,
          maxTokens: 1024,

          // -- onFinish: persist assistant message to Neon after stream completes --
          onFinish: ({ text }) => {
            if (isDbAvailable()) {
              saveChatMessage(saveOrg, {
                userId:    userId    || null,
                sessionId: sessionId || null,
                role:      "assistant",
                content:   text,
                metadata:  {
                  category:   localResponse.category,
                  riskScore:  localResponse.riskScore,
                  routing:    localResponse.routing,
                  confidence: localResponse.confidence,
                  policyId:   localResponse.policyId,
                  llm:        true,
                },
              }).catch((err) => console.warn("[Chat API] saveChatMessage (stream) failed:", err.message));
            }
          },
        });

        // -- Return plain text stream with metadata headers.
        //    toTextStreamResponse() emits raw text chunks (no SSE envelope)
        //    so the client can progressively append tokens to the HTML message. --
        const streamResponse = result.toTextStreamResponse();
        const responseHeaders = new Headers(streamResponse.headers);
        for (const [k, v] of Object.entries(metaHeaders)) {
          responseHeaders.set(k, v);
        }
        responseHeaders.set("X-HR-LLM", "1");
        responseHeaders.set("X-HR-LLM-Failed", "0");

        return new Response(streamResponse.body, {
          status:  streamResponse.status,
          headers: responseHeaders,
        });
      } catch (llmError) {
        console.error("[Chat API] streamText failed, falling back to local:", llmError.message);
        // -- Fall through to local JSON response with failure flag --
        return NextResponse.json({
          answer:     localResponse.answer,
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

    // -- Save local response to Neon --
    if (isDbAvailable()) {
      saveChatMessage(saveOrg, {
        userId:    userId    || null,
        sessionId: sessionId || null,
        role:      "assistant",
        content:   localResponse.answer,
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
      answer:        localResponse.answer,
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
