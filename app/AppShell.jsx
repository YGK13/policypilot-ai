"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ToastProvider from "@/components/layout/ToastProvider";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";

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
    description: "Full access: cases, settings, billing, audit, API keys",
    pages: ["/", "/chat", "/self-service", "/tickets", "/documents", "/cases", "/integrations", "/policies", "/analytics", "/audit", "/settings", "/billing", "/api-keys"],
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
  { id: "user-emp-jane", name: "Jane Doe", email: "jane.doe@company.com", role: "employee", employeeId: "emp-001", initials: "JD" },
  { id: "user-emp-michael", name: "Michael Chen", email: "michael.chen@company.com", role: "employee", employeeId: "emp-002", initials: "MC" },
  { id: "user-emp-priya", name: "Priya Sharma", email: "priya.sharma@company.com", role: "employee", employeeId: "emp-003", initials: "PS" },
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
// LOGIN SCREEN — shown when no session exists
// ============================================================================
function LoginScreen({ onLogin }) {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-gray-900">AI HR Pilot</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise HR Intelligence Platform</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Sign In</h2>
          <p className="text-xs text-gray-500 mb-6">
            Select your account to continue. In production, this uses SSO / Clerk authentication.
          </p>

          <div className="space-y-2">
            {DEMO_USERS.map((user) => {
              const role = ROLES[user.role];
              const isSelected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${role.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white ${role.color}`}>
                      {role.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sign in button */}
          <button
            onClick={() => selectedUser && onLogin(selectedUser)}
            disabled={!selectedUser}
            className={`w-full mt-6 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
              selectedUser
                ? "bg-brand-600 text-white hover:bg-brand-700 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {selectedUser ? `Sign in as ${selectedUser.name}` : "Select an account"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-400 mt-6">
          Demo mode — no real credentials required. Production uses Clerk SSO.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// APP SHELL — wraps the entire app with auth + shared state
// ============================================================================
export default function AppShell({ children }) {
  const saved = useRef(loadState());
  const savedSession = useRef(loadSession());

  // -- Auth state --
  const [currentUser, setCurrentUser] = useState(() => savedSession.current || null);
  const [isHydrated, setIsHydrated] = useState(false);

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

  // -- Hydration flag (prevents flash of login screen on refresh) --
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // -- Persist state --
  useEffect(() => {
    saveState({
      tickets, auditLog, integrations, settings, notifications,
      employeeId: employee.id,
    });
  }, [tickets, auditLog, integrations, settings, notifications, employee]);

  // -- Login handler --
  const handleLogin = useCallback((user) => {
    setCurrentUser(user);
    saveSession(user);
    // Set employee based on role
    if (user.employeeId) {
      const emp = DEMO_EMPLOYEES.find(e => e.id === user.employeeId);
      if (emp) setEmployee(emp);
    }
  }, []);

  // -- Logout handler --
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  // -- Add audit entry helper --
  const addAudit = useCallback(
    (action, detail, level = "info") => {
      const userName = currentUser?.name || `${employee.firstName} ${employee.lastName}`;
      setAuditLog((prev) => [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          displayTime: new Date().toLocaleString([], {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          }),
          action, detail, level,
          employee: userName,
          role: currentUser?.role || "unknown",
        },
        ...prev,
      ]);
    },
    [employee, currentUser]
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

  const contextValue = {
    // -- Auth --
    currentUser,
    mode,
    isAdmin,
    canAccess,
    handleLogout,
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

  // -- Show login screen if no session --
  if (!currentUser) {
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
              {children}
            </main>
          </div>
        </div>
      </AppContext.Provider>
    </ToastProvider>
  );
}
