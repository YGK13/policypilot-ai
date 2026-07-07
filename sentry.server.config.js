// ============================================================================
// SENTRY — server runtime (Node). DSN-gated: with no SENTRY_DSN set, init is
// skipped and Sentry is a complete no-op, so local dev and un-configured
// deploys are unaffected. Set SENTRY_DSN in Vercel to turn on error tracking.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    // -- Low default trace sampling; raise per-need. --
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    // -- Scrub request bodies: HR data must never leave in an error payload. --
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}
