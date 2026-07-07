// ============================================================================
// INSTRUMENTATION — Next.js server bootstrap hook.
// Loads the right Sentry config per runtime and wires request-error capture.
// All of this is a no-op unless a Sentry DSN is configured.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// -- Captures uncaught errors in App Router server components / route handlers.
//    Safe no-op when Sentry is not initialized. --
export const onRequestError = Sentry.captureRequestError;
