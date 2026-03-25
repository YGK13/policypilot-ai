import { NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateResponse } from "@/lib/engine/response-gen";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import POLICIES from "@/lib/data/policies";

// ============================================================================
// POST /api/chat — Hybrid LLM + policy engine for HR queries
//
// MODE 1 (LLM): ANTHROPIC_API_KEY is set → uses AI SDK + Claude to generate
//   natural language answers grounded in the full policy + jurisdiction database.
//   Local risk scorer still runs for triage metadata (routing, risk, category).
//   Falls back to local engine if LLM call fails.
//
// MODE 2 (local): No API key → keyword-matching policy engine only.
//
// NOTE: This uses @ai-sdk/anthropic directly (not AI Gateway) because
// AI HR Pilot is a self-hosted product — customers bring their own API keys.
// For Vercel-hosted deployments, swap to AI Gateway with OIDC auth.
// ============================================================================

const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY;

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

// -- System prompt for Claude --
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, employee_id, jurisdiction, use_llm } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 }
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

    // -- Always generate local response for triage metadata --
    const localResponse = generateResponse(query, employee);

    // -- If LLM mode is enabled and API key exists, call Claude via AI SDK --
    if (HAS_API_KEY && use_llm !== false) {
      try {
        const { text } = await generateText({
          model: anthropic("claude-sonnet-4-20250514"), // eslint-disable-line -- direct provider intentional for self-hosted product
          system: buildSystemPrompt(employee),
          prompt: query,
          maxTokens: 1024,
        });

        return NextResponse.json({
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
        });
      } catch (llmError) {
        console.error("LLM call failed, falling back to local:", llmError.message);
        // Fall through to local response below
      }
    }

    // -- Local-only response (no LLM or LLM failed) --
    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
