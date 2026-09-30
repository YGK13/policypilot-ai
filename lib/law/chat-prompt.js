// ============================================================================
// CHAT LAW PROMPT — provenance-aware law context, citation rules, disclaimers
// and policy-drafting mode for /api/chat.
//
// Mirrors the hr-policy-expert skill's three rules:
//   1. Verify before stating: only figures from the VERIFIED LAW DATA block,
//      otherwise say it is not known / must be verified.
//   2. Cite everything: each legal figure cites its source URL + verified date.
//   3. Disclaim: every answer ends with the not-legal-advice disclaimer
//      (appended server-side so the model cannot drop it).
// ============================================================================

import JURISDICTIONS from "../data/jurisdictions";
import { factEntries, formatFactForPrompt } from "./provenance";

export const LEGAL_DISCLAIMER_HTML =
  "<br><br><em>This is general HR policy information, not legal advice. Employment law changes often; confirm current requirements with employment counsel or the official agency before acting.</em>";

export const DRAFT_DISCLAIMER_HTML =
  "<br><br><em>This is a compliance-oriented draft, not legal advice. Have employment counsel review it before adoption, especially the items flagged above.</em>";

// -- Output budget: answers stay short; a full policy draft needs room for
//    the template sections and the Legal basis table. --
export const ANSWER_MAX_OUTPUT_TOKENS = 1024;
export const DRAFT_MAX_OUTPUT_TOKENS = 3000;

// -- "Draft/write/create ... policy", "policy for ...", handbook sections --
const DRAFT_VERB = /\b(draft|write|create|generate|prepare|produce|build|compose|revise|rewrite|update)\b/i;
const POLICY_NOUN = /\b(polic(y|ies)|handbook( section)?|code of conduct|procedure)\b/i;
const TEMPLATE_ASK = /\b(policy|handbook)\s+(template|draft)\b/i;

export function isPolicyDraftRequest(query) {
  if (typeof query !== "string") return false;
  if (TEMPLATE_ASK.test(query)) return true;
  return DRAFT_VERB.test(query) && POLICY_NOUN.test(query);
}

// -- Law context: verified facts with citations; unverified ones replaced by a
//    "do not state" line so no unsourced figure reaches the model. --
export function buildJurisdictionContext(state, now = new Date()) {
  const key = JURISDICTIONS[state] ? state : "Federal";
  const lines = [`\n## ${key} Employment Law (VERIFIED LAW DATA)`];
  for (const [field, fact] of factEntries(JURISDICTIONS[key])) {
    lines.push(formatFactForPrompt(field, fact, now));
  }
  if (key !== "Federal") {
    lines.push(`\n## Federal Baseline (VERIFIED LAW DATA)`);
    for (const [field, fact] of factEntries(JURISDICTIONS["Federal"])) {
      lines.push(formatFactForPrompt(field, fact, now));
    }
  }
  return lines.join("\n") + "\n";
}

export const LAW_CITATION_RULES = `## Legal Accuracy Rules (mandatory)
- Legal figures (wages, salary thresholds, hours, weeks, headcount triggers, deadlines, penalties, effective dates) may come ONLY from the company handbook excerpts or the VERIFIED LAW DATA block below. Your own memory of the law is NOT a source.
- Every legal figure you state must cite its source inline, e.g. (Source: https://..., verified 2026-09-24). Use the URL and verified date given next to that fact.
- If a topic is marked UNVERIFIED, or is not in the data at all, say plainly that you do not have a verified figure and that it must be verified with employment counsel or the official agency (DOL, EEOC or the state labor department). Do not guess or fill it in.
- If a fact is marked VERIFICATION OVERDUE, state it with its source and tell the user to confirm it is still current.
- A standard not-legal-advice disclaimer is appended to every answer automatically; do not repeat it at the end.`;

export const POLICY_DRAFT_INSTRUCTIONS = `## Policy Drafting Mode
The user asked you to draft or revise a policy. Produce it in this exact structure (HTML, using <strong> section headings and <br>):
<strong>[Policy name]</strong><br>Effective date: [date] | Version: [n] | Owner: [role] | Applies to: [who]
<strong>Purpose</strong>: one or two sentences.
<strong>Scope</strong>: who is covered, who is not, and where (states / locations).
<strong>Definitions</strong>: only terms that would otherwise be ambiguous.
<strong>Policy</strong>: the rules, in plain language, second person ("you"), about an 8th-grade reading level.
<strong>Procedure</strong>: step by step; name roles, not people.
<strong>State-specific terms</strong>: one short subsection per state that differs from the baseline.
<strong>Related policies</strong>
<strong>Revision history</strong>: date, change, approved by.
Then, separated by <hr>, the internal section:
<strong>Legal basis (internal, not part of the employee-facing policy)</strong> as an HTML <table> with columns Requirement | Jurisdiction | Source | URL | Checked. One row per legal requirement the policy relies on, taken ONLY from the VERIFIED LAW DATA (Checked = its verified date). For any requirement without verified data, write the row with Source "[VERIFY]" and URL "pending" and keep a placeholder like [VERIFY: CA final-pay deadline] in the policy text instead of a value.
<strong>Open items / counsel flags</strong>: list every [VERIFY] placeholder, plus any terminations of protected-class employees, non-competes, arbitration or class waivers, leave interactions (FMLA + ADA + state leave), union settings, international employees, and states whose law changed in the last 12 months.
Keep at-will language and a reservation-of-rights clause where the jurisdiction allows. No em dashes.`;
