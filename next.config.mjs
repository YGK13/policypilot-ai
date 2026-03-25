/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================================
  // SECURITY HEADERS — defense-in-depth for HR data protection
  // These apply to ALL routes served by the application.
  // ============================================================================
  async headers() {
    return [
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
          // -- CSP: restrict script sources to self + inline (needed for React) --
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.anthropic.com https://*.vercel.app",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // -- API routes: additional security --
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
