# AI HR Pilot — Commercial Readiness Punch List
_Authored 2026-06-01 after root-causing the login outage. Prioritized, with effort estimates and the evidence behind each item._

## Context: what was actually wrong (and is now fixed)
The "login doesn't work" outage was **not** fragile app code. It was production configuration:
1. **Invalid production `CLERK_SECRET_KEY`** (a dev `sk_test` key was used in prod). The server could not verify valid sessions, so every authenticated user was bounced to `/sign-in` forever. Confirmed via Clerk response header `x-clerk-auth-reason: secret-key-invalid`. **FIXED** (correct `sk_live` set in Vercel).
2. **Post-auth redirect** used legacy env var names Clerk v7 ignores, dumping users on the marketing homepage. **FIXED** (pinned on `<ClerkProvider>` in code).
3. **`@clerk/nextjs` 7.0.8** had Next 16 proxy issues. **UPGRADED** to 7.4.2.
4. **Bot sign-up protection** friction. **DISABLED** to test (must be re-enabled — see P0-3).

The deeper lesson: there was **no observability**, so an invalid key silently broke 100% of logins with no alert. That is the #1 commercial gap.

---

## P0 — Blockers (do this week; app is not sellable without these)

### P0-1. Configure the Clerk webhook in Production  ·  ~20 min
**Evidence:** `SELECT COUNT(*) FROM users` returned **0**. No signup has ever persisted to Neon. The role model and all server-side user/org/ticket ownership depend on this webhook.
**Do:** Clerk Dashboard → **Production** → **Webhooks** → add endpoint `https://aihrpilot.com/api/webhooks/clerk`, subscribe to `user.created`, `user.updated`, `user.deleted` → copy the **Signing Secret** → set `CLERK_WEBHOOK_SECRET` in Vercel (Production) → redeploy. Verify a test signup appears in the `users` table and in the webhook delivery log.
**Unblocks:** user persistence + the just-shipped auto-`hr_admin` role assignment.

### P0-2. Move Clerk keys to the Vercel↔Clerk Marketplace integration  ·  ~15 min
**Evidence:** the outage was a manually-set key drifting to the wrong instance.
**Do:** install Clerk via Vercel Marketplace so `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are auto-provisioned and kept in sync per environment. Eliminates the entire class of "dev key in prod" failures.

### P0-3. Re-enable Bot sign-up protection (Production)  ·  ~2 min
**Evidence:** I had you disable it to test; it is currently OFF, inviting spam/fake signups (which now auto-become admins — see P0-1).
**Do:** Clerk → Production → Attack protection → Bot sign-up protection → ON. Then run one real signup to confirm Turnstile passes invisibly for humans.

### P0-4. Verify server-side RBAC on every sensitive API route  ·  ~half day
**Evidence:** `RouteGuard` is **client-side only** ("the LAST line of defense before real server-side auth is added"). Client guards are not security — anyone can call the API directly.
**Do:** ensure `requireRole(...)` (already in `lib/auth/rbac.js`) is called at the top of every `/api/*` handler that reads or mutates data (tickets, cases, documents, team, settings, billing, api-keys, analytics, audit). Add `requireOrgMatch` so no cross-org reads.

### P0-5. Confirm org data tenancy  ·  ~half day
**Evidence:** B2B HR data — a cross-org leak is a breach. `org_id` columns and `requireOrgMatch` exist; need to confirm **every** query filters by the session's org.
**Do:** audit `lib/db` query helpers; add an automated test that a user in org A cannot read org B's rows.

---

## P1 — Commercial essentials (next 1–2 weeks)

### P1-1. Team invite flow with roles  ·  ~1–2 days
No path exists to add teammates with `hr_staff` / `legal` / `employee` roles. Build invitations that set `publicMetadata.role` on the invite (so the webhook respects it and never auto-promotes invited users to admin).

### P1-2. Role-aware post-login routing  ·  ~2 hrs
Today sign-in falls back to `/dashboard` (admin-only). Once invited employees exist, route employees → `/chat`, admins → `/dashboard`. A small server redirect keyed on role.

### P1-3. Onboarding "provisioning" state (zero-reload UX)  ·  ~3 hrs
A brand-new admin may briefly see "Access Denied" on `/onboarding` until `publicMetadata.role` propagates to the client. Add a short "Setting up your workspace…" state that polls `user.reload()` until the role appears, then renders onboarding.

### P1-4. Replace demo-data leakage with real user data  ·  ~half day
**Evidence:** signed in as a brand-new user, `/chat` greeted "Hi Jane!" (a hardcoded `DEMO_EMPLOYEES[0]` profile). Real users must see their own profile/org, not demo seed data. Audit `lib/data/demo-data.js` usage behind a real-vs-demo flag.

### P1-5. Observability + alerting  ·  ~half day
**Evidence:** the secret-key outage was invisible. Add Sentry (or equivalent) for client+server errors, Vercel Analytics, and an alert on auth-failure spikes and 5xx. This would have caught the outage in minutes instead of relying on a user report.

---

## P2 — Hardening & polish (before scaled launch)

- **P2-1. Error / empty / loading states** across all 18 app pages (no blank screens, no silent failures). ~1–2 days.
- **P2-2. Billing end-to-end** (Stripe live keys + webhook + plan gating tied to `organizations.plan`). Verify the billing page is wired to real prices. ~half day.
- **P2-3. Public health/status check.** `/api/health` checks DB/LLM/Clerk/Blob/Stripe/Resend but is auth-gated; expose a safe status signal for monitoring. ~1 hr.
- **P2-4. Secrets hygiene.** Confirm `.env.local` stays gitignored (it is); rotate the dev `sk_test` if it ever touched prod; verify no secret is shipped in the client bundle. ~1 hr.
- **P2-5. Rate limiting** on auth + chat APIs (abuse + LLM cost control). ~half day.
- **P2-6. Full E2E QA pass:** signup → onboarding → invite teammate → employee chat → ticket → case → billing. Gate launch on green. ~1 day.

## P3 — Performance / SEO (lower urgency; partly done)
- Bundle size + image optimization review. SEO/AEO (blog, `llms.txt`, sitemap) already shipped in prior work.

---

## Suggested sequence
1. **Today:** P0-1, P0-2, P0-3 (config, ~40 min total) + set your own Clerk user to `hr_admin` so you can use the app.
2. **This week:** P0-4, P0-5 (security/tenancy), P1-3 (onboarding UX), P1-4 (demo-data).
3. **Next week:** P1-1 invites, P1-2 routing, P1-5 observability, then P2 hardening.
4. **Gate launch on:** P0 complete + P0-5 tenancy test green + P2-6 QA pass.
