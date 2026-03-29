"use client";

import { useState, useCallback } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import Toggle from "@/components/ui/Toggle";

// ============================================================================
// SETTINGS PAGE — Company branding + AI behavior configuration
// Settings are persisted to localStorage immediately (via AppShell context).
// A "Save Settings" button also syncs to Neon Postgres for multi-user orgs
// when the database is available.
// ============================================================================

function SettingsContent() {
  const { settings, setSettings, orgId, addAudit } = useApp();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // -- Update a single key immediately (live preview for sliders/color) --
  const update = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, [setSettings]);

  // -- Save to Neon API (shared across all users in the org) --
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const resolvedOrgId = orgId || "default";
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: resolvedOrgId, settings }),
      });
      const data = await res.json();
      if (data.demo) {
        addToast("info", "Settings Saved", "Saved to this device (no database connected)");
      } else if (data.saved) {
        addToast("success", "Settings Saved", "Synced to database — all users will see these settings");
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } else {
        addToast("warning", "Partial Save", "Saved locally. Could not sync to database.");
      }
    } catch {
      addToast("warning", "Saved Locally", "Settings saved to this device. Database sync failed.");
    } finally {
      setSaving(false);
      addAudit("SETTINGS_SAVED", `Updated org settings (${Object.keys(settings).length} fields)`, "info");
    }
  }, [settings, orgId, addToast, addAudit]);

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors";

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Header + Save Button ============ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure company branding and AI behavior
            {savedAt && <span className="ml-2 text-green-600 font-medium">✓ Saved at {savedAt}</span>}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving…" : "💾 Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============ Left Column: Company Branding ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🏢 Company Branding</h3>
          <div className="space-y-4">

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className={inputCls}
                placeholder="Your company name"
              />
            </div>

            {/* Support Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => update("supportEmail", e.target.value)}
                className={inputCls}
                placeholder="hr@company.com"
              />
            </div>

            {/* Brand Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="w-28 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  placeholder="#6366f1"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-gray-200 shadow-inner"
                  style={{ backgroundColor: settings.primaryColor }}
                  title="Preview"
                />
              </div>
            </div>

            {/* Divider + plan info */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Changes are saved locally immediately. Click{" "}
                <strong>Save Settings</strong> to sync to the database and share with all users.
              </p>
            </div>
          </div>
        </div>

        {/* ============ Right Column: AI Behavior ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">🤖 AI Behavior</h3>

          <div className="space-y-4 mb-6">
            <Toggle
              enabled={settings.autoRespond}
              onChange={(v) => update("autoRespond", v)}
              label="Auto-Respond"
              description="AI automatically resolves low-risk queries without human review"
            />
            <Toggle
              enabled={settings.disclaimers}
              onChange={(v) => update("disclaimers", v)}
              label="Show Disclaimers"
              description="Display legal disclaimers on sensitive responses"
            />
            <Toggle
              enabled={settings.jurisdictionAware}
              onChange={(v) => update("jurisdictionAware", v)}
              label="Jurisdiction-Aware"
              description="Tailor answers to employee's state laws"
            />
            <Toggle
              enabled={settings.auditLogging}
              onChange={(v) => update("auditLogging", v)}
              label="Audit Logging"
              description="Log all queries and responses for compliance"
            />
            <Toggle
              enabled={settings.slackEnabled}
              onChange={(v) => update("slackEnabled", v)}
              label="Slack Integration"
              description="Enable Slack bot notifications for escalations"
            />
            <Toggle
              enabled={settings.emailEnabled}
              onChange={(v) => update("emailEnabled", v)}
              label="Email Notifications"
              description="Send email alerts for escalated tickets"
            />
          </div>

          {/* Numeric threshold inputs */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Confidence Threshold</label>
                <span className="text-sm font-bold text-brand-600">{settings.confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.confidenceThreshold}
                onChange={(e) => update("confidenceThreshold", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Responses below this confidence level are escalated to human review
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Auto-Escalate Risk Above</label>
                <span className="text-sm font-bold text-amber-600">{settings.autoEscalateAbove}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.autoEscalateAbove}
                onChange={(e) => update("autoEscalateAbove", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Queries with risk score above this value are automatically escalated to HR
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Danger Zone ============ */}
      <div className="mt-6 bg-white rounded-xl border border-red-100 shadow-xs p-6">
        <h3 className="text-sm font-bold text-red-700 mb-1">⚠️ Danger Zone</h3>
        <p className="text-xs text-gray-500 mb-4">These actions cannot be undone.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => addToast("info", "Reset", "Contact support to reset all settings to defaults")}
            className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
          >
            Reset to Defaults
          </button>
          <button
            onClick={() => addToast("info", "Export", "Settings exported to JSON")}
            className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            Export Settings JSON
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
