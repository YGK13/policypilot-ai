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
      // -- CSP: restrict script sources to self + inline (needed for React + Clerk) --
      // Clerk requires: *.clerk.accounts.dev (dev FAPI), *.clerk.com (prod),
      // clerk.aihrpilot.com (satellite domain), and img-src for user avatars.
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
          "style-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com",
          "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.clerk.com https://img.clerk.com",
          "font-src 'self' data: https://*.clerk.accounts.dev https://*.clerk.com",
          "connect-src 'self' https://api.anthropic.com https://*.vercel.app https://*.clerk.accounts.dev https://*.clerk.com https://clerk.aihrpilot.com",
          "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
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

export default nextConfig;
