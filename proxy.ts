// ============================================================================
// PROXY — Next.js 16 request interceptor (replaces middleware.ts)
// Uses Clerk's clerkMiddleware to protect routes and provide auth context.
// Public routes: sign-in, sign-up, API routes
// Everything else requires authentication.
// ============================================================================

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// -- Routes that don't require authentication --
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",  // Webhook endpoints (use their own signature verification)
]);

export default clerkMiddleware(async (auth, request) => {
  // -- Allow public routes through without auth --
  if (isPublicRoute(request)) {
    return;
  }
  // -- Protect all other routes — redirects to sign-in if not authenticated --
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
