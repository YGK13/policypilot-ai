"use client";

import { useMemo } from "react";
import { useApp } from "../AppShell";

// ============================================================================
// ANALYTICS PAGE — Real data from tickets, not random numbers.
// Stats, category breakdown, routing distribution, queries by state,
// resolution rate, risk distribution — all derived from actual ticket data.
// ============================================================================

function AnalyticsContent() {
  const { tickets, mode } = useApp();

  // ============ COMPUTED METRICS FROM REAL TICKET DATA ============
  const metrics = useMemo(() => {
    const total = tickets.length;
    if (total === 0) {
      return {
        total: 0, resolved: 0, escalated: 0, pending: 0,
        resolutionRate: 0, avgRisk: 0, autoRate: 0,
        hrRate: 0, legalRate: 0,
        catCounts: [], stateCounts: [], routingCounts: [],
        riskBuckets: { low: 0, medium: 0, high: 0, critical: 0 },
        satisfactionAvg: 0, satisfactionCount: 0,
      };
    }

    const resolved = tickets.filter(t => t.status === "resolved").length;
    const escalated = tickets.filter(t => t.status === "escalated").length;
    const pending = tickets.filter(t => t.status === "pending").length;
    const avgRisk = Math.round(tickets.reduce((a, t) => a + (t.riskScore || 0), 0) / total);
    const autoRouted = tickets.filter(t => t.routing === "auto" || t.routing === "auto_enhanced").length;
    const hrRouted = tickets.filter(t => t.routing === "hr").length;
    const legalRouted = tickets.filter(t => t.routing === "legal").length;

    // -- Category distribution --
    const catMap = {};
    tickets.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
    const catCounts = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // -- State distribution --
    const stateMap = {};
    tickets.forEach(t => { if (t.state) stateMap[t.state] = (stateMap[t.state] || 0) + 1; });
    const stateCounts = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // -- Routing distribution --
    const routingCounts = [
      { label: "Auto-Resolved", value: autoRouted, color: "#10b981" },
      { label: "HR Review", value: hrRouted, color: "#f59e0b" },
      { label: "Legal Escalation", value: legalRouted, color: "#ef4444" },
    ];

    // -- Risk buckets --
    const riskBuckets = { low: 0, medium: 0, high: 0, critical: 0 };
    tickets.forEach(t => {
      const r = t.riskScore || 0;
      if (r >= 76) riskBuckets.critical++;
      else if (r >= 51) riskBuckets.high++;
      else if (r >= 26) riskBuckets.medium++;
      else riskBuckets.low++;
    });

    // -- Satisfaction from tickets with ratings --
    const rated = tickets.filter(t => t.satisfaction != null);
    const satisfactionAvg = rated.length > 0
      ? (rated.reduce((a, t) => a + t.satisfaction, 0) / rated.length).toFixed(1)
      : "—";

    return {
      total, resolved, escalated, pending,
      resolutionRate: Math.round((resolved / total) * 100),
      avgRisk,
      autoRate: Math.round((autoRouted / total) * 100),
      hrRate: Math.round((hrRouted / total) * 100),
      legalRate: Math.round((legalRouted / total) * 100),
      catCounts, stateCounts, routingCounts, riskBuckets,
      satisfactionAvg,
      satisfactionCount: rated.length,
    };
  }, [tickets]);

  const maxCat = metrics.catCounts.length > 0 ? Math.max(...metrics.catCounts.map(c => c[1]), 1) : 1;
  const maxState = metrics.stateCounts.length > 0 ? Math.max(...metrics.stateCounts.map(s => s[1]), 1) : 1;

  // ============ EMPTY STATE ============
  if (metrics.total === 0) {
    return (
      <div className="p-6 max-w-[800px] mx-auto text-center py-20">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">No Analytics Data Yet</h2>
        <p className="text-sm text-gray-500 mb-4">
          Start conversations in AI Chat to generate ticket data. Analytics will populate automatically.
        </p>
        <a href="/chat" className="inline-block px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700">
          Open AI Chat →
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ KPI Stat Cards — ALL from real data ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: "💬", label: "Total Queries", value: metrics.total, sub: `${metrics.pending} pending`, cls: "brand" },
          { icon: "✅", label: "Resolution Rate", value: `${metrics.resolutionRate}%`, sub: `${metrics.resolved} resolved`, cls: "green" },
          { icon: "⚠️", label: "Escalation Rate", value: `${metrics.hrRate + metrics.legalRate}%`, sub: `${metrics.escalated} escalated`, cls: "amber" },
          { icon: "🎯", label: "Avg Risk Score", value: metrics.avgRisk, sub: `${metrics.riskBuckets.critical} critical`, cls: metrics.avgRisk > 50 ? "red" : "blue" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* ============ Category Breakdown — Bar Chart ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Queries by Category</h3>
          {metrics.catCounts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No category data</p>
          ) : (
            <div className="space-y-2.5">
              {metrics.catCounts.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-36 truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((count / maxCat) * 100, 15)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ Routing Distribution ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🔀 Routing Distribution</h3>
          <div className="space-y-4">
            {metrics.routingCounts.map((r) => {
              const pct = metrics.total > 0 ? Math.round((r.value / metrics.total) * 100) : 0;
              return (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{r.label}</span>
                    <span className="text-gray-500">{r.value} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: r.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risk distribution mini-table */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Risk Distribution</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Low", value: metrics.riskBuckets.low, color: "text-green-600 bg-green-50" },
                { label: "Medium", value: metrics.riskBuckets.medium, color: "text-blue-600 bg-blue-50" },
                { label: "High", value: metrics.riskBuckets.high, color: "text-amber-600 bg-amber-50" },
                { label: "Critical", value: metrics.riskBuckets.critical, color: "text-red-600 bg-red-50" },
              ].map((b) => (
                <div key={b.label} className={`rounded-lg p-2 ${b.color}`}>
                  <div className="text-lg font-bold">{b.value}</div>
                  <div className="text-[10px] font-medium">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Queries by State ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">🌎 Queries by Jurisdiction</h3>
        {metrics.stateCounts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No state data yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {metrics.stateCounts.map(([state, count]) => (
              <div key={state} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-28 truncate">{state}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((count / maxState) * 100, 12)}%` }}
                  >
                    <span className="text-[9px] font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
