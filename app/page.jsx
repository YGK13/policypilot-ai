"use client";

import { useApp } from "./AppShell";
import StatGrid from "@/components/dashboard/StatGrid";
import BarChart from "@/components/dashboard/BarChart";
import DonutChart from "@/components/dashboard/DonutChart";

// ============================================================================
// DASHBOARD PAGE — Stats, charts, recent tickets
// ============================================================================

function DashboardContent() {
  const { tickets, setTickets } = useApp();

  const totalTickets = tickets.length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const escalated = tickets.filter(
    (t) => t.status === "escalated" || t.status === "pending"
  ).length;
  const avgRisk = totalTickets
    ? Math.round(tickets.reduce((a, t) => a + t.riskScore, 0) / totalTickets)
    : 0;
  const autoRate = totalTickets ? Math.round((resolved / totalTickets) * 100) : 0;

  // -- Category distribution for bar chart --
  const catCounts = {};
  tickets.forEach((t) => {
    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  });
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // -- Routing distribution for donut --
  const autoCount = tickets.filter(
    (t) => t.routing === "auto" || t.routing === "auto_enhanced"
  ).length;
  const hrCount = tickets.filter((t) => t.routing === "hr").length;
  const legalCount = tickets.filter((t) => t.routing === "legal").length;

  const stats = [
    { icon: "💬", label: "Total Queries", value: totalTickets, cls: "brand", delta: "+12%", dir: "up" },
    { icon: "✅", label: "Auto-Resolved", value: `${autoRate}%`, cls: "green", delta: "+3%", dir: "up" },
    { icon: "⚠️", label: "Escalated", value: escalated, cls: "amber", delta: escalated > 3 ? "+2" : "0", dir: escalated > 3 ? "up" : "" },
    { icon: "🎯", label: "Avg Risk Score", value: avgRisk, cls: avgRisk > 50 ? "red" : "blue" },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <StatGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <BarChart title="Queries by Category" data={topCats} />
        <DonutChart
          title="Routing Distribution"
          segments={[
            { label: "Auto", value: autoCount, color: "#10b981" },
            { label: "HR", value: hrCount, color: "#f59e0b" },
            { label: "Legal", value: legalCount, color: "#ef4444" },
          ]}
        />
      </div>

      {/* -- Recent Tickets -- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Recent Tickets</h3>
          <a href="/tickets" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View All →
          </a>
        </div>
        <div className="p-0">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎫</div>
              <p className="text-sm">No tickets yet. Start a conversation!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-25">
                    {["ID", "Query", "Category", "Risk", "Status", "Routing", "Employee"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-3.5 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3.5 py-2.5 font-mono text-xs">{t.id}</td>
                      <td className="px-3.5 py-2.5 text-sm max-w-[200px] truncate">{t.query}</td>
                      <td className="px-3.5 py-2.5"><span className="pill pill-gray">{t.category}</span></td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${t.riskScore >= 76 ? "pill-red" : t.riskScore >= 51 ? "pill-amber" : t.riskScore >= 26 ? "pill-blue" : "pill-green"}`}>
                          {t.riskScore}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${t.status === "resolved" ? "pill-green" : t.status === "escalated" ? "pill-red" : "pill-amber"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`route-tag ${t.routing === "legal" ? "legal" : t.routing === "hr" ? "hr" : "auto"}`}>
                          {t.routing}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-sm">{t.employee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
