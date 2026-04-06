import AppShell from "../AppShell";

// ============================================================================
// APP LAYOUT — Wraps all authenticated routes in AppShell
// This provides the sidebar, topbar, RBAC, and app state context.
// Routes in this group require authentication (enforced by proxy.ts).
// ============================================================================

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
