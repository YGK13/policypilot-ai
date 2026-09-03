# AI HR Pilot

AI HR policy and compliance copilot for HR teams of 50 to 2,000. Answers employee questions from the company's own handbook with a citation, scores each question for legal risk, routes sensitive topics (ADA, FMLA, harassment, wage) to a human, and keeps an audit log. Federal plus 11-state employment-law context. Read-only payroll/HRIS sync (Gusto, BambooHR, QuickBooks Payroll, Finch).

Live: https://aihrpilot.com · Built by Yuri Kruman (3x CHRO, JD) · Published by Portfolio Leverage Company.

## Stack
Next.js 16 (App Router), React 19, Tailwind 4 (app), Clerk auth via `proxy.ts`, Neon Postgres, Vercel Blob, Vercel AI Gateway, Stripe, Resend, Sentry, Vitest.

## Layout
- `app/(marketing)/` — public surface: home, `/features`, `/pricing`, `/compare`, `/faq`, `/about`, `/blog`, legal. Styled by `marketing.css` ("Signal" concept, see `HOMEPAGE_REDESIGN_2026_CONCEPTS.md`). Data and JSON-LD builders in `lib/marketing/site.js`.
- `app/(app)/` — authenticated product (dashboard, chat, tickets, cases, documents, analytics, integrations, billing).
- `app/api/` — API routes; every data route derives `orgId` from the session.
- `app/sitemap.js`, `app/robots.js`, `app/opengraph-image.jsx`, `app/icon.svg` — metadata routes. `public/llms.txt` and `public/llms-full.txt` for answer engines.
- `lib/data/` — plans (source of truth for pricing), jurisdictions, policies, regulatory updates, connectors. `lib/payroll/` — provider adapters. `lib/engine/` — search, risk scoring, response generation.
- `tests/` — Vitest; `tests/marketing-site.test.js` guards pricing/coverage/route/claims drift on the public surface.

## Run
```
npm install
cp .env.example .env.local   # fill in Clerk, DB, etc.
npm run dev
npm test
npm run build
```
Public routes must be listed in `proxy.ts` (`isPublicRoute`); anything else is rewritten to 404 for signed-out visitors.

## Docs
`docs/AUDIT-2026-09.md`, `docs/GTM-2026-09.md`, `COMMERCIAL_READINESS.md`, `TECH_DEBT_AUDIT_2026_07.md`, `ANALYTICS_SPEC_2026_07.md`, `PAYROLL_INTEGRATIONS_SPEC_2026_07.md`, `AUTH_FIX_2026-04-21.md`.
