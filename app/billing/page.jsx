"use client";

import { useState } from "react";
import AppShell, { useApp } from "../AppShell";
import PLANS from "@/lib/data/plans";

// ============================================================================
// BILLING PAGE — 3-tier pricing plan grid with current plan selection
// ============================================================================

function BillingContent() {
  const { addAudit } = useApp();
  const [currentPlan, setCurrentPlan] = useState("professional");

  // -- Handle plan selection --
  const selectPlan = (planId) => {
    setCurrentPlan(planId);
    const plan = PLANS.find((p) => p.id === planId);
    addAudit("PLAN_CHANGED", `Switched to ${plan?.name || planId} plan`, "info");
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-lg font-bold text-gray-900">Plans &amp; Billing</h2>
        <p className="text-xs text-gray-500 mt-1">
          Choose the plan that fits your organization
        </p>
      </div>

      {/* ============ Plan Grid ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`
                relative bg-white rounded-xl border shadow-xs p-6 flex flex-col
                transition-all hover:shadow-md
                ${isPopular
                  ? "border-brand-400 ring-2 ring-brand-100"
                  : "border-gray-200"
                }
              `}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${plan.price.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>

              {/* Features list */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-500 mt-0.5 shrink-0">{"\u2713"}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg cursor-default"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => selectPlan(plan.id)}
                  className={`
                    w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors
                    ${isPopular
                      ? "text-white bg-brand-600 hover:bg-brand-700"
                      : "text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100"
                    }
                  `}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <AppShell currentView="billing">
      <BillingContent />
    </AppShell>
  );
}
