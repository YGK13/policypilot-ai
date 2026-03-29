"use client";

import { useApp } from "../AppShell";
import { useState, useEffect, useCallback } from "react";

// ============================================================================
// TICKETS PAGE — Table + Kanban views with filtering
// Loads from Neon API on mount (when DB is available), merges with
// localStorage context state. Employee mode filters to own tickets only.
// ============================================================================

function TicketsContent() {
  const { tickets, setTickets, mode, employee, currentUser } = useApp();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);

  // -- Load tickets from Neon on mount (fire once) --
  const loadFromDb = useCallback(async () => {
    setLoading(true);
    try {
      const orgId = currentUser?.orgId || "default";
      const params = new URLSearchParams({ orgId, limit: "200" });
      if (mode === "employee" && currentUser?.id) {
        params.set("userId", currentUser.id);
      }
      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();

      // -- If real DB data came back, merge with context (Neon is authoritative) --
      if (!data.demo && Array.isArray(data.tickets) && data.tickets.length > 0) {
        // Normalize Neon snake_case columns → camelCase for UI
        const normalized = data.tickets.map((t) => ({
          id: t.id,
          query: t.query,
          category: t.category,
          riskScore: t.risk_score ?? t.riskScore ?? 0,
          routing: t.routing,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee,
          employee: t.employee_name || t.employee || "",
          employeeId: t.user_id || t.employeeId,
          department: t.department,
          state: t.state,
          flags: t.flags || [],
          resolution: t.resolution,
          created: t.created_at
            ? new Date(t.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : (t.created || ""),
          satisfaction: t.satisfaction ?? null,
        }));

        // Deduplicate: Neon rows win over localStorage versions of same ID
        setTickets((prev) => {
          const dbIds = new Set(normalized.map((t) => t.id));
          const localOnly = prev.filter((t) => !dbIds.has(t.id));
          return [...normalized, ...localOnly];
        });
      }
    } catch (err) {
      console.warn("[Tickets] API load failed, using context:", err.message);
    } finally {
      setLoading(false);
      setDbLoaded(true);
    }
  }, [currentUser, mode, setTickets]);

  useEffect(() => {
    loadFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Mode-aware: employee sees only their own tickets --
  const baseTickets = mode === "employee"
    ? tickets.filter((t) => t.employee === `${employee.firstName} ${employee.lastName}`)
    : tickets;

  const filtered = filter === "all" ? baseTickets : baseTickets.filter((t) => t.status === filter);

  // ============================================================================
  // KANBAN COLUMNS — Reflects the actual HR ticket workflow:
  //   • Auto-Resolved: AI answered it, low risk, status = "resolved", routing = auto
  //   • Pending HR Review: routing = hr, status = "pending" (needs human action)
  //   • Escalated to Legal: routing = legal, status = "escalated"
  //   • All Resolved: everything else with status = "resolved" (HR closed it)
  // ============================================================================
  const kanbanCols = [
    {
      id: "auto",
      label: "Auto-Resolved",
      color: "#10b981",
      items: baseTickets.filter(
        (t) => t.status === "resolved" && (t.routing === "auto" || t.routing === "auto_enhanced")
      ),
    },
    {
      id: "pending",
      label: "Pending HR Review",
      color: "#f59e0b",
      items: baseTickets.filter((t) => t.status === "pending"),
    },
    {
      id: "escalated",
      label: "Escalated to Legal",
      color: "#ef4444",
      items: baseTickets.filter((t) => t.status === "escalated"),
    },
    {
      id: "resolved",
      label: "Closed / Resolved",
      color: "#6366f1",
      items: baseTickets.filter(
        (t) => t.status === "resolved" && t.routing !== "auto" && t.routing !== "auto_enhanced"
      ),
    },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ View Toggle + Filter Bar ============ */}
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === "table" ? "bg-white text-brand-600 shadow-xs" : "text-gray-500"}`}
            >
              📋 Table
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === "kanban" ? "bg-white text-brand-600 shadow-xs" : "text-gray-500"}`}
            >
              📌 Kanban
            </button>
          </div>
          {/* DB load indicator */}
          {loading && (
            <span className="text-[10px] text-gray-400 italic">Loading from database…</span>
          )}
          {!loading && dbLoaded && tickets.length > 0 && (
            <span className="text-[10px] text-gray-400">{tickets.length} total tickets</span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", "resolved", "pending", "escalated"].map((f) => {
            const count = f === "all" ? baseTickets.length : baseTickets.filter((t) => t.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 border rounded-full text-[11px] font-medium transition-all ${
                  filter === f
                    ? "bg-brand-50 border-brand-400 text-brand-700 font-semibold"
                    : "border-gray-200 text-gray-500 hover:border-brand-400 hover:text-brand-600"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ TABLE VIEW ============ */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🎫</div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                {loading ? "Loading tickets…" : "No tickets"}
              </h3>
              <p className="text-xs">
                {!loading && "Start chatting to generate tickets"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    {["ID", "Query", "Category", "Risk", "Priority", "Status", "Routing", "Assignee", "Employee", "Time"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-3.5 py-2.5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3.5 py-2.5 font-mono text-xs">{t.id}</td>
                      <td className="px-3.5 py-2.5 text-sm max-w-[200px] truncate">{t.query}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="pill pill-gray">{t.category}</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${
                          t.riskScore >= 76 ? "pill-red"
                          : t.riskScore >= 51 ? "pill-amber"
                          : t.riskScore >= 26 ? "pill-blue"
                          : "pill-green"
                        }`}>
                          {t.riskScore}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${
                          t.priority === "critical" ? "pill-red"
                          : t.priority === "high" ? "pill-amber"
                          : t.priority === "medium" ? "pill-blue"
                          : "pill-green"
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${
                          t.status === "resolved" ? "pill-green"
                          : t.status === "escalated" ? "pill-red"
                          : "pill-amber"
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`route-tag ${
                          t.routing === "legal" ? "legal"
                          : t.routing === "hr" ? "hr"
                          : "auto"
                        }`}>
                          {t.routing}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-sm">{t.assignee}</td>
                      <td className="px-3.5 py-2.5 text-sm">{t.employee}</td>
                      <td className="px-3.5 py-2.5 text-xs text-gray-400">{t.created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ KANBAN VIEW ============ */}
      {viewMode === "kanban" && (
        <div className="kanban-grid">
          {kanbanCols.map((col) => (
            <div key={col.id} className="bg-gray-100 rounded-lg p-3 flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-1 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: col.color }} />
                  {col.label}
                </div>
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center">
                  {col.items.length}
                </span>
              </div>
              {/* Empty state per column */}
              {col.items.length === 0 && (
                <div className="text-center py-4 text-[10px] text-gray-400">No tickets</div>
              )}
              {/* Ticket cards */}
              {col.items.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="text-[13px] font-semibold text-gray-800 mb-1.5">{t.id}</div>
                  <div className="text-[11px] text-gray-500 mb-2 line-clamp-2">{t.query}</div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className={`pill ${
                      t.priority === "critical" ? "pill-red"
                      : t.priority === "high" ? "pill-amber"
                      : "pill-green"
                    }`}>
                      {t.priority}
                    </span>
                    <span>{t.employee}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  return <TicketsContent />;
}
