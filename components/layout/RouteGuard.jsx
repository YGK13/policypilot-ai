"use client";

import { usePathname } from "next/navigation";
import { useApp } from "@/app/AppShell";

// ============================================================================
// ROUTE GUARD — Blocks unauthorized page access at the component level.
// Even if a user types a URL directly, they see an "Access Denied" screen
// instead of the page content. This is the LAST line of defense before
// real server-side auth (Clerk) is added.
//
// Usage: wrap page content with <RouteGuard>{children}</RouteGuard>
// Or use the useRouteGuard() hook for custom handling.
// ============================================================================

export function useRouteGuard() {
  const pathname = usePathname();
  const { currentUser, canAccess } = useApp();

  return {
    allowed: currentUser ? canAccess(pathname) : false,
    role: currentUser?.role || null,
    pathname,
  };
}

export default function RouteGuard({ children }) {
  const { allowed, role, pathname } = useRouteGuard();

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-54px)] bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-4">
            Your role ({role || "unknown"}) does not have permission to access <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{pathname}</code>.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Contact your HR administrator if you believe this is an error.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
