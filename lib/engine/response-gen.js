// ============================================================================
// RESPONSE GENERATOR — Combines policy search + risk scoring
// Returns complete response object with answer, metadata, and disclaimer
// ============================================================================

import { searchPolicies } from "./policy-search";
import { calcRisk } from "./risk-scorer";

export function generateResponse(query, employee) {
  const policy = searchPolicies(query);
  const risk = calcRisk(query, employee, policy);

  if (policy) {
    const answer = typeof policy.answer === "function" ? policy.answer(employee) : policy.answer;

    let disclaimer = "";
    if (risk.routing === "legal") {
      disclaimer = "Escalated to HR and Legal. A senior representative will contact you within 24 hours.";
    } else if (risk.routing === "hr") {
      disclaimer = "General policy information only — not legal advice. Contact HR for your specific situation.";
    } else if (risk.routing === "auto_enhanced") {
      disclaimer = "For general guidance. Consult HR or Legal for specific situations.";
    } else {
      disclaimer = "General guidance based on company policy.";
    }

    return {
      answer,
      source: policy.source,
      category: policy.category,
      riskScore: risk.score,
      routing: risk.routing,
      flags: risk.flags,
      disclaimer,
      policyId: policy.id,
      confidence: risk.confidence,
    };
  }

  // -- No match fallback --
  return {
    answer: 'I don\'t have specific policy information about that topic.<br><br><strong>Get help:</strong> hr@company.com | (555) 123-4567 | Slack #hr-support<br>Would you like me to create a support ticket?',
    source: null,
    category: "Unknown",
    riskScore: risk.score,
    routing: risk.routing,
    flags: risk.flags,
    disclaimer: "Contact HR directly for topics not in the policy database.",
    policyId: null,
    confidence: risk.confidence,
  };
}
