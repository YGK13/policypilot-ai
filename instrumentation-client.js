// ============================================================================
// SENTRY — browser runtime. Next.js loads instrumentation-client automatically.
// DSN-gated: only the PUBLIC DSN is used client-side, and only if present.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    // -- Session replay off by default: HR screens may show sensitive data. --
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}

// -- Required by Sentry for navigation instrumentation in the App Router. --
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
