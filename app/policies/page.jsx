"use client";

import { useState, useMemo } from "react";
import { useApp } from "../AppShell";
import POLICIES from "@/lib/data/policies";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import REGULATORY_UPDATES from "@/lib/data/regulatory-updates";

// ============================================================================
// POLICIES PAGE — Three tabs:
// 1. Policy Knowledge Base — all 18 policies with keywords and risk levels
// 2. Jurisdiction Engine — 12 US jurisdictions with state-specific laws
// 3. Regulatory Updates — feed of recent law changes with policy staleness
// ============================================================================

const RISK_PILL = {
  low: "pill-green",
  medium: "pill-amber",
  high: "pill-red",
  critical: "pill-red",
};

const IMPACT_PILL = {
  high: "pill-red",
  medium: "pill-amber",
  low: "pill-green",
};

const STATUS_PILL = {
  enacted: "pill-green",
  enforcing: "pill-amber",
  guidance: "pill-blue",
  proposed: "pill-gray",
};

const SKIP_KEYS = ["flag"];

function PoliciesContent() {
  const { employee, mode, addAudit } = useApp();
  const [activeTab, setActiveTab] = useState("policies");
  const [regFilter, setRegFilter] = useState("all"); // all, federal, or state name

  // -- Compute policy staleness: policies affected by recent regulatory updates --
  const stalePolicies = useMemo(() => {
    const stale = new Map();
    REGULATORY_UPDATES.forEach((update) => {
      (update.affectedPolicies || []).forEach((policyId) => {
        if (!stale.has(policyId) || new Date(update.date) > new Date(stale.get(policyId).date)) {
          stale.set(policyId, update);
        }
      });
    });
    return stale;
  }, []);

  // -- Filter regulatory updates --
  const filteredUpdates = useMemo(() => {
    if (regFilter === "all") return REGULATORY_UPDATES;
    return REGULATORY_UPDATES.filter(
      (u) => u.jurisdiction.toLowerCase() === regFilter.toLowerCase()
    );
  }, [regFilter]);

  // -- Unique jurisdictions from updates for filter --
  const updateJurisdictions = useMemo(() => {
    const set = new Set(REGULATORY_UPDATES.map((u) => u.jurisdiction));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Tab Bar ============ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: "policies", icon: "📖", label: "Policy Knowledge Base" },
          { id: "jurisdictions", icon: "⚖️", label: "Jurisdiction Engine" },
          { id: "updates", icon: "📡", label: `Regulatory Updates (${REGULATORY_UPDATES.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-white text-brand-600 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ============ Policies Tab ============ */}
      {activeTab === "policies" && (
        <div className="space-y-3">
          {POLICIES.map((p) => {
            const staleUpdate = stalePolicies.get(p.id);
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border shadow-xs p-4 hover:shadow-md transition-shadow ${
                  staleUpdate ? "border-amber-300" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {p.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className={`pill ${RISK_PILL[p.riskLevel] || "pill-gray"}`}>
                        {p.riskLevel}
                      </span>
                      {/* -- Staleness warning if a regulatory update affects this policy -- */}
                      {staleUpdate && (
                        <span className="pill pill-amber" title={`Affected by: ${staleUpdate.title}`}>
                          ⚠️ Review Needed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <span>📎 {p.source}</span>
                      <span className="text-gray-300">|</span>
                      <span className="pill pill-gray">{p.category}</span>
                    </div>

                    {/* -- Staleness detail -- */}
                    {staleUpdate && (
                      <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <strong>⚠️ Regulatory change:</strong> {staleUpdate.title} ({staleUpdate.jurisdiction}, {staleUpdate.date})
                      </div>
                    )}

                    {p.escalate && (
                      <div className="mb-2">
                        <span
                          className={`route-tag ${p.escalate === "legal" ? "legal" : "hr"}`}
                        >
                          Escalates to: {p.escalate === "legal" ? "Legal Team" : "HR Business Partner"}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {p.keywords.slice(0, 8).map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-full"
                        >
                          {kw}
                        </span>
                      ))}
                      {p.keywords.length > 8 && (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-gray-400">
                          +{p.keywords.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ Jurisdictions Tab ============ */}
      {activeTab === "jurisdictions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(JURISDICTIONS).map(([state, rules]) => (
            <div
              key={state}
              className={`bg-white rounded-xl border shadow-xs p-5 hover:shadow-md transition-shadow ${
                employee.state === state
                  ? "border-brand-400 ring-2 ring-brand-100"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                <span className="text-2xl">{rules.flag}</span>
                <div>
                  <div className="text-sm font-bold text-gray-900">{state}</div>
                  {employee.state === state && (
                    <span className="text-[10px] font-semibold text-brand-600">
                      Current Employee Jurisdiction
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(rules)
                  .filter(([key]) => !SKIP_KEYS.includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap min-w-[90px]">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </span>
                      <span className="text-[11px] text-gray-700 leading-relaxed">
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ Regulatory Updates Tab ============ */}
      {activeTab === "updates" && (
        <div>
          {/* -- Filter bar -- */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Filter:</span>
            <button
              onClick={() => setRegFilter("all")}
              className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                regFilter === "all"
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
              }`}
            >
              All ({REGULATORY_UPDATES.length})
            </button>
            {updateJurisdictions.map((j) => (
              <button
                key={j}
                onClick={() => setRegFilter(j)}
                className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                  regFilter === j
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                }`}
              >
                {j} ({REGULATORY_UPDATES.filter((u) => u.jurisdiction === j).length})
              </button>
            ))}
          </div>

          {/* -- Update cards -- */}
          <div className="space-y-3">
            {filteredUpdates.map((update) => (
              <div
                key={update.id}
                className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* -- Header: title + badges -- */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{update.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`pill ${IMPACT_PILL[update.impact]}`}>
                        {update.impact} impact
                      </span>
                      <span className={`pill ${STATUS_PILL[update.status]}`}>
                        {update.status}
                      </span>
                      <span className="pill pill-brand">{update.jurisdiction}</span>
                      <span className="pill pill-gray">{update.category}</span>
                    </div>

                    {/* -- Summary -- */}
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {update.summary}
                    </p>

                    {/* -- Affected policies -- */}
                    {update.affectedPolicies && update.affectedPolicies.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Affects:</span>
                        {update.affectedPolicies.map((pId) => (
                          <span key={pId} className="px-2 py-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                            {pId.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* -- Source + Date -- */}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span>📅 {new Date(update.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      <span>📎 {update.source}</span>
                      {mode === "admin" && (
                        <button
                          onClick={() => {
                            addAudit("REG_REVIEWED", `Marked as reviewed: ${update.title}`, "info");
                          }}
                          className="text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                        >
                          ✓ Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUpdates.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📡</div>
              <p className="text-sm">No regulatory updates for this jurisdiction.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PoliciesPage() {
  return <PoliciesContent />;
}
