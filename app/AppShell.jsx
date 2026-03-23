"use client";

import { useState, useCallback, createContext, useContext } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ToastProvider from "@/components/layout/ToastProvider";
import { DEMO_EMPLOYEES } from "@/lib/data/demo-data";

// ============================================================================
// APP CONTEXT — shared state across all views
// Persists across navigations because AppShell lives in the root layout.
// ============================================================================
const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// ============================================================================
// APP SHELL — Client wrapper with sidebar + topbar + persistent shared state
// Placed in RootLayout so all page navigations preserve tickets, audit, etc.
// ============================================================================
export default function AppShell({ children }) {
  const [mode, setMode] = useState("employee");
  const [employee, setEmployee] = useState(DEMO_EMPLOYEES[0]);

  // -- Shared state for cross-view data --
  const [tickets, setTickets] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [integrations, setIntegrations] = useState({});
  const [settings, setSettings] = useState({
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
  });

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
