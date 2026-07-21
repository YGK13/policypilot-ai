# AI HR Pilot — Payroll Integrations Spec

Written 2026-07-21. Status: pre-code. Read-only, one-way sync only.

## Why payroll (buyer voice, verbatim from the ask)

> "another guy said payroll integrations would be super helpful"

Right. Payroll data is the difference between an HR bot that guesses and an HR bot that cites. When Bob asks "why was my paycheck low," today we say "check your paystub." With Gusto wired in, we say: "Your July 15 paystub shows $412 in additional federal withholding vs June 30 — that lines up with your July 3 W-4 update. Full paystub attached."

That is the demo that closes.

## Scope discipline

**Read-only. No writes. Ever.**
- We pull employee records, paystub summaries, PTO balances, benefits enrollments.
- We do not modify wages, submit runs, change deductions or update banking. Never. Not even behind a flag.
- Writing to payroll is a completely different insurance conversation, a completely different SOC 2 scope, and one wrong entry ends a pilot.

**One-way. Payroll is source of truth.**
- Sync direction is provider → AI HR Pilot only.
- If our data disagrees with the provider's, the provider wins on the next sync.

**Sync per-org, not per-user.**
- Admin connects Gusto once for the org. All employees in that org get context enrichment.

## Data we pull

| Data | Priority | Used by |
| --- | --- | --- |
| Employee roster (id, name, email, dept, title, hire date, manager, work location, employment type) | P0 | Chat context, RBAC bootstrap, per-dept analytics |
| Compensation (current salary/hourly rate, currency, pay frequency) | P0 | Comp-question answers, guardrail before answering |
| Recent paystubs (last 6, summary only — no full detail rows) | P0 | Paycheck-question answers |
| PTO balances (accrued, used, remaining, by policy) | P0 | PTO-question answers, self-service |
| Benefits enrollment (plan names, coverage tier, dependents count) | P1 | Benefits-question answers |
| Deductions summary (pre-tax, post-tax, categories only — no amounts of individual garnishments) | P1 | Paycheck-question answers |
| Time-off requests (pending, approved) | P1 | Self-service PTO flow |
| Employment status changes (hire, promotion, termination) | P2 | Escalation triage |

## Sync model

**Two-track:**

- **Nightly pull.** Cron at 02:00 org-timezone. Full refresh of P0 data. Idempotent upsert into our tables.
- **Webhook (where the provider supports it).** Real-time for events: hire, termination, paystub issued, comp change. Reduces staleness on the events that matter.

**No streaming, no polling faster than nightly.** Providers rate-limit aggressively and pilot orgs do not need sub-hour freshness for the paycheck-explanation use case.

## Provider ranking (ship in this order)

Rank = probability the provider seals a pilot × ease of implementation × sandbox availability.

### 1. Gusto — SHIP FIRST

- **Why:** SMB darling, ~200K customers, exactly Yuri's ICP. Modern OAuth 2.0, well-documented API, first-class sandbox.
- **Auth:** OAuth 2.0, offline scope for refresh tokens.
- **Sandbox:** Free demo company, no card required. Full API parity.
- **Webhooks:** Yes — employee lifecycle, payroll events.
- **Effort:** 3 focused eng days incl. reconciliation + tests.
- **Docs:** `docs.gusto.com/embedded-payroll` — need to build against Gusto Embedded API, not the older Partner API.
- **Rate limit:** 200 req/min per app. Fine for our load.

### 2. Rippling — SHIP SECOND

- **Why:** modern, popular in mid-market tech (100-2,000 heads). PE portcos love Rippling. Fast-growing.
- **Auth:** OAuth 2.0. Requires partner enrollment (2-4 week review). Start the paperwork week 1.
- **Sandbox:** Yes, gated behind partner review.
- **Webhooks:** Yes.
- **Effort:** 4 eng days after partner approval clears. Their schema is broader than Gusto's (they cover HRIS + IT + Finance from one platform).
- **Blocker:** partner review turnaround.

### 3. QuickBooks Payroll (QBO) — SHIP THIRD

- **Why:** massive SMB footprint. Also — Yuri already has an authenticated QBO MCP in this session (`qbo_payroll_*` tools) which means Intuit dev-account exists, OAuth is proven, sandbox is proven.
- **Auth:** Intuit OAuth 2.0.
- **Sandbox:** Intuit Sandbox Company. Free.
- **Webhooks:** Limited (only certain events). Fall back on nightly pull for the rest.
- **Effort:** 3 eng days. Lower because tokens/plumbing are half done.
- **Note:** Intuit differentiates between QBO Payroll (self-serve) and QBO Payroll Full-Service. Same API. No fork needed.

### 4. BambooHR — SHIP FOURTH

- **Not payroll strictly** — BambooHR is HRIS with payroll add-on. Included here because for SMBs it *is* their payroll source of truth.
- **Auth:** API key + subdomain. No OAuth. Enterprise Basic auth over HTTPS. Ugly but simple.
- **Sandbox:** Free trial account.
- **Webhooks:** Yes.
- **Effort:** 2 eng days.
- **Ranking:** high buyer overlap with #1 (a lot of Gusto customers use Bamboo for HRIS + Gusto for payroll). Ship it soon so we cover the stack.

### 5. Finch (unified API shim) — SHIP FIFTH for enterprise coverage

**Pivot from the original ADP-direct plan (2026-07-21):** ADP Marketplace is a 3-9 month program that requires SOC 2 Type II, $2M cyber liability insurance, and a signed ADP data agreement — not viable pre-pilot. Same tier of pain for Paychex and Paylocity direct.

- **What it is:** `tryfinch.com` — one API that fronts ADP Workforce Now, Paychex, Paylocity, UKG Pro, plus ~25 more.
- **Why:** one integration on our side, no per-provider partner reviews, gives us enterprise-provider coverage for the pilot without cutting a single enterprise deal with a payroll vendor.
- **Auth:** OAuth 2.0 to Finch, then Finch handles the underlying provider handshake with the customer.
- **Sandbox:** yes, free tier for testing.
- **Effort:** 3 eng days once we have Finch credentials.
- **Cost:** per-connection pricing; viable at pilot scale, revisit at ~50 customers.
- **What it does NOT replace:** Gusto direct (better UX, cheaper), BambooHR direct, QBO direct — we already have those channels working.

### 6. Rippling — direct is realistic within a quarter

- Rippling has a formal API Partner Program. Approval bar: real product, security posture (SOC 2 in progress or equivalent one-pager, breach response docs), and at least one pilot customer under LOI. Not a longshot.
- Turnaround: 2-6 weeks after we submit.
- Kick off application week 1 in parallel with Gusto build. Do not wait for pilot customer signatures.

### 7. ADP direct + Paychex direct + TriNet — DEFERRED indefinitely

- Covered via Finch (rank 5) for the pilot.
- Only pursue direct if a specific pilot buyer running that provider demands it AND pays for the ~6-month build.

### Effort estimate (revised)

- Shared plumbing (encryption, cron, webhook receiver skeleton, tables): 3 days.
- Gusto: 3 days.
- BambooHR: 2 days.
- QBO: 3 days.
- Finch (covers ADP/Paychex/Paylocity/UKG): 3 days.
- Rippling direct (after partner approval): 4 days.
- **Total to Gusto+BambooHR+QBO+Finch live for pilot: ~14 focused eng days.**

## Auth + secret storage

- Provider credentials stored in `integrations.config` as encrypted JSON (Neon-side pgcrypto).
- Refresh tokens rotated automatically; broken refresh → surface as red-dot in the sidebar footer + email hr_admin.
- API keys (BambooHR-class providers) treated identically.
- No credentials ever logged. Redact at the logger layer.

## Data model deltas

```sql
CREATE TABLE payroll_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,          -- 'gusto' | 'rippling' | 'qbo' | 'bamboohr' | 'adp'
  provider_employee_id TEXT NOT NULL,
  linked_user_id UUID REFERENCES users(id),  -- matched by email; nullable until matched
  full_name TEXT,
  work_email TEXT,
  department TEXT,
  title TEXT,
  manager_provider_id TEXT,
  employment_type TEXT,
  hire_date DATE,
  termination_date DATE,
  work_location TEXT,
  comp_rate NUMERIC(12,2),
  comp_currency TEXT,
  pay_frequency TEXT,
  raw JSONB,                       -- provider response, for debugging + future fields
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, provider, provider_employee_id)
);

CREATE TABLE payroll_paystubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  payroll_employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_paystub_id TEXT NOT NULL,
  pay_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  gross_pay NUMERIC(12,2),
  net_pay NUMERIC(12,2),
  federal_withholding NUMERIC(12,2),
  state_withholding NUMERIC(12,2),
  fica NUMERIC(12,2),
  benefit_deductions NUMERIC(12,2),
  other_deductions NUMERIC(12,2),
  raw JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, provider, provider_paystub_id)
);

CREATE TABLE payroll_pto_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  payroll_employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  accrued_hours NUMERIC(8,2),
  used_hours NUMERIC(8,2),
  balance_hours NUMERIC(8,2),
  as_of DATE NOT NULL,
  raw JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, payroll_employee_id, policy_name)
);
```

## Code layout

```
lib/
  payroll/
    index.js               // shared: normalizer, retry, encryption helpers
    sync.js                // nightly cron entrypoint, dispatches per-provider
    providers/
      gusto.js             // Gusto OAuth + pull + webhook handler
      rippling.js
      qbo.js
      bamboohr.js
      adp.js               // ships last
app/
  api/
    payroll/
      sync/route.js        // POST /api/payroll/sync?provider=gusto — manual trigger
      webhooks/[provider]/route.js  // signed webhook receivers
```

## Testing & hardening (before pilot)

1. **Provider sandbox contract tests.** For each provider, wire a fixture-based integration test against their sandbox. Runs in CI nightly.
2. **Signature verification tests.** Each webhook receiver must reject unsigned/malformed payloads. Explicit test cases for each.
3. **Idempotency tests.** Replay the same webhook 5x, verify no dup rows.
4. **Rate-limit backoff tests.** Simulated 429 → exponential backoff, no data loss.
5. **PII scrub tests.** Confirm no full-SSN, no bank routing, no full paystub line items land in our DB.
6. **Access tests.** Confirm employee A cannot see employee B's paystub via the chat endpoint or any API.
7. **Token rotation tests.** Simulate expired refresh token → confirm auto-rotation or graceful degradation with email alert.
8. **Data-deletion test.** When org disconnects the provider, all payroll_* rows for that org are hard-deleted within 1 minute.

## What we say to pilot users about compliance

- Encryption at rest (Neon) + in transit (TLS 1.3).
- No SSN, no bank routing numbers stored. We ignore those fields at the ingester.
- Per-org isolation enforced at every query.
- Disconnect wipes payroll data within 1 minute.
- No payroll data used to train models.

## Effort estimate

- Shared plumbing (encryption, cron, webhook receiver skeleton, tables): 3 days.
- Gusto: 3 days.
- BambooHR: 2 days.
- QBO: 3 days.
- Rippling: 4 days after partner approval.
- ADP: 6 days after cert exchange.
- **Total to Gusto+BambooHR+QBO live (~pilot-ready): 11 focused eng days.**
- Full slate incl. Rippling + ADP: ~21 days plus external timelines.

## Sequencing recommendation (revised 2026-07-21)

Week 1: shared plumbing + Gusto (in progress).
Week 2: BambooHR + QBO.
Week 3: Finch (unlocks ADP/Paychex/Paylocity/UKG in one build).
Week 4: harden, test suite, launch to pilot orgs.
Parallel week 1: submit Rippling partner application; wire it when approval clears (week 4-6).

**Do NOT** try to ship all providers at once. It is how integrations rot into "cosmetic Connect" flows again.
