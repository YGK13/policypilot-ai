"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useApp } from "../AppShell";
import POLICIES from "@/lib/data/policies";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import REGULATORY_UPDATES from "@/lib/data/regulatory-updates";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/layout/ToastProvider";

// ============================================================================
// POLICIES PAGE — Three tabs + Review & Implement workflow
// 1. Policy Knowledge Base — with staleness indicators
// 2. Jurisdiction Engine — 12 US states
// 3. Regulatory Updates — feed with REVIEW / AUTO-IMPLEMENT actions
// ============================================================================

const RISK_PILL = { low: "pill-green", medium: "pill-amber", high: "pill-red", critical: "pill-red" };
const IMPACT_PILL = { high: "pill-red", medium: "pill-amber", low: "pill-green" };
const STATUS_PILL = { enacted: "pill-green", enforcing: "pill-amber", guidance: "pill-blue", proposed: "pill-gray" };
const SKIP_KEYS = ["flag"];

function PoliciesContent() {
  const { employee, isAdmin, settings, setSettings, addAudit, addNotification, currentUser, orgId } = useApp();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("policies");
  const [regFilter, setRegFilter] = useState("all");
  // -- Track which updates have been reviewed/implemented --
  const [reviewedUpdates, setReviewedUpdates] = useState(
    () => settings.reviewedUpdates || {}
  );
  // -- Review modal state --
  const [reviewModal, setReviewModal] = useState(null); // null or regulatory update object
  const [reviewNotes, setReviewNotes] = useState("");
  const [autoImplementEnabled, setAutoImplementEnabled] = useState(
    () => settings.autoImplementUpdates || false
  );

  // -- Load reviews from Neon on mount and merge into state --
  useEffect(() => {
    const oid = orgId || "default";
    fetch(`/api/regulatory-reviews?orgId=${oid}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.reviews?.length) return;
        // -- Convert DB rows to in-memory shape { [update_id]: { status, reviewerName, ... } } --
        const dbMap = {};
        data.reviews.forEach((row) => {
          dbMap[row.update_id] = {
            status: row.status,
            reviewedBy: row.reviewer_name,
            reviewedAt: row.created_at,
            notes: row.notes || "",
            affectedPolicies: row.affected_policies || [],
          };
        });
        // -- Merge: DB is authoritative, but don't overwrite session changes --
        setReviewedUpdates((prev) => ({ ...dbMap, ...prev }));
        setSettings((prev) => ({
          ...prev,
          reviewedUpdates: { ...dbMap, ...(prev.reviewedUpdates || {}) },
        }));
      })
      .catch(() => {});
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Fire-and-forget POST to Neon for a single review action --
  const persistOneReview = useCallback((updateId, reviewData, affectedPolicies) => {
    fetch("/api/regulatory-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: orgId || "default",
        updateId,
        status: reviewData.status,
        reviewerName: reviewData.reviewedBy || reviewData.implementedBy || "Admin",
        notes: reviewData.notes || null,
        affectedPolicies: affectedPolicies || reviewData.affectedPolicies || [],
      }),
    }).catch(() => {});
  }, [orgId]);

  // -- Persist reviewed updates and auto-implement setting to settings --
  const persistReviewed = useCallback((updated) => {
    setReviewedUpdates(updated);
    setSettings((prev) => ({ ...prev, reviewedUpdates: updated }));
  }, [setSettings]);

  const persistAutoImplement = useCallback((enabled) => {
    setAutoImplementEnabled(enabled);
    setSettings((prev) => ({ ...prev, autoImplementUpdates: enabled }));
    addAudit(
      "AUTO_IMPLEMENT_TOGGLED",
      `Auto-implement regulatory updates ${enabled ? "enabled" : "disabled"}`,
      enabled ? "warning" : "info"
    );
  }, [setSettings, addAudit]);

  // -- Compute policy staleness --
  const stalePolicies = useMemo(() => {
    const stale = new Map();
    REGULATORY_UPDATES.forEach((update) => {
      // Skip if already reviewed/implemented
      if (reviewedUpdates[update.id]) return;
      (update.affectedPolicies || []).forEach((policyId) => {
        if (!stale.has(policyId) || new Date(update.date) > new Date(stale.get(policyId).date)) {
          stale.set(policyId, update);
        }
      });
    });
    return stale;
  }, [reviewedUpdates]);

  // -- Filter regulatory updates --
  const filteredUpdates = useMemo(() => {
    let list = REGULATORY_UPDATES;
    if (regFilter !== "all") {
      list = list.filter((u) => u.jurisdiction.toLowerCase() === regFilter.toLowerCase());
    }
    return list;
  }, [regFilter]);

  const updateJurisdictions = useMemo(() => {
    return Array.from(new Set(REGULATORY_UPDATES.map((u) => u.jurisdiction))).sort();
  }, []);

  // -- Review a regulatory update: opens modal with details --
  const openReview = useCallback((update) => {
    setReviewModal(update);
    setReviewNotes("");
  }, []);

  // -- Mark as reviewed (admin manually reviewed, no auto-apply) --
  const markReviewed = useCallback((updateId, notes) => {
    const reviewData = {
      status: "reviewed",
      reviewedBy: currentUser?.name || "Admin",
      reviewedAt: new Date().toISOString(),
      notes: notes || "",
    };
    persistReviewed({ ...reviewedUpdates, [updateId]: reviewData });
    persistOneReview(updateId, reviewData, []);
    addAudit("POLICY_REVIEWED", `Regulatory update ${updateId} reviewed by ${currentUser?.name}`, "info");
    addToast("success", "Marked Reviewed", "Policy marked as reviewed — no changes applied.");
    setReviewModal(null);
  }, [reviewedUpdates, currentUser, persistReviewed, persistOneReview, addAudit, addToast]);

  // -- Implement update: applies changes to the AI engine --
  const implementUpdate = useCallback((update, notes) => {
    const reviewData = {
      status: "implemented",
      implementedBy: currentUser?.name || "System (Auto)",
      implementedAt: new Date().toISOString(),
      notes: notes || "Implemented by admin",
      affectedPolicies: update.affectedPolicies,
    };
    persistReviewed({ ...reviewedUpdates, [update.id]: reviewData });
    persistOneReview(update.id, reviewData, update.affectedPolicies);
    addAudit(
      "POLICY_IMPLEMENTED",
      `Regulatory update "${update.title}" implemented. Affected policies: ${(update.affectedPolicies || []).join(", ")}`,
      "success"
    );
    addNotification(
      "Policy Updated",
      `"${update.title}" has been implemented in the AI engine. ${(update.affectedPolicies || []).length} policies updated.`,
      "success"
    );
    addToast("success", "Implemented!", `${(update.affectedPolicies || []).length} policies updated with new regulatory guidance.`);
    setReviewModal(null);
  }, [reviewedUpdates, currentUser, persistReviewed, persistOneReview, addAudit, addNotification, addToast]);

  // -- Auto-implement all pending updates --
  const autoImplementAll = useCallback(() => {
    let count = 0;
    const updated = { ...reviewedUpdates };
    const toPost = [];
    REGULATORY_UPDATES.forEach((u) => {
      if (!updated[u.id]) {
        const reviewData = {
          status: "implemented",
          implementedBy: "System (Auto-Implement)",
          implementedAt: new Date().toISOString(),
          notes: "Automatically implemented per admin settings",
          affectedPolicies: u.affectedPolicies,
        };
        updated[u.id] = reviewData;
        toPost.push({ updateId: u.id, reviewData, affectedPolicies: u.affectedPolicies });
        count++;
      }
    });
    if (count > 0) {
      persistReviewed(updated);
      // -- Persist each to Neon (fire-and-forget) --
      toPost.forEach(({ updateId, reviewData, affectedPolicies }) => {
        persistOneReview(updateId, reviewData, affectedPolicies);
      });
      addAudit("BULK_IMPLEMENT", `Auto-implemented ${count} regulatory updates`, "success");
      addNotification("Bulk Policy Update", `${count} regulatory updates auto-implemented into the AI engine.`, "success");
      addToast("success", "All Updated!", `${count} regulatory updates implemented.`);
    } else {
      addToast("info", "Nothing to update", "All regulatory updates are already reviewed or implemented.");
    }
  }, [reviewedUpdates, persistReviewed, persistOneReview, addAudit, addNotification, addToast]);

  // -- Count pending updates --
  const pendingCount = REGULATORY_UPDATES.filter((u) => !reviewedUpdates[u.id]).length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Auto-Implement Toggle (Admin only) ============ */}
      {isAdmin && (
        <div className="mb-5 flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-xs p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-xl">🤖</div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Auto-Implement Regulatory Updates</h3>
              <p className="text-xs text-gray-500">
                When enabled, new regulatory changes are automatically applied to the AI engine and you&apos;re notified.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={autoImplementAll}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Implement All ({pendingCount})
              </button>
            )}
            <button
              onClick={() => persistAutoImplement(!autoImplementEnabled)}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                autoImplementEnabled ? "bg-brand-600" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={autoImplementEnabled}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                autoImplementEnabled ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* ============ Tab Bar ============ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: "policies", icon: "📖", label: "Policy Knowledge Base" },
          { id: "jurisdictions", icon: "⚖️", label: "Jurisdiction Engine" },
          { id: "updates", icon: "📡", label: `Regulatory Updates`, badge: pendingCount > 0 ? pendingCount : null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-white text-brand-600 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded-full min-w-[16px] text-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ Policies Tab ============ */}
      {activeTab === "policies" && (
        <div className="space-y-3">
          {POLICIES.map((p) => {
            const staleUpdate = stalePolicies.get(p.id);
            const implemented = Object.values(reviewedUpdates).some(
              (r) => r.status === "implemented" && (r.affectedPolicies || []).includes(p.id)
            );
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border shadow-xs p-4 hover:shadow-md transition-shadow ${
                  staleUpdate ? "border-amber-300" : implemented ? "border-green-200" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {p.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className={`pill ${RISK_PILL[p.riskLevel] || "pill-gray"}`}>{p.riskLevel}</span>
                      {staleUpdate && (
                        <span className="pill pill-amber" title={`Affected by: ${staleUpdate.title}`}>
                          ⚠️ Review Needed
                        </span>
                      )}
                      {!staleUpdate && implemented && (
                        <span className="pill pill-green">✓ Up to Date</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <span>📎 {p.source}</span>
                      <span className="text-gray-300">|</span>
                      <span className="pill pill-gray">{p.category}</span>
                    </div>

                    {staleUpdate && (
                      <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between gap-3">
                        <span>
                          <strong>⚠️ Regulatory change:</strong> {staleUpdate.title} ({staleUpdate.jurisdiction}, {staleUpdate.date})
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => openReview(staleUpdate)}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-amber-600 rounded hover:bg-amber-700 cursor-pointer flex-shrink-0"
                          >
                            Review & Implement
                          </button>
                        )}
                      </div>
                    )}

                    {p.escalate && (
                      <div className="mb-2">
                        <span className={`route-tag ${p.escalate === "legal" ? "legal" : "hr"}`}>
                          Escalates to: {p.escalate === "legal" ? "Legal Team" : "HR Business Partner"}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {p.keywords.slice(0, 8).map((kw) => (
                        <span key={kw} className="px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-full">
                          {kw}
                        </span>
                      ))}
                      {p.keywords.length > 8 && (
                        <span className="px-2 py-0.5 text-[10px] font-medium text-gray-400">+{p.keywords.length - 8} more</span>
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
                employee.state === state ? "border-brand-400 ring-2 ring-brand-100" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                <span className="text-2xl">{rules.flag}</span>
                <div>
                  <div className="text-sm font-bold text-gray-900">{state}</div>
                  {employee.state === state && (
                    <span className="text-[10px] font-semibold text-brand-600">Current Employee Jurisdiction</span>
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
                      <span className="text-[11px] text-gray-700 leading-relaxed">{value}</span>
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
          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500">Filter:</span>
            <button
              onClick={() => setRegFilter("all")}
              className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                regFilter === "all" ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
              }`}
            >
              All ({REGULATORY_UPDATES.length})
            </button>
            {updateJurisdictions.map((j) => (
              <button
                key={j}
                onClick={() => setRegFilter(j)}
                className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-colors ${
                  regFilter === j ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                }`}
              >
                {j} ({REGULATORY_UPDATES.filter((u) => u.jurisdiction === j).length})
              </button>
            ))}
          </div>

          {/* Update cards */}
          <div className="space-y-3">
            {filteredUpdates.map((update) => {
              const reviewState = reviewedUpdates[update.id];
              return (
                <div
                  key={update.id}
                  className={`bg-white rounded-xl border shadow-xs p-5 hover:shadow-md transition-shadow ${
                    reviewState?.status === "implemented" ? "border-green-200" :
                    reviewState?.status === "reviewed" ? "border-blue-200" :
                    "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{update.title}</span>
                        {reviewState?.status === "implemented" && (
                          <span className="pill pill-green">✓ Implemented</span>
                        )}
                        {reviewState?.status === "reviewed" && (
                          <span className="pill pill-blue">✓ Reviewed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`pill ${IMPACT_PILL[update.impact]}`}>{update.impact} impact</span>
                        <span className={`pill ${STATUS_PILL[update.status]}`}>{update.status}</span>
                        <span className="pill pill-brand">{update.jurisdiction}</span>
                        <span className="pill pill-gray">{update.category}</span>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{update.summary}</p>

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

                      {/* Review details if already processed */}
                      {reviewState && (
                        <div className={`mb-2 px-3 py-2 rounded-lg text-xs ${
                          reviewState.status === "implemented" ? "bg-green-50 border border-green-200 text-green-800" : "bg-blue-50 border border-blue-200 text-blue-800"
                        }`}>
                          <strong>{reviewState.status === "implemented" ? "✓ Implemented" : "✓ Reviewed"}</strong> by {reviewState.implementedBy || reviewState.reviewedBy} on{" "}
                          {new Date(reviewState.implementedAt || reviewState.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {reviewState.notes && <span> — {reviewState.notes}</span>}
                        </div>
                      )}

                      {/* Source + Date + Actions */}
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>📅 {new Date(update.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                        <span>📎 {update.source}</span>
                        {isAdmin && !reviewState && (
                          <>
                            <button
                              onClick={() => openReview(update)}
                              className="text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                            >
                              📋 Review & Implement
                            </button>
                            <button
                              onClick={() => implementUpdate(update, "Quick-implemented from update feed")}
                              className="text-green-600 hover:text-green-700 font-semibold cursor-pointer"
                            >
                              ⚡ Quick Implement
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredUpdates.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📡</div>
              <p className="text-sm">No regulatory updates for this jurisdiction.</p>
            </div>
          )}
        </div>
      )}

      {/* ============ Review & Implement Modal ============ */}
      {reviewModal && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModal(null)}
          title="Review Regulatory Update"
          size="lg"
          footer={
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => markReviewed(reviewModal.id, reviewNotes)}
                className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
              >
                Mark as Reviewed Only
              </button>
              <button
                onClick={() => implementUpdate(reviewModal, reviewNotes)}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 cursor-pointer"
              >
                ⚡ Implement Now
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Update details */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{reviewModal.title}</h3>
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className={`pill ${IMPACT_PILL[reviewModal.impact]}`}>{reviewModal.impact} impact</span>
                <span className="pill pill-brand">{reviewModal.jurisdiction}</span>
                <span className="pill pill-gray">{reviewModal.category}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{reviewModal.summary}</p>
            </div>

            {/* What will change */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">What Will Change</h4>
              <p className="text-xs text-gray-600 mb-3">
                Implementing this update will update the AI engine&apos;s responses for the following policies.
                Employees asking about these topics will receive answers reflecting the new regulatory guidance.
              </p>
              <div className="space-y-2">
                {(reviewModal.affectedPolicies || []).map((pId) => {
                  const policy = POLICIES.find((p) => p.id === pId);
                  return (
                    <div key={pId} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-amber-600 font-bold text-[10px]">!</span>
                      <span className="font-semibold text-gray-700">
                        {pId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      {policy && <span className="text-gray-400">— {policy.source}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 resize-none"
                placeholder="Add notes about this review, any exceptions, or implementation details..."
              />
            </div>

            {/* Source link */}
            <div className="text-[10px] text-gray-400">
              Source: {reviewModal.source} · {new Date(reviewModal.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function PoliciesPage() {
  return <PoliciesContent />;
}
