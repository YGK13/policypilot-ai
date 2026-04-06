import { NextResponse } from "next/server";
import { generateText } from "ai";
import { generateResponse } from "@/lib/engine/response-gen";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import POLICIES from "@/lib/data/policies";
import { saveChatMessage, getChatHistory, isDbAvailable } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// ============================================================================
// POST /api/chat — Hybrid LLM + local policy engine for HR queries
//
// Uses Vercel AI Gateway (OIDC auth) when available for real LLM responses.
// Falls back to local keyword-matching engine when AI Gateway is not configured.
// Local risk scorer always runs for triage metadata (routing, risk, category).
// ============================================================================

// -- AI Gateway is available when OIDC token exists (auto-provisioned on Vercel) --
const HAS_AI_GATEWAY = !!process.env.VERCEL_OIDC_TOKEN;
// -- Direct Anthropic key is the fallback when AI Gateway is not configured --
const HAS_ANTHROPIC_KEY = !!process.env.ANTHROPIC_API_KEY;
// -- LLM is available if either gateway or direct key is present --
const HAS_LLM = HAS_AI_GATEWAY || HAS_ANTHROPIC_KEY;

// -- Build jurisdiction context for the system prompt --
function buildJurisdictionContext(state) {
  const j = JURISDICTIONS[state] || JURISDICTIONS["Federal"];
  const fed = JURISDICTIONS["Federal"];
  let ctx = `\n## ${state} Employment Law Summary\n`;
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

// -- System prompt for the LLM --
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
// GET /api/chat?orgId=xxx&userId=xxx&sessionId=xxx&limit=50
// Load chat history for a user/session from Neon
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  if (!isDbAvailable()) {
    return NextResponse.json({ messages: [], demo: true });
  }
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";
  const userId = url.searchParams.get("userId");
  const sessionId = url.searchParams.get("sessionId");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  try {
    const rows = await getChatHistory(orgId, userId, sessionId, { limit });
    return NextResponse.json({ messages: rows });
  } catch (err) {
    console.error("[API] getChatHistory error:", err);
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/chat — Hybrid LLM + local policy engine for HR queries
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("employee");
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { query, employee_id, jurisdiction, use_llm, orgId, userId, sessionId } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }

    // -- Hard cap on query length to prevent prompt injection / LLM cost abuse --
    if (query.length > 2000) {
      return NextResponse.json(
        { error: "Query too long. Maximum 2000 characters." },
        { status: 413 }
      );
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

    // -- Save user message to Neon (fire-and-forget) --
    const saveOrg = orgId || "default";
    if (isDbAvailable()) {
      saveChatMessage(saveOrg, {
        userId: userId || null,
        sessionId: sessionId || null,
        role: "user",
        content: query,
        metadata: { employeeId: employee_id, jurisdiction },
      }).catch((err) => console.warn("[Chat API] saveChatMessage failed:", err.message));
    }

    // -- Always generate local response for triage metadata --
    const localResponse = generateResponse(query, employee);

    // -- Helper to persist assistant response and return JSON --
    const respond = (data) => {
      if (isDbAvailable()) {
        saveChatMessage(saveOrg, {
          userId: userId || null,
          sessionId: sessionId || null,
          role: "assistant",
          content: data.answer,
          metadata: {
            category: data.category,
            riskScore: data.riskScore,
            routing: data.routing,
            llm: data.llm,
            confidence: data.confidence,
            policyId: data.policyId,
          },
        }).catch((err) => console.warn("[Chat API] saveChatMessage failed:", err.message));
      }
      return NextResponse.json(data);
    };

    // -- If LLM is available, call via AI Gateway (preferred) or direct Anthropic key --
    if (HAS_LLM && use_llm !== false) {
      try {
        // -- Build model: AI Gateway OIDC (preferred) or direct @ai-sdk/anthropic fallback --
        let aiModel;
        if (HAS_AI_GATEWAY) {
          // AI Gateway: plain "provider/model" string routes via OIDC automatically
          aiModel = "anthropic/claude-sonnet-4.6";
        } else {
          // Direct Anthropic: uses ANTHROPIC_API_KEY from env
          const { anthropic } = await import("@ai-sdk/anthropic");
          aiModel = anthropic("claude-sonnet-4-6");
        }
        const { text } = await generateText({
          model: aiModel,
          system: buildSystemPrompt(employee),
          prompt: query,
          maxTokens: 1024,
        });

        return respond({
          answer: text,
          source: localResponse.source || "AI HR Pilot (LLM)",
          category: localResponse.category,
          riskScore: localResponse.riskScore,
          routing: localResponse.routing,
          flags: localResponse.flags,
          disclaimer: localResponse.disclaimer,
          confidence: Math.min(98, localResponse.confidence + 10),
          policyId: localResponse.policyId,
          llm: true,
          llm_attempted: true,
          llm_failed: false,
        });
      } catch (llmError) {
        console.error("[AI HR Pilot] LLM call failed, falling back to local:", llmError.message);
        // Fall through to local response below with failure flag
        return respond({
          answer: localResponse.answer,
          source: localResponse.source,
          category: localResponse.category,
          riskScore: localResponse.riskScore,
          routing: localResponse.routing,
          flags: localResponse.flags,
          disclaimer: localResponse.disclaimer,
          confidence: localResponse.confidence,
          policyId: localResponse.policyId,
          llm: false,
          llm_attempted: true,
          llm_failed: true,
        });
      }
    }

    // -- Local-only response (no LLM configured) --
    return respond({
      answer: localResponse.answer,
      source: localResponse.source,
      category: localResponse.category,
      riskScore: localResponse.riskScore,
      routing: localResponse.routing,
      flags: localResponse.flags,
      disclaimer: localResponse.disclaimer,
      confidence: localResponse.confidence,
      policyId: localResponse.policyId,
      llm: false,
      llm_attempted: false,
      llm_failed: false,
    });
  } catch (error) {
    console.error("[AI HR Pilot] Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
