"use client";

import AppShell, { useApp } from "../AppShell";
import Toggle from "@/components/ui/Toggle";

// ============================================================================
// SETTINGS PAGE — Company branding + AI behavior config
// ============================================================================

function SettingsContent() {
  const { settings, setSettings } = useApp();

  // -- Helper to update a single settings key --
  const update = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure company branding and AI behavior
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============ Left Column: Company Branding ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {"\u{1F3E2}"} Company Branding
          </h3>

          <div className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
                placeholder="Your company name"
              />
            </div>

            {/* Support Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => update("supportEmail", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
                placeholder="hr@company.com"
              />
            </div>

            {/* Brand Color Picker */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Brand Color
              </label>
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
                  className="w-10 h-10 rounded-lg border border-gray-200"
                  style={{ backgroundColor: settings.primaryColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============ Right Column: AI Behavior ============ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">
            {"\u{1F916}"} AI Behavior
          </h3>

          {/* Toggle switches for boolean settings */}
          <div className="space-y-4 mb-6">
            <Toggle
              enabled={settings.autoRespond}
              onChange={(v) => update("autoRespond", v)}
              label="Auto-Respond"
              description="AI automatically responds to low-risk queries"
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
              description="Enable Slack bot responses"
            />
            <Toggle
              enabled={settings.emailEnabled}
              onChange={(v) => update("emailEnabled", v)}
              label="Email Notifications"
              description="Send email alerts for escalations"
            />
          </div>

          {/* Numeric threshold inputs */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confidence Threshold (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.confidenceThreshold}
                  onChange={(e) => update("confidenceThreshold", parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="w-12 text-center text-sm font-semibold text-gray-700">
                  {settings.confidenceThreshold}%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Below this threshold, responses are escalated to human review
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Auto-Escalate Risk Above
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.autoEscalateAbove}
                  onChange={(e) => update("autoEscalateAbove", parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="w-12 text-center text-sm font-semibold text-gray-700">
                  {settings.autoEscalateAbove}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Queries with risk score above this value are automatically escalated
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell currentView="settings">
      <SettingsContent />
    </AppShell>
  );
}
