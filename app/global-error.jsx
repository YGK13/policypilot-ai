"use client";

// ============================================================================
// GLOBAL ERROR BOUNDARY — App Router. Reports uncaught render errors to Sentry
// (no-op when Sentry is not configured) and shows a minimal recovery screen.
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{
        background: "#09090b", color: "#e4e4e7", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 24,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#8b8fa3", marginBottom: 24, maxWidth: 420 }}>
            An unexpected error occurred. Our team has been notified. You can try again,
            or contact <a href="mailto:support@aihrpilot.com" style={{ color: "#3b82f6" }}>support@aihrpilot.com</a>.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#3b82f6", color: "#fff", border: "none",
              padding: "12px 28px", borderRadius: 8, fontWeight: 600, cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
