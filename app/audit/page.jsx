"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "../AppShell";

// ============================================================================
// AUDIT PAGE — Compliance audit log with persistent Neon data + CSV export.
//
// On mount: fetches from /api/audit (Neon). Merges with in-memory context
// entries (from current session). Deduplicated by ID. Neon entries are
// authoritative for anything with a database-style ID.
//
// "This session" badge shows entries not yet written to DB.
// ============================================================================

// -- Icon + pill class mapping by audit log level --
const LEVEL_CONFIG = {
  info:     { icon: "ℹ️",  pillClass: "pill-blue" },
  warning:  { icon: "⚠️", pillClass: "pill-amber" },
  critical: { icon: "🔴", pillClass: "pill-red" },
  success:  { icon: "✅", pillClass: "pill-green" },
};

// -- Normalize Neon DB row to the same shape as in-memory entries --
function normalizeDbEntry(row) {
  return {
    id: row.id,
    timestamp: row.created_at || row.timestamp,
    displayTime: row.created_at
      ? new Date(row.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : (row.displayTime || ""),
    action: row.action,
    detail: row.detail,
    level: row.level || "info",
    employee: row.user_name || row.employee || "Unknown",
    role: row.user_role || row.role || "unknown",
    fromDb: true,
  };
}

function AuditContent() {
  const { auditLog, currentUser } = useApp();

  // -- DB-fetched entries (authoritative) --
  const [dbEntries, setDbEntries] = useState([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // -- Filter state --
  const [levelFilter, setLevelFilter] = useState("all");

  // -- Fetch audit log from Neon --
  useEffect(() => {
    const load = async () => {
      setDbLoading(true);
      setDbError(null);
      try {
        const orgId = currentUser?.orgId || "default";
        const res = await fetch(`/api/audit?orgId=${orgId}&limit=200`);
        const data = await res.json();
        if (!data.demo && Array.isArray(data.entries)) {
          setDbEntries(data.entries.map(normalizeDbEntry));
        }
      } catch (err) {
        setDbError("Could not load from database. Showing session data only.");
      } finally {
        setDbLoading(false);
      }
    };
    load();
  }, [currentUser]);

  // -- Merge: DB entries (authoritative) + in-memory session entries
  //    Deduplicate by ID prefix: DB rows use numeric IDs, session entries use AUD-<timestamp>
  //    In-memory entries only shown if their ID is NOT already in the DB set --
  const mergedLog = (() => {
    const dbIds = new Set(dbEntries.map((e) => e.id?.toString()));
    // Session-only entries: those with AUD- prefix that aren't in the DB
    const sessionOnly = auditLog.filter((e) => !dbIds.has(e.id?.toString()));
    // Combine: DB first (newest), then session-only entries
    const combined = [...dbEntries, ...sessionOnly];
    // Sort by timestamp descending
    return combined.sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime();
      const tb = new Date(b.timestamp || 0).getTime();
      return tb - ta;
    });
  })();

  // -- Apply level filter --
  const displayed = levelFilter === "all"
    ? mergedLog
    : mergedLog.filter((e) => e.level === levelFilter);

  // -- Export merged log to CSV --
  const exportCSV = useCallback(() => {
    if (mergedLog.length === 0) return;
    const headers = ["ID", "Timestamp", "Action", "Detail", "Level", "Employee", "Role", "Source"];
    const rows = mergedLog.map((entry) => [
      entry.id,
      entry.timestamp,
      entry.action,
      `"${(entry.detail || "").replace(/"/g, '""')}"`,
      entry.level,
      entry.employee,
      entry.role || "unknown",
      entry.fromDb ? "database" : "session",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedLog]);

  // -- Counts for filter badges --
  const countByLevel = (level) => mergedLog.filter((e) => e.level === level).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Header + Controls ============ */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {dbLoading && <span className="text-brand-500 animate-pulse">Loading from database…  </span>}
            {!dbLoading && (
              <>
                {dbEntries.length > 0
                  ? `${dbEntries.length} entries from database`
                  : "Session data only (no database connected)"
                }
                {auditLog.filter((e) => !new Set(dbEntries.map(d => d.id?.toString())).has(e.id?.toString())).length > 0 && (
                  <span className="ml-2 text-brand-600 font-medium">
                    + {auditLog.filter((e) => !new Set(dbEntries.map(d => d.id?.toString())).has(e.id?.toString())).length} this session
                  </span>
                )}
              </>
            )}
          </p>
          {dbError && (
            <p className="text-xs text-amber-600 mt-1">⚠️ {dbError}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Level filter pills */}
          <div className="flex gap-1">
            {["all", "info", "warning", "critical", "success"].map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                  levelFilter === l
                    ? "bg-brand-50 border-brand-400 text-brand-700 font-semibold"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {l === "all" ? `All (${mergedLog.length})` : `${l} (${countByLevel(l)})`}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            disabled={mergedLog.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ============ Audit Entries ============ */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs text-center py-16">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">
            {dbLoading ? "Loading audit entries…" : "No audit events yet"}
          </h3>
          <p className="text-xs text-gray-400">
            {!dbLoading && "Events will appear here as you interact with AI HR Pilot"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((entry) => {
            const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info;
            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-gray-200 shadow-xs px-5 py-3.5 flex items-start gap-3 hover:shadow-md transition-shadow"
              >
                {/* -- Level icon -- */}
                <div className="text-lg mt-0.5 shrink-0">{config.icon}</div>

                {/* -- Content -- */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{entry.action}</span>
                    <span className={`pill ${config.pillClass}`}>{entry.level}</span>
                    {!entry.fromDb && (
                      <span className="pill pill-brand text-[9px]">this session</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{entry.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 flex-wrap">
                    <span>{entry.displayTime}</span>
                    <span className="text-gray-300">|</span>
                    <span>{entry.employee}</span>
                    {entry.role && entry.role !== "unknown" && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="capitalize">{entry.role.replace("_", " ")}</span>
                      </>
                    )}
                    <span className="text-gray-300">|</span>
                    <span className="font-mono">{entry.id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return <AuditContent />;
}
