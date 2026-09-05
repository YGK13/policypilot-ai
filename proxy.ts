// ============================================================================
// PROXY — Next.js 16 request interceptor (replaces middleware.ts)
// Uses Clerk's clerkMiddleware to protect routes and provide auth context.
// Public routes: sign-in, sign-up, API routes
// Everything else requires authentication.
// ============================================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// -- Routes that don't require authentication --
// SEO/AEO/GEO critical: robots.txt, sitemap.xml, and llms.txt MUST be public
// or Google/AI crawlers can't index the site at all.
const isPublicRoute = createRouteMatcher([
  "/",                  // Public landing page (marketing/SEO)
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",        // Uptime monitors + admin dashboards need unauth access
  "/api/webhooks(.*)",  // Webhook endpoints (use their own signature verification)
  "/api/drip(.*)",      // Drip engine forwarder routes (server-to-server, no Clerk session)
  "/api/setup(.*)",     // Schema init endpoint (gated internally by SETUP_SECRET bearer token)
  "/api/payroll/webhooks(.*)",  // Signed provider webhooks (Gusto, Rippling, etc.)
  "/api/payroll/oauth(.*)",     // OAuth callback: provider redirects the user here after consent
  "/robots.txt",        // Search engine crawlers need this
  "/sitemap.xml",       // Search engine crawlers need this
  "/llms.txt",          // AI answer engine crawlers (ChatGPT, Perplexity, Claude)
  "/faq",               // Public FAQ page for AEO
  "/pricing",           // Public marketing pages (rebuilt 2026-09)
  "/features",
  "/about",
  "/compare(.*)",
  "/llms-full.txt",     // Deep reference for AI answer engines
  "/opengraph-image(.*)", // Generated OG image (metadata route, no extension)
  "/twitter-image(.*)",
  "/blog(.*)",          // Public blog/article pages for SEO
  "/terms",             // Legal pages MUST be public (Stripe + procurement requirement)
  "/privacy",
  "/security",
]);

// -- Every authenticated surface: the app/(app) route group plus the API --
// Anything that is neither public nor listed here does not exist, so it must
// fall through to Next's 404 page instead of being redirected to sign-in:
// a crawler or a mistyped link should get a 404, not a login bounce.
// tests/marketing-site.test.js asserts this list covers every app/(app) route.
const isAppRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/chat(.*)",
  "/tickets(.*)",
  "/cases(.*)",
  "/documents(.*)",
  "/policies(.*)",
  "/analytics(.*)",
  "/audit(.*)",
  "/team(.*)",
  "/settings(.*)",
  "/billing(.*)",
  "/integrations(.*)",
  "/api-keys(.*)",
  "/self-service(.*)",
  "/onboarding(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // -- Allow public routes through without auth --
  if (isPublicRoute(request)) {
    return;
  }
  // -- Protect every authenticated route: redirects to sign-in when signed out --
  if (isAppRoute(request)) {
    await auth.protect();
    return;
  }
  // -- Unknown path: let Next render the 404 page --
  return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
