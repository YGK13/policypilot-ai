"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/app/AppShell";
import { useToast } from "@/components/layout/ToastProvider";
import CONNECTORS from "@/lib/data/connectors";
import Modal from "@/components/ui/Modal";

// ============================================================================
// INTEGRATIONS PAGE
//
// Two sections, top-to-bottom:
//   1. Live payroll & HRIS sync — Gusto / BambooHR / QBO / Finch. Real
//      OAuth or API-key flows. Config + connection state comes from
//      /api/payroll/status so nothing is hidden or optimistic.
//   2. Directory placeholders — every other provider (Workday, ADP direct,
//      Slack, GitHub, etc.). Saves credentials for future live-sync builds
//      but does not pull data today. Clearly labeled.
// ============================================================================

// -- Provider hex colors for the live-sync cards --
const LIVE_COLORS = {
  gusto:    "#F45D48",
  bamboohr: "#73C41D",
  qbo:      "#2CA01C",
  finch:    "#6C63FF",
};

// -- BambooHR-only credential fields for the API-key connect modal --
const BAMBOOHR_FIELDS = [
  { key: "subdomain", label: "Subdomain", placeholder: "your-company (from your-company.bamboohr.com)", type: "text" },
  { key: "apiKey",    label: "API key",   placeholder: "Bamboo API key",                                 type: "password" },
];

// ============================================================================
// PayrollProvidersSection — the honest live-sync surface
// ============================================================================
function PayrollProvidersSection({ addToast }) {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);   // provider name whose Setup Guide is open
  const [connectingApiKey, setConnectingApiKey] = useState(null); // provider name for the API-key modal

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/status");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      addToast("error", "Could not load payroll provider status", err.message);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const doDisconnect = useCallback(async (name) => {
    if (!window.confirm(`Disconnect ${name}? All synced payroll data for this provider will be wiped from your org within a minute.`)) return;
    try {
      const res = await fetch(`/api/payroll/sync?provider=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Disconnect failed (${res.status})`);
      }
      addToast("success", "Disconnected", `${name} data wiped and connection revoked.`);
      load();
    } catch (err) {
      addToast("error", "Disconnect failed", err.message);
    }
  }, [addToast, load]);

  const doForceSync = useCallback(async (name) => {
    try {
      const res = await fetch(`/api/payroll/sync?provider=${encodeURIComponent(name)}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      addToast("success", "Sync complete",
        `${name}: ${data.stats?.employees || 0} employees, ${data.stats?.paystubs || 0} paystubs.`);
      load();
    } catch (err) {
      addToast("error", "Sync failed", err.message);
    }
  }, [addToast, load]);

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading payroll provider status...
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">Live payroll & HRIS sync</h2>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Real OAuth · Per-org · Read-only
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        These four providers pull employees, paystubs and PTO on a nightly cadence plus webhook updates. Each requires
        one-time setup on the server (developer app + env vars) before the Connect button will work. Missing setup is
        surfaced honestly below with the exact env vars and portal links you need.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(providers || []).map((p) => {
          const serverReady = !!p.config?.ready;
          const connected   = p.connection && p.connection.status === "active";
          const expanded_   = expanded === p.name;
          const color       = LIVE_COLORS[p.name] || "#6b7280";

          // -- Chip states --
          let chip;
          if (!serverReady) {
            chip = { label: "Server setup required", cls: "bg-amber-100 text-amber-800" };
          } else if (!connected) {
            chip = { label: "Ready to connect", cls: "bg-blue-100 text-blue-800" };
          } else if (p.connection?.lastSyncStatus === "error") {
            chip = { label: "Sync failing", cls: "bg-red-100 text-red-800" };
          } else {
            chip = { label: "Connected", cls: "bg-emerald-100 text-emerald-800" };
          }

          return (
            <div key={p.name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              {/* -- Header row: icon, name, chip -- */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {p.label.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900">{p.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5 capitalize">{p.config?.authModel === "api_key" ? "API key" : "OAuth 2.0"}</div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${chip.cls}`}>{chip.label}</span>
              </div>

              {/* -- Connection details -- */}
              {connected && (
                <div className="mb-3 text-xs text-gray-600 space-y-0.5">
                  {p.connection.providerAccount && (
                    <div>Account: <span className="font-mono text-gray-800">{p.connection.providerAccount}</span></div>
                  )}
                  {p.connection.lastSyncAt && (
                    <div>Last synced: {new Date(p.connection.lastSyncAt).toLocaleString()}</div>
                  )}
                  {p.connection.lastSyncError && (
                    <div className="text-red-600">Last error: {p.connection.lastSyncError.slice(0, 100)}</div>
                  )}
                </div>
              )}

              {/* -- Action row -- */}
              <div className="flex flex-wrap gap-2">
                {!serverReady && (
                  <button
                    onClick={() => setExpanded(expanded_ ? null : p.name)}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                  >
                    {expanded_ ? "Hide setup guide" : "Show setup guide"}
                  </button>
                )}
                {serverReady && !connected && p.config.authModel === "oauth2" && (
                  <button
                    onClick={() => { window.location.href = `/api/payroll/oauth/${p.name}`; }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                  >
                    Connect {p.label}
                  </button>
                )}
                {serverReady && !connected && p.config.authModel === "api_key" && (
                  <button
                    onClick={() => setConnectingApiKey(p.name)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                  >
                    Enter {p.label} credentials
                  </button>
                )}
                {connected && (
                  <>
                    <button
                      onClick={() => doForceSync(p.name)}
                      className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100"
                    >
                      Sync now
                    </button>
                    <button
                      onClick={() => doDisconnect(p.name)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      Disconnect + wipe
                    </button>
                  </>
                )}
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Docs ↗
                </a>
              </div>

              {/* -- Expandable setup guide (only meaningful when server-config missing) -- */}
              {expanded_ && !serverReady && (
                <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-700 space-y-3">
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">1. Create a developer app</div>
                    <a href={p.portalUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
                      {p.portalUrl} ↗
                    </a>
                  </div>
                  {p.redirectUriHint && (
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">2. Register this redirect URI in the app</div>
                      <div className="font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1 select-all">
                        {p.redirectUriHint}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {p.redirectUriHint ? "3." : "2."} Set these env vars in Vercel (Production + Preview)
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                      {(p.config?.missing || []).map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">
                      {p.redirectUriHint ? "4." : "3."} Redeploy, then reload this page
                    </div>
                    <div className="text-gray-500">The Connect button will unlock automatically.</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* -- API-key connect modal (BambooHR today; more later) -- */}
      {connectingApiKey && (
        <ApiKeyConnectModal
          providerName={connectingApiKey}
          onClose={() => setConnectingApiKey(null)}
          onConnected={() => { setConnectingApiKey(null); load(); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

// -- Modal specific to BambooHR-style API-key auth. Kept in this file
//    because it is only ever used from the live-sync section above. --
function ApiKeyConnectModal({ providerName, onClose, onConnected, addToast }) {
  const [creds, setCreds] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fields = providerName === "bamboohr" ? BAMBOOHR_FIELDS : [];

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payroll/connect/${encodeURIComponent(providerName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: creds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.reason || data.error || "Credentials rejected");
      addToast("success", `${providerName} connected`, "Credentials validated with the provider.");
      onConnected();
    } catch (err) {
      addToast("error", "Connection failed", err.message);
    } finally {
      setSubmitting(false);
    }
  }, [providerName, creds, addToast, onConnected]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Connect ${providerName}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Validating..." : "Validate & connect"}
          </button>
        </>
      }
    >
      <p className="text-xs text-gray-500 mb-4">
        Credentials are validated with a live call to the provider before being stored. If they fail, nothing is persisted.
      </p>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={creds[f.key] || ""}
              onChange={(e) => setCreds((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}

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
      .catch((err) => console.warn("[Load] Failed:", err.message));
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -- Get connectors for the active tab --
  const connectors = CONNECTORS[activeTab] || [];

  // -- Open config modal for a connector, OR kick off a real OAuth flow
  //    for connectors that have wired one. Gusto is the first live-sync
  //    provider; more (BambooHR, QBO, Finch, Rippling) will follow via the
  //    same `oauthStart` field on the connector definition. --
  const openConfig = useCallback((connector) => {
    if (connector.oauthStart) {
      // Real OAuth: navigate the browser to the initiate route. The route
      // 302s to the provider, the provider redirects back to
      // /api/payroll/oauth/[provider], and that route lands us back on
      // /integrations?payroll=connected. No modal, no client-side token.
      window.location.href = connector.oauthStart;
      return;
    }
    // Legacy cosmetic-credentials modal (Beta banner disclaims this)
    const fields = {};
    connector.fields.forEach((f) => { fields[f] = ""; });
    const syncs = {};
    connector.syncFields.forEach((f) => { syncs[f] = true; });
    setFieldValues(fields);
    setSyncToggles(syncs);
    setConfigModal(connector);
  }, []);

  // -- Surface OAuth callback outcome on return from a provider --
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payroll = params.get("payroll");
    if (!payroll) return;
    const provider = params.get("provider") || "provider";
    if (payroll === "connected") {
      addToast("success", "Payroll Connected", `${provider} is now live-syncing.`);
      setIntegrations((prev) => ({
        ...prev,
        [provider]: { connected: true, connectedAt: new Date().toISOString(), config: {} },
      }));
    } else if (payroll === "error") {
      addToast("error", "Connection Failed", params.get("reason") || `Could not connect ${provider}.`);
    }
    // Clean the URL so a refresh does not re-toast.
    const clean = new URL(window.location.href);
    clean.searchParams.delete("payroll");
    clean.searchParams.delete("provider");
    clean.searchParams.delete("reason");
    window.history.replaceState({}, "", clean.toString());
  }, [addToast, setIntegrations]);

  // -- Connect a connector.
  //    Three paths based on the connector definition:
  //      1. apiKeyConnect  -> POST to the real payroll connect route which
  //         validates credentials against the provider before persisting;
  //         no optimistic update because we need the real 200/422 verdict
  //         before we can claim "connected."
  //      2. oauthStart     -> should never land here (openConfig short-
  //         circuits to a browser redirect before the modal opens); guarded
  //         just in case a future change routes it through.
  //      3. cosmetic       -> legacy /api/integrations flow. Beta banner
  //         disclaims that this only stores config, no live sync. --
  const handleConnect = useCallback(async () => {
    if (!configModal) return;
    const selectedSyncFields = Object.keys(syncToggles).filter((k) => syncToggles[k]);
    const connectorId = configModal.id;
    const connectorName = configModal.name;
    const now = new Date().toISOString();

    // ---- Path 1: real API-key connect (BambooHR today) ----
    if (configModal.apiKeyConnect) {
      try {
        const res = await fetch(configModal.apiKeyConnect, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials: fieldValues }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.reason || data.error || "Connection failed");
        }
        setIntegrations((prev) => ({
          ...prev,
          [connectorId]: { connected: true, connectedAt: now, config: {} },
        }));
        setConfigModal(null);
        addAudit("INTEGRATION_CONNECTED", `Connected ${connectorName}`, "info");
        addToast("success", "Integration Connected", `${connectorName} validated and live.`);
      } catch (err) {
        addToast("error", "Connection Failed", err.message || "Credentials rejected.");
      }
      return;
    }

    // ---- Path 3: legacy cosmetic connect ----
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
      {/* ============ Live payroll & HRIS sync (honest, real backends) ============ */}
      <PayrollProvidersSection addToast={addToast} />

      {/* ============ Directory placeholders banner ============ */}
      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">{"📇"}</span>
          <div>
            <div className="font-semibold text-gray-900">Directory placeholders</div>
            <div className="mt-0.5 text-gray-600">
              The connectors below save credentials to the integrations table for a future live-sync build.
              They do NOT currently pull data. For real payroll/HRIS sync, use Gusto, BambooHR, QuickBooks
              Online or Finch in the section above.
            </div>
          </div>
        </div>
      </div>

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

              {/* -- Feature badges: live sync / webhook / oauth -- */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {c.liveSync && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded">
                    {"● "}Live sync
                  </span>
                )}
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
