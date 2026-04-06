"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/app/AppShell";

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
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 100;

  // -- Filter state --
  const [levelFilter, setLevelFilter] = useState("all");

  // -- Fetch a page of audit entries from Neon --
  const loadPage = useCallback(async (pageOffset) => {
    setDbLoading(true);
    setDbError(null);
    try {
      const orgId = currentUser?.orgId || "default";
      const res = await fetch(
        `/api/audit?orgId=${orgId}&limit=${PAGE_SIZE}&offset=${pageOffset}`
      );
      const data = await res.json();
      if (!data.demo && Array.isArray(data.entries)) {
        const normalized = data.entries.map(normalizeDbEntry);
        setDbEntries((prev) =>
          pageOffset === 0 ? normalized : [...prev, ...normalized]
        );
        // If we got fewer than PAGE_SIZE rows, there are no more pages
        setHasMore(data.entries.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setDbError("Could not load from database. Showing session data only.");
      setHasMore(false);
    } finally {
      setDbLoading(false);
    }
  }, [currentUser]);

  // -- Load first page on mount --
  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  // -- Load next page --
  const loadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    loadPage(nextOffset);
  }, [offset, loadPage]);

  // -- Merge: DB entries (authoritative) + in-memory session entries
  //    Deduplicate by ID: DB rows use numeric IDs, session entries use AUD-<timestamp>
  //    Memoized so the sort only reruns when dbEntries or auditLog actually change --
  const mergedLog = useMemo(() => {
    const dbIds = new Set(dbEntries.map((e) => e.id?.toString()));
    const sessionOnly = auditLog.filter((e) => !dbIds.has(e.id?.toString()));
    const combined = [...dbEntries, ...sessionOnly];
    return combined.sort((a, b) =>
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }, [dbEntries, auditLog]);

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
                  ? `${dbEntries.length} entries from database${hasMore ? " (more available)" : " (all loaded)"}`
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
        <div className="space-y-2" id="audit-entries">
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

      {/* ============ Load More (pagination) ============ */}
      {hasMore && !dbLoading && dbEntries.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            className="px-5 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
          >
            Load More ({dbEntries.length} loaded so far)
          </button>
        </div>
      )}
      {dbLoading && dbEntries.length > 0 && (
        <div className="mt-4 text-center text-xs text-gray-400 animate-pulse">Loading more entries…</div>
      )}
    </div>
  );
}

export default function AuditPage() {
  return <AuditContent />;
}
