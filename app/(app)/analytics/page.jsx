"use client";

import { useMemo, useState, useEffect } from "react";
import { useApp } from "@/app/AppShell";

// ============================================================================
// ANALYTICS PAGE — Hybrid: tries Neon API first, falls back to context data.
//
// When DB is available: fetches /api/analytics for authoritative org-wide stats.
// When DB is unavailable (demo mode): derives metrics from localStorage tickets.
// Time range selector: 7d / 30d / 90d.
// ============================================================================

// -- Color ramp for category bars --
const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#84cc16",
];

function AnalyticsContent() {
  const { tickets, currentUser } = useApp();

  // -- Time range filter (used for both API and local computation) --
  const [days, setDays] = useState(30);

  // -- API state: null = not loaded yet, false = demo/no-db, object = real data --
  const [apiStats, setApiStats] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // -- Fetch from Neon API --
  useEffect(() => {
    const load = async () => {
      setApiLoading(true);
      setApiError(null);
      try {
        const orgId = currentUser?.orgId || "default";
        const res = await fetch(`/api/analytics?orgId=${orgId}&days=${days}`);
        const data = await res.json();
        if (data.demo || data.error) {
          setApiStats(false); // use local fallback
        } else {
          setApiStats(data);
        }
      } catch {
        setApiStats(false);
      } finally {
        setApiLoading(false);
      }
    };
    load();
  }, [days, currentUser]);

  // ============================================================================
  // LOCAL METRICS — derived from context tickets (demo mode + fallback)
  // Filters to the selected time window.
  // ============================================================================
  const localMetrics = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    // Filter tickets within the time window (if they have a parseable date)
    const windowed = tickets.filter((t) => {
      if (!t.created) return true; // always include if no timestamp
      const ts = new Date(t.created).getTime();
      return isNaN(ts) || ts >= cutoff;
    });

    const total = windowed.length;
    if (total === 0) {
      return {
        total: 0, resolved: 0, escalated: 0, pending: 0,
        resolutionRate: 0, avgRisk: 0, autoRate: 0,
        hrRate: 0, legalRate: 0,
        catCounts: [], stateCounts: [], routingCounts: [],
        riskBuckets: { low: 0, medium: 0, high: 0, critical: 0 },
        satisfactionAvg: "—", satisfactionCount: 0,
      };
    }

    const resolved = windowed.filter((t) => t.status === "resolved").length;
    const escalated = windowed.filter((t) => t.status === "escalated").length;
    const pending = windowed.filter((t) => t.status === "pending").length;
    const avgRisk = Math.round(windowed.reduce((a, t) => a + (t.riskScore || 0), 0) / total);
    const autoRouted = windowed.filter((t) => t.routing === "auto" || t.routing === "auto_enhanced").length;
    const hrRouted = windowed.filter((t) => t.routing === "hr").length;
    const legalRouted = windowed.filter((t) => t.routing === "legal").length;

    // Category distribution
    const catMap = {};
    windowed.forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
    const catCounts = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    // State distribution
    const stateMap = {};
    windowed.forEach((t) => { if (t.state) stateMap[t.state] = (stateMap[t.state] || 0) + 1; });
    const stateCounts = Object.entries(stateMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Routing distribution
    const routingCounts = [
      { label: "Auto-Resolved", value: autoRouted, color: "#10b981" },
      { label: "HR Review", value: hrRouted, color: "#f59e0b" },
      { label: "Legal Escalation", value: legalRouted, color: "#ef4444" },
    ];

    // Risk buckets
    const riskBuckets = { low: 0, medium: 0, high: 0, critical: 0 };
    windowed.forEach((t) => {
      const r = t.riskScore || 0;
      if (r >= 76) riskBuckets.critical++;
      else if (r >= 51) riskBuckets.high++;
      else if (r >= 26) riskBuckets.medium++;
      else riskBuckets.low++;
    });

    // Satisfaction
    const rated = windowed.filter((t) => t.satisfaction != null);
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
  }, [tickets, days]);

  // ============================================================================
  // RESOLVED DISPLAY METRICS — prefer API data, fall back to local
  // ============================================================================
  const isApiMode = apiStats && apiStats !== false;

  // When using API data, normalize the shape to match what the UI expects
  const apiMetrics = useMemo(() => {
    if (!isApiMode) return null;
    const s = apiStats.stats || {};
    const total = parseInt(s.total || 0, 10);
    const resolved = parseInt(s.resolved || 0, 10);
    const escalated = parseInt(s.escalated || 0, 10);
    const avgRisk = parseInt(s.avg_risk || 0, 10);
    const avgSatisfaction = s.avg_satisfaction ? parseFloat(s.avg_satisfaction).toFixed(1) : "—";
    const avgResolutionHours = s.avg_resolution_seconds
      ? Math.round(parseInt(s.avg_resolution_seconds, 10) / 3600)
      : null;

    // Category breakdown from API
    const catCounts = (apiStats.byCategory || []).map((r) => [r.category, parseInt(r.count, 10)]);

    // State breakdown from API
    const stateCounts = (apiStats.byState || []).map((r) => [r.state, parseInt(r.count, 10)]);

    // Routing breakdown from API (auto / hr / legal)
    const routingMap = {};
    (apiStats.byRouting || []).forEach((r) => { routingMap[r.routing] = parseInt(r.count, 10); });
    const autoRouted = routingMap.auto || 0;
    const hrRouted = routingMap.hr || 0;
    const legalRouted = routingMap.legal || 0;

    // Risk bucket distribution from API
    const rb = apiStats.byRisk || {};
    const riskBuckets = {
      low:      parseInt(rb.low || 0, 10),
      medium:   parseInt(rb.medium || 0, 10),
      high:     parseInt(rb.high || 0, 10),
      critical: parseInt(rb.critical || 0, 10),
    };

    return {
      total, resolved, escalated,
      pending: total - resolved - escalated,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgRisk,
      autoRate: total > 0 ? Math.round((autoRouted / total) * 100) : 0,
      hrRate: total > 0 ? Math.round((hrRouted / total) * 100) : 0,
      legalRate: total > 0 ? Math.round((legalRouted / total) * 100) : 0,
      catCounts, stateCounts, riskBuckets,
      avgSatisfaction, avgResolutionHours,
    };
  }, [isApiMode, apiStats]);

  // -- Use whichever data source is available --
  const display = isApiMode ? apiMetrics : localMetrics;
  const hasData = display && display.total > 0;

  const maxCat = display?.catCounts?.length > 0 ? Math.max(...display.catCounts.map((c) => c[1]), 1) : 1;
  const maxState = display?.stateCounts?.length > 0 ? Math.max(...display.stateCounts.map((s) => s[1]), 1) : 1;

  // ============ LOADING STATE ============
  if (apiLoading && !hasData) {
    return (
      <div className="p-6 max-w-[800px] mx-auto text-center py-20">
        <div className="text-3xl mb-3 animate-pulse">📊</div>
        <p className="text-sm text-gray-500">Loading analytics…</p>
      </div>
    );
  }

  // ============ EMPTY STATE ============
  if (!hasData && !apiLoading) {
    return (
      <div className="p-6 max-w-[800px] mx-auto text-center py-20">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">No Analytics Data Yet</h2>
        <p className="text-sm text-gray-500 mb-4">
          Start conversations in AI Chat to generate ticket data. Analytics will populate automatically.
        </p>
        <a
          href="/chat"
          className="inline-block px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700"
        >
          Open AI Chat →
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Header + Time Range Filter ============ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isApiMode ? "Live data from database" : "Session data (no database connected)"}
            {apiLoading && <span className="ml-2 text-brand-500 animate-pulse">Refreshing…</span>}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                days === d ? "bg-white text-brand-600 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* ============ KPI Stat Cards ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: "💬", label: "Total Queries", value: display.total, sub: `${display.pending ?? "—"} pending`, cls: "brand" },
          { icon: "✅", label: "Resolution Rate", value: `${display.resolutionRate}%`, sub: `${display.resolved} resolved`, cls: "green" },
          { icon: "⚠️", label: "Escalation Rate", value: `${display.hrRate ?? 0}%`, sub: `${display.escalated} escalated`, cls: "amber" },
          {
            icon: "🎯",
            label: "Avg Risk Score",
            value: display.avgRisk,
            sub: isApiMode && apiMetrics?.avgSatisfaction !== "—"
              ? `Satisfaction: ${apiMetrics.avgSatisfaction}/5`
              : `${display.riskBuckets?.critical || 0} critical`,
            cls: display.avgRisk > 50 ? "red" : "blue",
          },
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

      {/* ============ Extra KPIs when using API data ============ */}
      {isApiMode && apiMetrics?.avgResolutionHours != null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Avg Resolution Time</div>
            <div className="text-2xl font-bold text-gray-900">{apiMetrics.avgResolutionHours}h</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Avg Satisfaction</div>
            <div className="text-2xl font-bold text-gray-900">{apiMetrics.avgSatisfaction} <span className="text-sm text-gray-400">/ 5</span></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Auto-Resolve Rate</div>
            <div className="text-2xl font-bold text-gray-900">{display.autoRate ?? 0}%</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* ============ Category Breakdown — Bar Chart ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Queries by Category</h3>
          {display.catCounts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No category data</p>
          ) : (
            <div className="space-y-2.5">
              {display.catCounts.map(([cat, count], i) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-36 truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{
                        width: `${Math.max((count / maxCat) * 100, 15)}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    >
                      <span className="text-[10px] font-bold text-white">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============ Routing Distribution + Risk Buckets ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🔀 Routing Distribution</h3>
          {/* Routing bars — use display (API or local) */}
          <div className="space-y-4">
            {[
              { label: "Auto-Resolved", value: display.autoRate ?? 0, key: "auto", color: "#22c55e" },
              { label: "HR Escalated",  value: display.hrRate ?? 0, key: "hr", color: "#f59e0b" },
              { label: "Legal Routed",  value: display.legalRate ?? 0, key: "legal", color: "#ef4444" },
            ].map((r) => (
              <div key={r.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{r.label}</span>
                  <span className="text-gray-500">{r.value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(r.value, 3)}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Risk distribution mini-table — use display (API or local) */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Risk Distribution</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Low",      value: display.riskBuckets?.low ?? 0,      color: "text-green-600 bg-green-50" },
                { label: "Medium",   value: display.riskBuckets?.medium ?? 0,   color: "text-blue-600 bg-blue-50" },
                { label: "High",     value: display.riskBuckets?.high ?? 0,     color: "text-amber-600 bg-amber-50" },
                { label: "Critical", value: display.riskBuckets?.critical ?? 0, color: "text-red-600 bg-red-50" },
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

      {/* ============ Queries by Jurisdiction ============ */}
      {display.stateCounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🌎 Queries by Jurisdiction</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {display.stateCounts.map(([state, count]) => (
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
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsContent />;
}
