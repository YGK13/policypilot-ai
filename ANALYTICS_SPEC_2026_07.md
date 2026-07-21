# AI HR Pilot — Analytics Spec

Written 2026-07-21. Status: pre-code. Ranked by pilot-buyer relevance, not novelty.

## Buyer

Two ICPs. Rank per section reflects which buyer weights that metric highest.

- **SMB Head of HR** (50-500 heads). Cares about hours saved, compliance blind spots, cost-per-ticket, "can I justify this to the CFO next quarter."
- **PE portco HR ops** (post-carveout, 200-2,000 heads). Cares about per-BU breakdowns, sensitive-topic auditability, benchmark vs peer portcos, headcount avoidance.

Analytics for the **hr_admin** role. Employee/hr_staff surfaces get a stripped subset.

## Non-goals

- No vanity charts. Every card answers a decision.
- No metric that requires infra we do not have (real-time streaming, event bus, dedicated OLAP).
- No metric that pretends to be causal when it is correlational.

## Category ranking

### Tier 1 — Ship first (pilot needs these to renew)

1. **ROI / hours saved**
   - Auto-resolve rate (tickets closed by chat with no human override) — headline number.
   - Estimated hours saved this month vs baseline ticket cost.
   - Cost-per-ticket avoided (org-configurable baseline; default $12).
   - Trend line, month-over-month.
   - **Why it ships first:** this is the sentence Yuri needs the buyer's CFO to hear.

2. **Adoption**
   - WAU / MAU, and per-role split (employee vs hr_staff vs hr_admin).
   - Per-department usage (BambooHR-fed once integration is real; manual until then).
   - "% of eligible employees who asked at least one question this month."
   - Time-to-first-answer P50/P95.
   - **Why:** low adoption is the #1 kill signal for HR software renewals.

3. **Answer quality**
   - Citation coverage (% of answers that cited at least one policy chunk).
   - Human override / edit rate on HR-staff-facing suggestions.
   - Thumbs-down rate + reason bucket.
   - Answer-confidence distribution (from the LLM's own logprobs / self-report).
   - **Why:** if quality drifts, adoption collapses. This is the leading indicator.

### Tier 2 — Ship next (differentiators, most competitors do not do these)

4. **Compliance risk score**
   - Rolling count of employee questions that were escalated because policy coverage was thin.
   - Broken down by jurisdiction (state) and topic (leave, wage, harassment, ADA, FMLA).
   - Heat map: rows = US states you employ people in, columns = topic bucket, cell = questions unanswered in the last 30 days.
   - **Why:** this is the number that gets HR a seat at the ELT table. No one else surfaces it.

5. **Escalation reasons**
   - When the AI hands off to a human, why? (Six buckets: policy-not-found, jurisdiction-not-covered, sensitive-topic, low-confidence, user-requested-human, other.)
   - Distribution and trend.
   - **Why:** tells the HR admin exactly what to fix in the knowledge base to move Tier 1 numbers up.

6. **Policy coverage / freshness**
   - Which policies are cited most, which never cited.
   - Age of most-cited policies (are we quoting a 2019 handbook to answer 2026 questions?).
   - "Ghost policies" — topics employees keep asking about that no policy addresses.
   - **Why:** turns analytics into a task list for the HR admin.

### Tier 3 — Nice to have (defensible, but not renewal-blocking)

7. **Cohort retention**
   - New-hire cohort chart: how quickly does a hire's usage plateau or fall off? Correlates with successful onboarding.
   - Segment by hire month, department, manager (once org data is real).

8. **Sensitive-topic auditability**
   - Full audit trail of who asked what about {harassment, discrimination, wage disputes, ADA, immigration}.
   - Retention config (default 7 years, org-configurable).
   - Exportable for legal hold.
   - **Enterprise-only surface** — most SMBs will not use it, but portco GCs will insist.

9. **Question sentiment / urgency trend**
   - Rolling sentiment on questions in {benefits, compensation, leadership} categories.
   - Early warning signal for morale problems.
   - Flagged when a topic sentiment drops >20% week-over-week.
   - Novel; nobody in HR SaaS ships this today. Higher risk of false positives.

### Tier 4 — Deferred (post-pilot; interesting but not asked for yet)

10. **AI economics** — token cost per resolved ticket, per model version. Internal-facing.
11. **Peer benchmarks** — how does your compliance risk score compare to other pilot portcos? Requires >10 orgs on-platform. Not day 1.

## Cross-cutting requirements

- **Org-scoped, always.** Every query filters by `session.orgId` from the RBAC guard. Never trust client-supplied `orgId`.
- **Time selector.** 7d / 30d / 90d / QTD / YTD at the top of every page.
- **Export.** Every chart has a CSV export button. This is table stakes for HR ops.
- **Empty states are prescriptive.** "No data yet — connect BambooHR to auto-populate departments" beats "Nothing to show."
- **PDF board pack.** One-click monthly PDF for the HR admin to hand to leadership. Covers Tier 1 metrics only. Ships with Tier 1.

## Data sources

- `tickets` table — already there, primary source for adoption + ROI + escalation.
- `audit` table — feeds compliance risk score once escalation reasons are structured.
- `documents.policy_chunks` — feeds citation coverage + policy freshness.
- `users` table + upcoming BambooHR/Gusto sync — feeds per-department, per-BU breakdowns.

## Schema deltas needed

- `tickets.escalation_reason` (enum, nullable) — currently missing; needed for Tier 2 #5.
- `tickets.ai_confidence` (numeric 0-1, nullable) — currently missing; needed for Tier 1 #3.
- `tickets.was_auto_resolved` (bool, default false) — currently derived; make it explicit for query speed.
- Materialized view for monthly rollups; refresh nightly.

## Effort estimate

- Tier 1 (three cards + one page shell + CSV export): 3 focused eng days.
- Tier 2 (compliance heatmap + escalation breakdown + policy freshness): 4 days.
- Tier 3 (cohort + sensitive-topic audit + sentiment): 4 days.
- Schema deltas + backfill: 1 day.
- PDF board pack: 1 day.
- **Total to launch-ready analytics: ~13 focused eng days.**

## What to cut if squeezed

Ship Tier 1 + Tier 2 #4 (compliance risk score) for the pilot. That's the demo that closes. Everything else is roadmap.
