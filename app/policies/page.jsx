"use client";

import { useState } from "react";
import { useApp } from "../AppShell";
import POLICIES from "@/lib/data/policies";
import JURISDICTIONS from "@/lib/data/jurisdictions";

// ============================================================================
// POLICIES PAGE — Policy Knowledge Base + Jurisdiction Engine tabs
// ============================================================================

// -- Risk level color mapping for pills --
const RISK_PILL = {
  low: "pill-green",
  medium: "pill-amber",
  high: "pill-red",
  critical: "pill-red",
};

// -- Labels to skip in jurisdiction display (shown as header instead) --
const SKIP_KEYS = ["flag"];

function PoliciesContent() {
  const { employee } = useApp();
  const [activeTab, setActiveTab] = useState("policies");

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Tab Bar ============ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "policies"
              ? "bg-white text-brand-600 shadow-xs"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {"\u{1F4D6}"} Policy Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab("jurisdictions")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "jurisdictions"
              ? "bg-white text-brand-600 shadow-xs"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {"\u2696\uFE0F"} Jurisdiction Engine
        </button>
      </div>

      {/* ============ Policies Tab ============ */}
      {activeTab === "policies" && (
        <div className="space-y-3">
          {POLICIES.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* -- Left: policy info -- */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-bold text-gray-900">
                      {p.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className={`pill ${RISK_PILL[p.riskLevel] || "pill-gray"}`}>
                      {p.riskLevel}
                    </span>
                  </div>

                  {/* Source + Category */}
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <span>{"\u{1F4CE}"} {p.source}</span>
                    <span className="text-gray-300">|</span>
                    <span className="pill pill-gray">{p.category}</span>
                  </div>

                  {/* Escalation target (if any) */}
                  {p.escalate && (
                    <div className="mb-2">
                      <span
                        className={`route-tag ${p.escalate === "legal" ? "legal" : "hr"}`}
                      >
                        Escalates to: {p.escalate === "legal" ? "Legal Team" : "HR Business Partner"}
                      </span>
                    </div>
                  )}

                  {/* Keyword tags */}
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
          ))}
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
              {/* -- Header: flag + state name -- */}
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

              {/* -- Key-value pairs for all rules -- */}
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
    </div>
  );
}

export default function PoliciesPage() {
  return <PoliciesContent />;
}
