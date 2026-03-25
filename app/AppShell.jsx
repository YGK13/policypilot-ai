"use client";

import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ToastProvider from "@/components/layout/ToastProvider";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";

// ============================================================================
// APP CONTEXT — shared state across all views
// Persists across navigations (AppShell in root layout) AND page reloads
// (localStorage sync via useEffect).
// ============================================================================
const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// -- localStorage helpers --
const STORAGE_KEY = "hrpilot_state";

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
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

// ============================================================================
// DEFAULT SETTINGS — single source of truth
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
// APP SHELL — Client wrapper with sidebar + topbar + persistent shared state
// Placed in RootLayout so all page navigations preserve tickets, audit, etc.
// ============================================================================
export default function AppShell({ children }) {
  // -- Load persisted state on mount --
  const saved = useRef(loadState());

  const [mode, setMode] = useState("employee");
  const [employee, setEmployee] = useState(
    () => {
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
  // -- Notification queue: escalated tickets admin hasn't seen --
  const [notifications, setNotifications] = useState(
    () => saved.current?.notifications || []
  );

  // -- Persist state to localStorage on every change --
  useEffect(() => {
    saveState({
      tickets,
      auditLog,
      integrations,
      settings,
      notifications,
      employeeId: employee.id,
    });
  }, [tickets, auditLog, integrations, settings, notifications, employee]);

  // -- Add audit entry helper --
  const addAudit = useCallback(
    (action, detail, level = "info") => {
      setAuditLog((prev) => [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          displayTime: new Date().toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          action,
          detail,
          level,
          employee: `${employee.firstName} ${employee.lastName}`,
        },
        ...prev,
      ]);
    },
    [employee]
  );

  // -- Add notification helper (for escalated tickets, etc.) --
  const addNotification = useCallback((title, detail, type = "info") => {
    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        title,
        detail,
        type,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  // -- Mark notification as read --
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // -- Clear all notifications --
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = {
    mode,
    setMode,
    employee,
    setEmployee,
    tickets,
    setTickets,
    auditLog,
    setAuditLog,
    integrations,
    setIntegrations,
    settings,
    setSettings,
    addAudit,
    // -- Notification system --
    notifications,
    addNotification,
    markNotificationRead,
    clearNotifications,
    // -- Constants --
    allEmployees: DEMO_EMPLOYEES,
  };

  return (
    <ToastProvider>
      <AppContext.Provider value={contextValue}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Topbar
              mode={mode}
              onModeChange={setMode}
              employee={employee}
              employees={DEMO_EMPLOYEES}
              onEmployeeChange={(id) =>
                setEmployee(DEMO_EMPLOYEES.find((e) => e.id === id))
              }
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
