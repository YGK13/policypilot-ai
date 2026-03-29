"use client";

import { useApp } from "../AppShell";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/layout/ToastProvider";

// ============================================================================
// TICKETS PAGE — Table + Kanban views with filtering, action buttons, and
// a detail modal for HR admins/staff to resolve or escalate tickets.
//
// Data: loads from Neon API on mount (when DB is available), merges with
// localStorage context state. Neon is authoritative.
// ============================================================================

// -- Action modal for viewing + updating a ticket --
function TicketModal({ ticket, onClose, onUpdate, isAdmin }) {
  const [resolution, setResolution] = useState(ticket.resolution || "");
  const [saving, setSaving] = useState(false);

  const handleStatus = useCallback(async (newStatus) => {
    setSaving(true);
    await onUpdate(ticket.id, newStatus, resolution);
    setSaving(false);
    onClose();
  }, [ticket.id, resolution, onUpdate, onClose]);

  const riskColor =
    ticket.riskScore >= 76 ? "text-red-600 bg-red-50 border-red-200"
    : ticket.riskScore >= 51 ? "text-amber-600 bg-amber-50 border-amber-200"
    : ticket.riskScore >= 26 ? "text-blue-600 bg-blue-50 border-blue-200"
    : "text-green-600 bg-green-50 border-green-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* -- Header -- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-500">{ticket.id}</span>
            <span className={`pill ${ticket.status === "resolved" ? "pill-green" : ticket.status === "escalated" ? "pill-red" : "pill-amber"}`}>
              {ticket.status}
            </span>
            <span className={`pill pill-gray`}>{ticket.category}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* -- Query -- */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Employee Query</label>
            <p className="mt-1 text-sm text-gray-800 leading-relaxed">{ticket.query}</p>
          </div>

          {/* -- Meta row -- */}
          <div className="flex flex-wrap gap-3">
            <div className={`px-3 py-2 rounded-lg border text-xs font-semibold ${riskColor}`}>
              Risk Score: {ticket.riskScore}
            </div>
            <div className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">
              Priority: <strong className="capitalize">{ticket.priority}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">
              Routing: <strong>{ticket.routing}</strong>
            </div>
            {ticket.state && (
              <div className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">
                Jurisdiction: <strong>{ticket.state}</strong>
              </div>
            )}
            {ticket.employee && (
              <div className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-600">
                Employee: <strong>{ticket.employee}</strong>
              </div>
            )}
          </div>

          {/* -- Flags -- */}
          {ticket.flags && ticket.flags.length > 0 && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Risk Flags</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ticket.flags.map((f) => (
                  <span key={f} className="pill pill-red text-[10px]">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* -- AI Response -- */}
          {ticket.aiResponse && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">AI Response</label>
              <div
                className="mt-1 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: ticket.aiResponse }}
              />
            </div>
          )}

          {/* -- Resolution (existing or new) -- */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Resolution Notes {ticket.status !== "resolved" && isAdmin && "(required to resolve)"}
            </label>
            {isAdmin ? (
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                placeholder="Describe how this was resolved or why it's being escalated…"
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 resize-none"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {ticket.resolution || <span className="text-gray-400 italic">No resolution notes yet.</span>}
              </p>
            )}
          </div>

          {/* -- Action buttons (admin/hr_staff only) -- */}
          {isAdmin && ticket.status !== "resolved" && (
            <div className="flex gap-3 pt-2 flex-wrap">
              <button
                onClick={() => handleStatus("resolved")}
                disabled={saving}
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {saving ? "Saving…" : "✅ Mark Resolved"}
              </button>
              {ticket.status !== "escalated" && (
                <button
                  onClick={() => handleStatus("escalated")}
                  disabled={saving}
                  className="px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  🔴 Escalate to Legal
                </button>
              )}
              {ticket.status !== "pending" && (
                <button
                  onClick={() => handleStatus("pending")}
                  disabled={saving}
                  className="px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  ⏳ Mark Pending HR
                </button>
              )}
            </div>
          )}
          {isAdmin && ticket.status === "resolved" && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleStatus("pending")}
                disabled={saving}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 cursor-pointer"
              >
                ↩ Reopen as Pending
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TICKETS CONTENT
// ============================================================================
function TicketsContent() {
  const { tickets, setTickets, mode, employee, currentUser, orgId, addAudit } = useApp();
  const { addToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [loading, setLoading] = useState(false);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const isAdmin = mode !== "employee";

  // -- Load tickets from Neon on mount --
  const loadFromDb = useCallback(async () => {
    setLoading(true);
    try {
      const resolvedOrgId = orgId || "default";
      const params = new URLSearchParams({ orgId: resolvedOrgId, limit: "200" });
      if (mode === "employee" && currentUser?.id) {
        params.set("userId", currentUser.id);
      }
      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();
      if (!data.demo && Array.isArray(data.tickets) && data.tickets.length > 0) {
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
          aiResponse: t.ai_response || t.aiResponse,
          aiConfidence: t.ai_confidence ?? t.aiConfidence,
          created: t.created_at
            ? new Date(t.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
            : (t.created || ""),
          satisfaction: t.satisfaction ?? null,
        }));
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
  }, [orgId, mode, currentUser, setTickets]);

  useEffect(() => {
    loadFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Update ticket status (locally + Neon) --
  const handleUpdateTicket = useCallback(async (ticketId, newStatus, resolution) => {
    // -- Optimistic local update --
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus, resolution: resolution || t.resolution } : t
      )
    );
    addAudit("TICKET_UPDATE", `${ticketId} → ${newStatus}`, newStatus === "resolved" ? "success" : "warning");
    addToast("success", "Ticket Updated", `${ticketId} marked as ${newStatus}`);

    // -- Persist to Neon (fire-and-forget, non-blocking) --
    const resolvedOrgId = orgId || "default";
    fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: resolvedOrgId,
        ticketId,
        action: "update_status",
        status: newStatus,
        resolution,
      }),
    }).catch((err) => console.warn("[Tickets] PATCH failed:", err.message));
  }, [orgId, setTickets, addAudit, addToast]);

  // -- Mode-aware: employee sees only their own tickets --
  const baseTickets = mode === "employee"
    ? tickets.filter((t) => t.employee === `${employee.firstName} ${employee.lastName}`)
    : tickets;

  const filtered = filter === "all" ? baseTickets : baseTickets.filter((t) => t.status === filter);

  // ============================================================================
  // KANBAN COLUMNS — Actual HR ticket workflow states
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
        (t) =>
          t.status === "resolved" &&
          t.routing !== "auto" &&
          t.routing !== "auto_enhanced"
      ),
    },
  ];

  return (
    <>
      {/* -- Ticket detail modal -- */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleUpdateTicket}
          isAdmin={isAdmin}
        />
      )}

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
            {loading && <span className="text-[10px] text-gray-400 italic">Loading from database…</span>}
            {!loading && dbLoaded && tickets.length > 0 && (
              <span className="text-[10px] text-gray-400">{baseTickets.length} ticket{baseTickets.length !== 1 ? "s" : ""}</span>
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
                <p className="text-xs">{!loading && "Start chatting to generate tickets"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      {[
                        "ID", "Query", "Category", "Risk", "Priority",
                        "Status", "Routing", "Assignee", "Employee", "Time",
                        ...(isAdmin ? ["Actions"] : []),
                      ].map((h) => (
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
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedTicket(t)}
                      >
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
                        {/* Admin quick-action buttons — stopPropagation so row click doesn't open modal */}
                        {isAdmin && (
                          <td className="px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {t.status !== "resolved" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTicket(t.id, "resolved", "Resolved by HR team");
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 cursor-pointer"
                                  title="Mark Resolved"
                                >
                                  ✅
                                </button>
                              )}
                              {t.status !== "escalated" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateTicket(t.id, "escalated", "Escalated to Legal");
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 cursor-pointer"
                                  title="Escalate to Legal"
                                >
                                  🔴
                                </button>
                              )}
                            </div>
                          </td>
                        )}
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
                <div className="flex items-center justify-between px-1 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: col.color }} />
                    {col.label}
                  </div>
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center">
                    {col.items.length}
                  </span>
                </div>
                {col.items.length === 0 && (
                  <div className="text-center py-4 text-[10px] text-gray-400">No tickets</div>
                )}
                {col.items.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
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
    </>
  );
}

export default function TicketsPage() {
  return <TicketsContent />;
}
