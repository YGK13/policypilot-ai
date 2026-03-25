"use client";

import { useCallback } from "react";
import { useApp } from "../AppShell";

// ============================================================================
// AUDIT PAGE — Audit log display with export CSV functionality
// ============================================================================

// -- Icon mapping by audit log level --
const LEVEL_CONFIG = {
  info: { icon: "\u2139\uFE0F", pillClass: "pill-blue" },
  warning: { icon: "\u26A0\uFE0F", pillClass: "pill-amber" },
  critical: { icon: "\u{1F534}", pillClass: "pill-red" },
  success: { icon: "\u2705", pillClass: "pill-green" },
};

function AuditContent() {
  const { auditLog } = useApp();

  // -- Export audit log to CSV and trigger download --
  const exportCSV = useCallback(() => {
    if (auditLog.length === 0) return;

    const headers = ["ID", "Timestamp", "Action", "Detail", "Level", "Employee"];
    const rows = auditLog.map((entry) => [
      entry.id,
      entry.timestamp,
      entry.action,
      `"${(entry.detail || "").replace(/"/g, '""')}"`,
      entry.level,
      entry.employee,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [auditLog]);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Header + Export Button ============ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {auditLog.length} event{auditLog.length !== 1 ? "s" : ""} recorded this session
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={auditLog.length === 0}
          className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {"\u{1F4E5}"} Export CSV
        </button>
      </div>

      {/* ============ Audit Entries ============ */}
      {auditLog.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs text-center py-16">
          <div className="text-4xl mb-3">{"\u{1F4DD}"}</div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">No audit events yet</h3>
          <p className="text-xs text-gray-400">
            Events will appear here as you interact with AI HR Pilot
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {auditLog.map((entry) => {
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
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{entry.action}</span>
                    <span className={`pill ${config.pillClass}`}>{entry.level}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{entry.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span>{entry.displayTime}</span>
                    <span className="text-gray-300">|</span>
                    <span>{entry.employee}</span>
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
