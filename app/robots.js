import { SITE_URL } from "@/lib/marketing/site";

// ============================================================================
// ROBOTS — metadata route (/robots.txt). Search + AI answer-engine crawlers
// are welcome on the public surface; app and auth routes are excluded.
// ============================================================================

const APP_PATHS = [
  "/api/", "/dashboard", "/chat", "/tickets", "/cases", "/documents", "/policies",
  "/analytics", "/audit", "/team", "/settings", "/billing", "/integrations",
  "/api-keys", "/self-service", "/onboarding", "/sign-in", "/sign-up",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: APP_PATHS },
      { userAgent: ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "Claude-Web", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"], allow: "/", disallow: APP_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
