/** @type {import('next').NextConfig} */
const nextConfig = {
  // -- Silence Turbopack root warning caused by multiple lockfiles in parent dirs --
  turbopack: {
    root: process.cwd(),
  },
};

// ============================================================================
// SECURITY HEADERS — defense-in-depth for HR data protection
// Assigned separately to avoid ESM/method-shorthand parser confusion.
// These apply to ALL routes served by the application.
// ============================================================================
nextConfig.headers = () => [
  {
    source: "/(.*)",
    headers: [
      // -- Prevent clickjacking: app cannot be embedded in iframes --
      { key: "X-Frame-Options", value: "DENY" },
      // -- Prevent MIME type sniffing --
      { key: "X-Content-Type-Options", value: "nosniff" },
      // -- Enable browser XSS protection --
      { key: "X-XSS-Protection", value: "1; mode=block" },
      // -- Referrer: only send origin, not full URL (protects employee data in URLs) --
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // -- Permissions: disable camera, mic, geolocation (not needed for HR app) --
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      // -- HSTS: force HTTPS for 1 year --
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      // -- CSP: restrict sources to self + inline + auth/captcha providers --
      // Clerk production satellite:  clerk.aihrpilot.com (FAPI + clerk.js).
      // Clerk Account Portal:        accounts.aihrpilot.com (hosted sign-in/OAuth redirects).
      // Cloudflare Turnstile:        challenges.cloudflare.com (bot-protection widget
      //                              that Clerk renders inside the <SignUp /> form — without
      //                              this the sign-up CAPTCHA fails to load and the form hangs).
      // Clerk services DNS:          *.clerk.services (internal Clerk worker aliases).
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://*.clerk.services https://clerk.aihrpilot.com https://accounts.aihrpilot.com https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.aihrpilot.com https://accounts.aihrpilot.com",
          "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.clerk.com https://img.clerk.com https://clerk.aihrpilot.com https://accounts.aihrpilot.com",
          "font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com https://clerk.aihrpilot.com https://accounts.aihrpilot.com",
          "connect-src 'self' https://api.anthropic.com https://*.vercel.app https://*.clerk.accounts.dev https://*.clerk.com https://*.clerk.services https://clerk.aihrpilot.com https://accounts.aihrpilot.com https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
          "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.aihrpilot.com https://accounts.aihrpilot.com https://challenges.cloudflare.com",
          "frame-ancestors 'none'",
          "worker-src 'self' blob:",
        ].join("; "),
      },
    ],
  },
  // -- API routes: no caching --
  {
    source: "/api/(.*)",
    headers: [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
    ],
  },
];

// ============================================================================
// SENTRY — wrap the config so server/edge/client errors are captured.
// The wrapper is inert at runtime unless a DSN is set in the Sentry configs.
// Source-map upload only runs during `next build` when SENTRY_AUTH_TOKEN +
// org/project are present; otherwise it silently skips (no build break).
// ============================================================================
import { withSentryConfig } from "@sentry/nextjs";

const sentryBuildOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // -- Quiet build logs; skip source-map upload entirely without a token. --
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // -- Don't fail the build if Sentry's plugin hits an error. --
  errorHandler: () => {},
  telemetry: false,
};

export default withSentryConfig(nextConfig, sentryBuildOptions);
