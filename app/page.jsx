"use client";

import { useApp } from "./AppShell";
import StatGrid from "@/components/dashboard/StatGrid";
import BarChart from "@/components/dashboard/BarChart";
import DonutChart from "@/components/dashboard/DonutChart";
import Link from "next/link";

// ============================================================================
// DASHBOARD PAGE — Mode-aware: Admin sees org-wide stats, Employee sees
// personal view with quick actions and only their own tickets.
// ============================================================================

function DashboardContent() {
  const { tickets, employee, mode } = useApp();

  // -- Filter tickets based on mode --
  const visibleTickets =
    mode === "employee"
      ? tickets.filter(
          (t) => t.employee === `${employee.firstName} ${employee.lastName}`
        )
      : tickets;

  const totalTickets = visibleTickets.length;
  const resolved = visibleTickets.filter((t) => t.status === "resolved").length;
  const escalated = visibleTickets.filter(
    (t) => t.status === "escalated" || t.status === "pending"
  ).length;
  const avgRisk = totalTickets
    ? Math.round(visibleTickets.reduce((a, t) => a + t.riskScore, 0) / totalTickets)
    : 0;
  const autoRate = totalTickets ? Math.round((resolved / totalTickets) * 100) : 0;

  // -- Category distribution for bar chart --
  const catCounts = {};
  visibleTickets.forEach((t) => {
    catCounts[t.category] = (catCounts[t.category] || 0) + 1;
  });
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // -- Routing distribution for donut --
  const autoCount = visibleTickets.filter(
    (t) => t.routing === "auto" || t.routing === "auto_enhanced"
  ).length;
  const hrCount = visibleTickets.filter((t) => t.routing === "hr").length;
  const legalCount = visibleTickets.filter((t) => t.routing === "legal").length;

  // ============ EMPLOYEE MODE ============
  if (mode === "employee") {
    const empStats = [
      { icon: "💬", label: "Your Queries", value: totalTickets, cls: "brand" },
      { icon: "✅", label: "Resolved", value: resolved, cls: "green" },
      { icon: "⏳", label: "Pending", value: escalated, cls: "amber" },
      { icon: "🏢", label: "Jurisdiction", value: employee.state, cls: "blue" },
    ];

    return (
      <div className="p-6 max-w-[900px] mx-auto">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-6 mb-6 text-white">
          <h2 className="text-xl font-bold mb-1">
            Welcome, {employee.firstName}!
          </h2>
          <p className="text-brand-100 text-sm">
            {employee.department} · {employee.title} · {employee.state}
          </p>
          <Link
            href="/chat"
            className="mt-4 inline-block bg-white text-brand-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-50 transition-colors"
          >
            Ask HR a Question →
          </Link>
        </div>

        <StatGrid stats={empStats} />

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "PTO Balance", icon: "🏖️", href: "/chat" },
            { label: "Pay Stubs", icon: "💰", href: "/chat" },
            { label: "Benefits", icon: "🏥", href: "/chat" },
            { label: "Policies", icon: "📋", href: "/policies" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="text-2xl mb-1">{a.icon}</div>
              <p className="text-xs font-semibold text-gray-700">{a.label}</p>
            </Link>
          ))}
        </div>

        {/* Recent queries (employee's only) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Your Recent Queries</h3>
          </div>
          {visibleTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm">No queries yet. Ask a question!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    {["ID", "Question", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-3.5 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.slice(0, 5).map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3.5 py-2.5 font-mono text-xs">{t.id}</td>
                      <td className="px-3.5 py-2.5 text-sm max-w-[250px] truncate">{t.query}</td>
                      <td className="px-3.5 py-2.5">
                        <span className={`pill ${t.status === "resolved" ? "pill-green" : "pill-amber"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-gray-400">{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ ADMIN MODE ============
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

      {/* -- Recent Tickets (all employees) -- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Recent Tickets (All Employees)</h3>
          <Link href="/tickets" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View All →
          </Link>
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
