"use client";

import { useMemo } from "react";
import AppShell, { useApp } from "../AppShell";

// ============================================================================
// ANALYTICS PAGE — Stat cards, weekly volume bar chart, queries by state
// ============================================================================

// -- Days of the week for the weekly chart --
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// -- Generate seeded random data for the weekly chart --
function generateWeeklyData() {
  return DAYS.map((day) => ({
    label: day,
    value: Math.floor(Math.random() * 40) + 10,
  }));
}

function AnalyticsContent() {
  const { tickets } = useApp();

  // -- Stat cards data --
  const stats = [
    { icon: "\u23F1\uFE0F", label: "Avg Response Time", value: "1.2s", cls: "brand" },
    { icon: "\u{1F3AF}", label: "AI Accuracy", value: "94%", cls: "green" },
    { icon: "\u{1F4B0}", label: "Est. Cost Savings", value: "$18K/mo", cls: "blue" },
    { icon: "\u2B50", label: "Satisfaction", value: "4.6/5", cls: "amber" },
  ];

  // -- Weekly volume data (random but stable per render) --
  const weeklyData = useMemo(() => generateWeeklyData(), []);
  const maxWeekly = Math.max(...weeklyData.map((d) => d.value), 1);

  // -- Queries by state from ticket data --
  const stateCounts = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => {
      if (t.state) {
        counts[t.state] = (counts[t.state] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [tickets]);
  const maxState = stateCounts.length > 0 ? Math.max(...stateCounts.map((s) => s[1]), 1) : 1;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Stat Cards ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-200 shadow-xs p-5"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                <div className={`text-xl font-bold text-${s.cls === "brand" ? "brand-600" : s.cls === "green" ? "green-600" : s.cls === "blue" ? "blue-600" : "amber-600"}`}>
                  {s.value}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============ Weekly Query Volume — Bar Chart ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {"\u{1F4CA}"} Weekly Query Volume
          </h3>
          <div className="flex items-end gap-3 h-48">
            {weeklyData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-500">{d.value}</span>
                <div
                  className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-md transition-all hover:from-brand-700 hover:to-brand-500"
                  style={{ height: `${(d.value / maxWeekly) * 160}px`, minHeight: "8px" }}
                />
                <span className="text-[10px] font-medium text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ============ Queries by State — Horizontal Bars ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {"\u{1F30E}"} Queries by State
          </h3>
          {stateCounts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">{"\u{1F4CA}"}</div>
              <p className="text-xs">No ticket data yet. Start chatting to generate queries.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stateCounts.map(([state, count]) => (
                <div key={state} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-28 truncate">
                    {state}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((count / maxState) * 100, 10)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AppShell currentView="analytics">
      <AnalyticsContent />
    </AppShell>
  );
}
