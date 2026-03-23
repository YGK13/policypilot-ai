"use client";

import { useState, useCallback } from "react";
import { useApp } from "../AppShell";

// ============================================================================
// API KEYS PAGE — Create, list, and revoke API keys + REST quick-start
// ============================================================================

// -- Generate a random API key string --
function generateKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "pp_live_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// -- Mask an API key for display (show first 8 + last 4 chars) --
function maskKey(key) {
  if (key.length <= 12) return key;
  return key.substring(0, 8) + "\u2022".repeat(20) + key.substring(key.length - 4);
}

// -- Initial demo keys --
const INITIAL_KEYS = [
  {
    id: "key_1",
    name: "Production API",
    key: "pp_live_k8Xn2mP9qR4wT6yB0cD3fG5hJ7",
    created: "2026-01-15",
    lastUsed: "2026-03-22",
    status: "active",
  },
  {
    id: "key_2",
    name: "Staging Environment",
    key: "pp_live_aZ1bY2cX3dW4eV5fU6gT7hS8iR9",
    created: "2026-02-01",
    lastUsed: "2026-03-20",
    status: "active",
  },
  {
    id: "key_3",
    name: "CI/CD Pipeline",
    key: "pp_live_mN0oP1qR2sT3uV4wX5yZ6aB7cD8",
    created: "2025-11-10",
    lastUsed: "2025-12-05",
    status: "revoked",
  },
];

// -- cURL quick-start example --
const CURL_EXAMPLE = `curl -X POST https://api.policypilot.ai/v1/query \\
  -H "Authorization: Bearer pp_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is our PTO policy?",
    "employee_id": "EMP001",
    "jurisdiction": "California"
  }'`;

function ApiKeysContent() {
  const { addAudit } = useApp();
  const [keys, setKeys] = useState(INITIAL_KEYS);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  // -- Create a new API key --
  const createKey = useCallback(() => {
    const name = newKeyName.trim() || "Untitled Key";
    const newKey = {
      id: `key_${Date.now()}`,
      name,
      key: generateKey(),
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      status: "active",
    };
    setKeys((prev) => [newKey, ...prev]);
    setNewKeyName("");
    setShowCreate(false);
    addAudit("API_KEY_CREATED", `Created API key: ${name}`, "info");
  }, [newKeyName, addAudit]);

  // -- Revoke an API key --
  const revokeKey = useCallback(
    (keyId) => {
      setKeys((prev) =>
        prev.map((k) => (k.id === keyId ? { ...k, status: "revoked" } : k))
      );
      const key = keys.find((k) => k.id === keyId);
      addAudit("API_KEY_REVOKED", `Revoked API key: ${key?.name || keyId}`, "warning");
    },
    [keys, addAudit]
  );

  const activeCount = keys.filter((k) => k.status === "active").length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* ============ Header ============ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">API Keys</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeCount} active key{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Create Key
        </button>
      </div>

      {/* ============ Create Key Form (inline) ============ */}
      {showCreate && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createKey(); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              placeholder="e.g., Production API, Staging, CI/CD..."
              autoFocus
            />
          </div>
          <button
            onClick={createKey}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Create
          </button>
          <button
            onClick={() => { setShowCreate(false); setNewKeyName(""); }}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ============ Keys List ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mb-6">
        {keys.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">{"\u{1F511}"}</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">No API keys</h3>
            <p className="text-xs">Create an API key to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Name", "Key", "Created", "Last Used", "Status", ""].map((h) => (
                    <th
                      key={h || "actions"}
                      className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide px-3.5 py-2.5"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {/* Name */}
                    <td className="px-3.5 py-3 text-sm font-medium text-gray-900">
                      {k.name}
                    </td>

                    {/* Masked key value */}
                    <td className="px-3.5 py-3">
                      <code className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {maskKey(k.key)}
                      </code>
                    </td>

                    {/* Created date */}
                    <td className="px-3.5 py-3 text-xs text-gray-500">
                      {k.created}
                    </td>

                    {/* Last used */}
                    <td className="px-3.5 py-3 text-xs text-gray-500">
                      {k.lastUsed}
                    </td>

                    {/* Status pill */}
                    <td className="px-3.5 py-3">
                      <span
                        className={`pill ${k.status === "active" ? "pill-green" : "pill-red"}`}
                      >
                        {k.status}
                      </span>
                    </td>

                    {/* Revoke button */}
                    <td className="px-3.5 py-3">
                      {k.status === "active" && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ REST API Quick-Start ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {"\u{1F680}"} REST API Quick Start
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Use your API key to query PolicyPilot programmatically. All responses include
          jurisdiction-specific compliance data.
        </p>
        <div className="relative">
          <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto leading-relaxed font-mono">
            {CURL_EXAMPLE}
          </pre>
          <button
            onClick={() => navigator.clipboard?.writeText(CURL_EXAMPLE)}
            className="absolute top-2 right-2 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-800 rounded hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  return <ApiKeysContent />;
}
