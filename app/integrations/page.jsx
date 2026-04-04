"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "../AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import CONNECTORS from "@/lib/data/connectors";
import Modal from "@/components/ui/Modal";

// ============================================================================
// INTEGRATIONS PAGE — Categorized connector grid with config modals
// ============================================================================

// -- Category tab definitions with display labels --
const CATEGORIES = [
  { key: "hris", label: "HRIS / HCM" },
  { key: "ats", label: "ATS" },
  { key: "communication", label: "Communication" },
  { key: "storage", label: "Storage" },
  { key: "identity", label: "Identity / SSO" },
  { key: "devops", label: "DevOps" },
  { key: "billing", label: "Billing" },
];

function IntegrationsContent() {
  const { integrations, setIntegrations, addAudit, orgId, currentUser } = useApp();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("hris");
  const [configModal, setConfigModal] = useState(null); // connector object or null
  const [fieldValues, setFieldValues] = useState({});
  const [syncToggles, setSyncToggles] = useState({});

  // -- Load persisted integration state from Neon on mount --
  // Converts DB rows { connector_id, status } into context shape { [id]: { connected: bool } }
  useEffect(() => {
    const oid = orgId || "default";
    fetch(`/api/integrations?orgId=${oid}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.integrations?.length) return;
        const merged = {};
        data.integrations.forEach((row) => {
          if (row.status === "connected") {
            merged[row.connector_id] = {
              connected: true,
              connectedAt: row.last_sync_at || row.created_at,
              config: row.config || {},
            };
          }
        });
        // DB state is authoritative on mount — overrides in-memory defaults
        if (Object.keys(merged).length) {
          setIntegrations((prev) => ({ ...prev, ...merged }));
        }
      })
      .catch(() => {});
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Get connectors for the active tab --
  const connectors = CONNECTORS[activeTab] || [];

  // -- Open config modal for a connector --
  const openConfig = useCallback((connector) => {
    // Pre-populate field values and sync toggles
    const fields = {};
    connector.fields.forEach((f) => { fields[f] = ""; });
    const syncs = {};
    connector.syncFields.forEach((f) => { syncs[f] = true; });
    setFieldValues(fields);
    setSyncToggles(syncs);
    setConfigModal(connector);
  }, []);

  // -- Connect a connector: optimistic + awaited + rollback on failure --
  const handleConnect = useCallback(async () => {
    if (!configModal) return;
    const now = new Date().toISOString();
    const selectedSyncFields = Object.keys(syncToggles).filter((k) => syncToggles[k]);
    const connectorId = configModal.id;
    const connectorName = configModal.name;

    // -- Optimistic update --
    setIntegrations((prev) => ({
      ...prev,
      [connectorId]: { connected: true, connectedAt: now, config: fieldValues },
    }));
    setConfigModal(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgId || "default",
          connectorId,
          status: "connected",
          config: fieldValues,
          syncFields: selectedSyncFields,
          actor: currentUser?.name || "Admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      addAudit("INTEGRATION_CONNECTED", `Connected ${connectorName}`, "info");
      addToast("success", "Integration Connected", `${connectorName} is now active`);
    } catch (err) {
      // -- Rollback: remove the optimistic connection --
      setIntegrations((prev) => {
        const next = { ...prev };
        delete next[connectorId];
        return next;
      });
      addToast("error", "Connection Failed", err.message || "Could not save to database");
    }
  }, [configModal, syncToggles, fieldValues, orgId, currentUser, setIntegrations, addAudit, addToast]);

  // -- Disconnect a connector: optimistic + awaited + rollback on failure --
  const handleDisconnect = useCallback(
    async (connectorId, connectorName) => {
      const prevState = integrations[connectorId]; // snapshot before removal

      // -- Optimistic removal --
      setIntegrations((prev) => {
        const next = { ...prev };
        delete next[connectorId];
        return next;
      });

      try {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: orgId || "default",
            connectorId,
            status: "disconnected",
            actor: currentUser?.name || "Admin",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Disconnect failed");

        addAudit("INTEGRATION_DISCONNECTED", `Disconnected ${connectorName}`, "warning");
        addToast("info", "Integration Disconnected", `${connectorName} has been removed`);
      } catch (err) {
        // -- Rollback: restore previous connection state --
        if (prevState) {
          setIntegrations((prev) => ({ ...prev, [connectorId]: prevState }));
        }
        addToast("error", "Disconnect Failed", err.message || "Could not save to database");
      }
    },
    [integrations, orgId, currentUser, setIntegrations, addAudit, addToast]
  );

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Category Tab Bar ============ */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`
              px-4 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-all
              ${activeTab === cat.key
                ? "bg-white text-brand-600 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            {cat.label}
            <span className="ml-1.5 text-[10px] text-gray-400">
              ({(CONNECTORS[cat.key] || []).length})
            </span>
          </button>
        ))}
      </div>

      {/* ============ Connector Grid ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => {
          const isConnected = !!integrations[c.id]?.connected;
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 hover:shadow-md transition-shadow"
            >
              {/* -- Header: icon + name -- */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: c.color }}
                >
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
                </div>
              </div>

              {/* -- Sync fields as pill-outline badges -- */}
              <div className="flex flex-wrap gap-1 mb-3">
                {c.syncFields.map((sf) => (
                  <span
                    key={sf}
                    className="px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200 rounded-full"
                  >
                    {sf}
                  </span>
                ))}
              </div>

              {/* -- Feature badges: webhook / oauth -- */}
              <div className="flex items-center gap-2 mb-4">
                {c.webhooks && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded">
                    Webhooks
                  </span>
                )}
                {c.oauth && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded">
                    OAuth 2.0
                  </span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-50 text-gray-500 rounded">
                  {c.pricing}
                </span>
              </div>

              {/* -- Connect / Disconnect button -- */}
              {isConnected ? (
                <div className="flex gap-2">
                  <span className="flex-1 px-3 py-2 text-xs font-semibold text-center text-green-700 bg-green-50 border border-green-200 rounded-lg">
                    {"\u2705"} Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect(c.id, c.name)}
                    className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openConfig(c)}
                  className="w-full px-3 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ Config Modal ============ */}
      {configModal && (
        <Modal
          isOpen={!!configModal}
          onClose={() => setConfigModal(null)}
          title={`Connect ${configModal.name}`}
          size="lg"
          footer={
            <>
              <button
                onClick={() => setConfigModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Connect {configModal.name}
              </button>
            </>
          }
        >
          {/* -- OAuth button if supported -- */}
          {configModal.oauth && (
            <div className="mb-5">
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ backgroundColor: configModal.color }}
                >
                  {configModal.name.substring(0, 1)}
                </span>
                Sign in with {configModal.name}
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or configure manually</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          )}

          {/* -- API key / credential fields -- */}
          <div className="space-y-3 mb-5">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Credentials
            </h4>
            {configModal.fields.map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s) => s.toUpperCase())}
                </label>
                <input
                  type={field.toLowerCase().includes("secret") || field.toLowerCase().includes("password") ? "password" : "text"}
                  value={fieldValues[field] || ""}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                  placeholder={`Enter ${field}`}
                />
              </div>
            ))}
          </div>

          {/* -- Sync field toggles -- */}
          <div className="space-y-2 mb-5">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Sync Fields
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {configModal.syncFields.map((sf) => (
                <label
                  key={sf}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={syncToggles[sf] ?? true}
                    onChange={(e) =>
                      setSyncToggles((prev) => ({ ...prev, [sf]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-medium text-gray-700">{sf}</span>
                </label>
              ))}
            </div>
          </div>

          {/* -- Webhook URL (if supported) -- */}
          {configModal.webhooks && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Webhook URL
              </h4>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`https://api.aihrpilot.com/webhooks/${configModal.id}`}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `https://api.aihrpilot.com/webhooks/${configModal.id}`
                    );
                  }}
                  className="px-3 py-2 text-xs font-semibold text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}
