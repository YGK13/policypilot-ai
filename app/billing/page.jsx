"use client";

import { useState, useEffect } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import PLANS from "@/lib/data/plans";

// ============================================================================
// BILLING PAGE — 3-tier pricing with Stripe Checkout integration
// Calls /api/billing/checkout to create a Stripe session, then redirects.
// Falls back to demo mode when STRIPE_SECRET_KEY is not configured.
// ============================================================================

function BillingContent() {
  const { addAudit, mode, orgId } = useApp();
  const { addToast } = useToast();
  const [currentPlan, setCurrentPlan] = useState("professional");
  const [loading, setLoading] = useState(null); // which plan is loading

  // -- Load current plan from Neon on mount (source of truth) --
  useEffect(() => {
    const oid = orgId || "default";
    fetch(`/api/billing?orgId=${oid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.plan && !data.error) {
          setCurrentPlan(data.plan);
        }
      })
      .catch(() => {});
  }, [orgId]);

  // -- Check URL params for Stripe success/cancel --
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const plan = params.get("plan");
      if (plan) {
        setCurrentPlan(plan);
        addAudit("PAYMENT_SUCCESS", `Subscribed to ${plan} plan via Stripe`, "success");
        addToast("success", "Payment Successful", `You are now on the ${plan} plan!`);
      }
      // Clean up URL params
      window.history.replaceState({}, "", "/billing");
    }
    if (params.get("canceled") === "true") {
      addToast("info", "Checkout Canceled", "No changes were made to your plan.");
      window.history.replaceState({}, "", "/billing");
    }
  }, [addAudit, addToast]);

  // -- Handle plan upgrade via Stripe Checkout --
  const handleUpgrade = async (plan) => {
    setLoading(plan.id);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          priceInCents: plan.price * 100,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // -- Real Stripe checkout — redirect to hosted page --
        window.location.href = data.url;
        return;
      }

      if (data.demo) {
        // -- Demo mode: no Stripe key configured --
        setCurrentPlan(plan.id);
        addAudit("PLAN_CHANGED", `Switched to ${plan.name} (demo mode — Stripe not configured)`, "info");
        addToast("info", "Demo Mode", data.message);
      } else if (data.error) {
        addToast("error", "Checkout Error", data.error);
      }
    } catch {
      addToast("error", "Network Error", "Could not connect to billing server");
    } finally {
      setLoading(null);
    }
  };

  // -- Employee mode: read-only billing view --
  if (mode === "employee") {
    const plan = PLANS.find((p) => p.id === currentPlan);
    return (
      <div className="p-6 max-w-[600px] mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-8 text-center">
          <div className="text-4xl mb-3">💳</div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Your Organization&apos;s Plan</h2>
          <p className="text-sm text-gray-500 mb-4">Contact your HR admin to manage billing.</p>
          <div className="inline-block bg-brand-50 border border-brand-200 rounded-lg px-6 py-3">
            <p className="text-xl font-bold text-brand-700">{plan?.name || "Professional"}</p>
            <p className="text-sm text-brand-600">${plan?.price.toLocaleString()}/mo</p>
          </div>
        </div>
      </div>
    );
  }

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
          const isLoading = loading === plan.id;

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
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${plan.price.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-500 mt-0.5 shrink-0">{"\u2713"}</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg cursor-default"
                >
                  Current Plan ✓
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isLoading}
                  className={`
                    w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer
                    ${isLoading ? "opacity-60 cursor-wait" : ""}
                    ${isPopular
                      ? "text-white bg-brand-600 hover:bg-brand-700"
                      : "text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100"
                    }
                  `}
                >
                  {isLoading ? "Redirecting to Stripe..." : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ Billing FAQ ============ */}
      <div className="mt-8 max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Billing FAQ</h3>
        <div className="space-y-3 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-700">Can I cancel anytime?</p>
            <p>Yes. Cancel from Settings or email billing@aihrpilot.com. No cancellation fees.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">What payment methods are accepted?</p>
            <p>All major credit cards via Stripe. ACH/wire for Enterprise plans.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Is there a free trial?</p>
            <p>14-day free trial on all plans. No credit card required to start.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return <BillingContent />;
}
