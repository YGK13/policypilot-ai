"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { useUser, useClerk, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ToastProvider from "@/components/layout/ToastProvider";
import RouteGuard from "@/components/layout/RouteGuard";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";

// -- Check if Clerk is configured (publishable key in env) --
const CLERK_ENABLED = typeof window !== "undefined" &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ============================================================================
// APP CONTEXT — shared state across all views
// Includes RBAC: currentUser has a role that gates page access.
// No toggle — users log in as a specific role and stay there.
// ============================================================================
const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// -- localStorage helpers --
const STORAGE_KEY = "aihrpilot_state";
const SESSION_KEY = "aihrpilot_session";

function loadState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

// ============================================================================
// ROLE DEFINITIONS — determines what each role can access
// ============================================================================
export const ROLES = {
  employee: {
    label: "Employee",
    description: "View policies, submit requests, chat with AI",
    pages: ["/", "/chat", "/self-service", "/tickets", "/documents", "/policies"],
    color: "bg-blue-600",
  },
  hr_staff: {
    label: "HR Staff",
    description: "Handle tickets, manage documents, view analytics",
    pages: ["/", "/chat", "/self-service", "/tickets", "/documents", "/policies", "/analytics", "/integrations"],
    color: "bg-green-600",
  },
  hr_admin: {
    label: "HR Administrator",
    description: "Full access: cases, team, settings, billing, audit, API keys",
    pages: ["/", "/chat", "/self-service", "/tickets", "/documents", "/cases", "/integrations", "/policies", "/analytics", "/audit", "/team", "/settings", "/billing", "/api-keys", "/onboarding"],
    color: "bg-brand-600",
  },
  legal: {
    label: "Legal Counsel",
    description: "Cases, audit log, policies — read-only on most other pages",
    pages: ["/", "/cases", "/tickets", "/policies", "/audit", "/documents"],
    color: "bg-red-600",
  },
};

// -- Demo users: each has a role + linked employee profile --
export const DEMO_USERS = [
  { id: "user-admin", name: "Yuri Kruman", email: "yuri@aihrpilot.com", role: "hr_admin", employeeId: null, initials: "YK" },
  { id: "user-hrstaff", name: "Sarah Chen", email: "sarah.chen@company.com", role: "hr_staff", employeeId: null, initials: "SC" },
  { id: "user-legal", name: "David Marcus", email: "david.marcus@company.com", role: "legal", employeeId: null, initials: "DM" },
  { id: "user-emp-jane", name: "Jane Doe", email: "jane.doe@company.com", role: "employee", employeeId: "EMP001", initials: "JD" },
  { id: "user-emp-michael", name: "Michael Chen", email: "michael.chen@company.com", role: "employee", employeeId: "EMP002", initials: "MC" },
  { id: "user-emp-priya", name: "Priya Sharma", email: "priya.sharma@company.com", role: "employee", employeeId: "EMP003", initials: "PS" },
];

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================
const DEFAULT_SETTINGS = {
  autoRespond: true,
  auditLogging: true,
  disclaimers: true,
  jurisdictionAware: true,
  slackEnabled: false,
  emailEnabled: false,
  confidenceThreshold: 70,
  autoEscalateAbove: 75,
  companyName: "Acme Corp",
  primaryColor: "#6366f1",
  supportEmail: "hr@company.com",
};

// ============================================================================
// LOGIN SCREEN — Professional login with email/password + SSO + demo accounts
// In production, this would be replaced by Clerk's hosted sign-in page.
// For now, the email/password and SSO buttons show a message that they'll be
// available in production, and the demo accounts section lets reviewers
// test different roles immediately.
// ============================================================================
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [loginError, setLoginError] = useState("");

  // -- Handle email/password submit (demo: matches against DEMO_USERS by email) --
  const handleEmailLogin = useCallback((e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const matched = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      onLogin(matched);
    } else {
      setLoginError("No account found with that email. Try a demo account below.");
      setShowDemo(true);
    }
  }, [email, onLogin]);

  // -- OAuth button style --
  const oauthBtnCls = "w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl shadow-lg shadow-brand-500/30 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI HR Pilot</h1>
          <p className="text-sm text-gray-400 mt-1">Enterprise HR Intelligence Platform</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue.</p>

          {/* SSO buttons */}
          <div className="space-y-3 mb-6">
            <button onClick={() => { setLoginError("Google SSO will be available in production. Use a demo account below."); setShowDemo(true); }} className={oauthBtnCls}>
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
            <button onClick={() => { setLoginError("Microsoft SSO will be available in production. Use a demo account below."); setShowDemo(true); }} className={oauthBtnCls}>
              <svg className="w-5 h-5" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">Password</label>
                <button type="button" className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer">Forgot password?</button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors cursor-pointer"
            >
              Sign in
            </button>
          </form>

          {/* Demo accounts (collapsible) */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <span>Demo Accounts</span>
              <span className="text-gray-400">{showDemo ? "▲" : "▼"}</span>
            </button>
            {showDemo && (
              <div className="mt-3 space-y-1.5">
                {DEMO_USERS.map((user) => {
                  const role = ROLES[user.role];
                  return (
                    <button
                      key={user.id}
                      onClick={() => onLogin(user)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 text-left hover:border-brand-300 hover:bg-brand-50/50 transition-all cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full ${role.color} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                        {user.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-900">{user.name}</div>
                        <div className="text-[10px] text-gray-400">{user.email}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded text-white ${role.color}`}>
                        {role.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <button className="text-brand-400 hover:text-brand-300 font-semibold cursor-pointer">Request access</button>
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
            <span>SOC 2 Type II</span>
            <span>·</span>
            <span>256-bit AES Encryption</span>
            <span>·</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP SHELL — wraps the entire app with auth + shared state
// When Clerk is configured: uses Clerk for auth, maps user metadata to roles.
// When Clerk is NOT configured: falls back to demo LoginScreen.
// ============================================================================
export default function AppShell({ children }) {
  const saved = useRef(loadState());
  const savedSession = useRef(loadSession());

  // -- Clerk auth (only active when CLERK_PUBLISHABLE_KEY is set) --
  const clerkUser = CLERK_ENABLED ? useUser() : { isLoaded: true, isSignedIn: false, user: null };
  const clerk = CLERK_ENABLED ? useClerk() : null;

  // -- Demo auth state (fallback when Clerk not configured) --
  const [demoUser, setDemoUser] = useState(() => savedSession.current || null);
  const [isHydrated, setIsHydrated] = useState(false);

  // -- Resolve the current user from either Clerk or demo auth --
  const currentUser = (() => {
    if (CLERK_ENABLED && clerkUser.isSignedIn && clerkUser.user) {
      const u = clerkUser.user;
      const role = u.publicMetadata?.role || "employee";
      return {
        id: u.id,
        name: u.fullName || u.firstName || "User",
        email: u.primaryEmailAddress?.emailAddress || "",
        role,
        initials: `${(u.firstName || "?")[0]}${(u.lastName || "?")[0]}`,
        avatarUrl: u.imageUrl,
        clerkUser: true,
      };
    }
    return demoUser;
  })();

  // -- Derive mode and employee from currentUser --
  const mode = currentUser?.role === "employee" ? "employee" : "admin";
  const isAdmin = mode === "admin";

  // -- Employee profile (linked for employee role, first employee for admins) --
  const [employee, setEmployee] = useState(
    () => {
      if (savedSession.current?.employeeId) {
        return DEMO_EMPLOYEES.find(e => e.id === savedSession.current.employeeId) || DEMO_EMPLOYEES[0];
      }
      if (saved.current?.employeeId) {
        return DEMO_EMPLOYEES.find(e => e.id === saved.current.employeeId) || DEMO_EMPLOYEES[0];
      }
      return DEMO_EMPLOYEES[0];
    }
  );

  // -- Shared state with localStorage hydration --
  const [tickets, setTickets] = useState(() => saved.current?.tickets || []);
  const [auditLog, setAuditLog] = useState(() => saved.current?.auditLog || []);
  const [integrations, setIntegrations] = useState(() => saved.current?.integrations || {});
  const [settings, setSettings] = useState(
    () => ({ ...DEFAULT_SETTINGS, ...(saved.current?.settings || {}) })
  );
  const [notifications, setNotifications] = useState(
    () => saved.current?.notifications || []
  );

  // -- orgId from Neon (populated after Clerk webhook fires on first sign-in) --
  const [orgId, setOrgId] = useState(() => saved.current?.orgId || "default");

  // -- Hydration flag (prevents flash of login screen on refresh) --
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // -- Load orgId from Neon API (only when Clerk is active + user is signed in) --
  useEffect(() => {
    if (!CLERK_ENABLED || !clerkUser.isSignedIn) return;
    const loadOrg = async () => {
      try {
        const res = await fetch("/api/user/me");
        const data = await res.json();
        if (data.orgId && data.orgId !== "default") {
          setOrgId(data.orgId);
        }
        // If the Neon user has a role different from the Clerk publicMetadata role,
        // that's fine — we trust publicMetadata set via Clerk dashboard.
      } catch {
        // Non-fatal: fall back to "default"
      }
    };
    loadOrg();
  }, [clerkUser.isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Persist state --
  useEffect(() => {
    saveState({
      tickets, auditLog, integrations, settings, notifications,
      employeeId: employee.id,
      orgId,
    });
  }, [tickets, auditLog, integrations, settings, notifications, employee, orgId]);

  // -- Session timeout: auto-logout after 30 min (demo mode only) --
  // Clerk handles its own session management, so we skip this for Clerk.
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const timeoutRef = useRef(null);

  const resetSessionTimer = useCallback(() => {
    if (CLERK_ENABLED) return; // Clerk manages sessions
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!currentUser) return;
    timeoutRef.current = setTimeout(() => {
      setDemoUser(null);
      localStorage.removeItem(SESSION_KEY);
    }, SESSION_TIMEOUT_MS);
  }, [currentUser]);

  useEffect(() => {
    if (CLERK_ENABLED || !currentUser) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetSessionTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetSessionTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentUser, resetSessionTimer]);

  // -- Login handler (demo mode only) --
  const handleLogin = useCallback((user) => {
    setDemoUser(user);
    saveSession(user);
    if (user.employeeId) {
      const emp = DEMO_EMPLOYEES.find(e => e.id === user.employeeId);
      if (emp) setEmployee(emp);
    }
  }, []);

  // -- Logout handler --
  const handleLogout = useCallback(() => {
    if (CLERK_ENABLED && clerk) {
      clerk.signOut();
    } else {
      setDemoUser(null);
      localStorage.removeItem(SESSION_KEY);
    }
  }, [clerk]);

  // -- Add audit entry helper --
  const addAudit = useCallback(
    (action, detail, level = "info", metadata = {}) => {
      const userName = currentUser?.name || `${employee.firstName} ${employee.lastName}`;
      const entry = {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        displayTime: new Date().toLocaleString([], {
          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        }),
        action, detail, level,
        employee: userName,
        role: currentUser?.role || "unknown",
      };
      setAuditLog((prev) => [entry, ...prev]);

      // -- Persist to Neon (fire-and-forget) so entries survive page refresh --
      const oid = orgId || "default";
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: oid,
          entry: { action, detail, level, userName, userRole: currentUser?.role || "unknown", metadata },
        }),
      }).catch((err) => console.warn("[Audit] Neon persist failed:", err.message));
    },
    [employee, currentUser, orgId]
  );

  const addNotification = useCallback((title, detail, type = "info") => {
    setNotifications((prev) => [
      { id: `NOTIF-${Date.now()}`, title, detail, type, timestamp: new Date().toISOString(), read: false },
      ...prev,
    ]);
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // -- Check if current user can access a page --
  const canAccess = useCallback((path) => {
    if (!currentUser) return false;
    const role = ROLES[currentUser.role];
    if (!role) return false;
    return role.pages.some(p => {
      if (p === "/") return path === "/";
      return path.startsWith(p);
    });
  }, [currentUser]);

  // -- Enrich currentUser with orgId so pages can pass it to API calls --
  const enrichedUser = currentUser
    ? { ...currentUser, orgId }
    : null;

  const contextValue = {
    // -- Auth --
    currentUser: enrichedUser,
    mode,
    isAdmin,
    canAccess,
    handleLogout,
    // -- Org --
    orgId,
    // -- Employee context --
    employee,
    setEmployee,
    // -- Data --
    tickets, setTickets,
    auditLog, setAuditLog,
    integrations, setIntegrations,
    settings, setSettings,
    addAudit,
    // -- Notifications --
    notifications, addNotification, markNotificationRead, clearNotifications,
    // -- Constants --
    allEmployees: DEMO_EMPLOYEES,
  };

  // -- Don't render anything until hydrated (prevents flash) --
  if (!isHydrated) {
    return null;
  }

  // -- If Clerk is enabled but user not loaded yet, show nothing --
  if (CLERK_ENABLED && !clerkUser.isLoaded) {
    return null;
  }

  // -- If Clerk is enabled but user not signed in, redirect to sign-in --
  if (CLERK_ENABLED && !clerkUser.isSignedIn) {
    return <RedirectToSignIn />;
  }

  // -- Demo mode: show login screen if no session --
  if (!CLERK_ENABLED && !currentUser) {
    return (
      <ToastProvider>
        <LoginScreen onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <AppContext.Provider value={contextValue}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Topbar
              currentUser={currentUser}
              employee={employee}
              employees={isAdmin ? DEMO_EMPLOYEES : []}
              onEmployeeChange={(id) =>
                setEmployee(DEMO_EMPLOYEES.find((e) => e.id === id))
              }
              onLogout={handleLogout}
              notifications={notifications}
              onMarkRead={markNotificationRead}
              onClearAll={clearNotifications}
            />
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <ErrorBoundary>
                <RouteGuard>{children}</RouteGuard>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </AppContext.Provider>
    </ToastProvider>
  );
}
