// ============================================================================
// RISK SCORING ENGINE — Multi-factor risk assessment
// Keyword detection + category weighting + intent analysis + context signals
// ============================================================================

const CRITICAL_KW = ["lawsuit","sue","attorney","lawyer","legal action","discrimination","eeoc","dol complaint","wrongful termination","whistleblower","osha violation","class action","labor board"];
const HIGH_KW = ["harassment","fired","terminated","let go","laid off","hostile","retaliation","complaint","ada","disability","fmla","pregnant","pregnancy","accommodation","religion","race","gender","age discrimination","investigation","written warning","pip","performance improvement"];
const MEDIUM_KW = ["complaint","unfair","concerned","worried","manager issue","hr complaint","grievance","denied","rejected","appeal","uncomfortable","inappropriate","pay gap","equity concern"];

const CAT_RISK = {
  "Leave & Time Off": 0,
  "Benefits": 5,
  "Compensation": 10,
  "Workplace Policies": 5,
  "Career & Development": 5,
  "General Information": 0,
  "Employment Status": 25,
  "Workplace Issues": 30,
  "Compliance & Legal": 40,
};

export function calcRisk(msg, emp, policy) {
  let score = 0;
  const flags = [];
  const lower = msg.toLowerCase();

  // -- Keyword detection --
  for (const kw of CRITICAL_KW) {
    if (lower.includes(kw)) { score += 40; flags.push('CRITICAL: "' + kw + '"'); }
  }
  for (const kw of HIGH_KW) {
    if (lower.includes(kw)) { score += 20; flags.push('HIGH: "' + kw + '"'); }
  }
  for (const kw of MEDIUM_KW) {
    if (lower.includes(kw)) { score += 10; flags.push('MEDIUM: "' + kw + '"'); }
  }

  // -- Category risk --
  if (policy) score += CAT_RISK[policy.category] || 0;

  // -- Intent detection --
  const complaints = ["i want to complain", "i need to report", "this is unacceptable", "i'm filing"];
  const escalations = ["talk to a human", "speak to someone", "talk to hr", "escalate"];
  for (const p of complaints) { if (lower.includes(p)) { score += 20; flags.push("INTENT: complaint"); break; } }
  for (const p of escalations) { if (lower.includes(p)) { score += 15; flags.push("INTENT: escalation"); break; } }

  // -- Clamp and route --
  const s = Math.min(score, 100);
  let routing = s >= 76 ? "legal" : s >= 51 ? "hr" : s >= 26 ? "auto_enhanced" : "auto";

  // -- Policy-level override --
  if (policy?.escalate === "legal" && routing !== "legal") routing = "legal";
  if (policy?.escalate === "hr" && routing === "auto") routing = "hr";

  return {
    score: s,
    routing,
    flags,
    confidence: policy ? Math.min(98, 70 + policy.keywords.length * 2) : 25,
  };
}
