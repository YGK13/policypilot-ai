import { NextResponse } from "next/server";
import { generateResponse } from "@/lib/engine/response-gen";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";

// ============================================================================
// POST /api/chat — Process HR query and return policy response
// Accepts: { query, employee_id, jurisdiction }
// Returns: { answer, source, category, riskScore, routing, flags, disclaimer, confidence }
// ============================================================================

export async function POST(request) {
  try {
    const body = await request.json();
    const { query, employee_id, jurisdiction } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }

    // -- Resolve employee context --
    let employee = DEMO_EMPLOYEES.find((e) => e.id === employee_id);
    if (!employee) {
      // -- Fallback: create minimal employee from jurisdiction --
      employee = {
        id: "API_USER",
        firstName: "API",
        lastName: "User",
        state: jurisdiction || "Federal",
        tenure: 2,
        department: "Unknown",
        location: jurisdiction || "Remote",
        ptoBalance: 15,
        sickBalance: 8,
        status: "Active",
      };
    }

    // -- Generate response --
    const response = generateResponse(query, employee);

    return NextResponse.json({
      answer: response.answer,
      source: response.source,
      category: response.category,
      riskScore: response.riskScore,
      routing: response.routing,
      flags: response.flags,
      disclaimer: response.disclaimer,
      confidence: response.confidence,
      policyId: response.policyId,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
