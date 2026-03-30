"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "../AppShell";

// ============================================================================
// API KEYS PAGE — Real DB-backed API key management
//
// Keys are generated server-side via crypto.randomBytes.
// Only the SHA-256 hash + prefix are stored in Neon.
// The raw key is shown ONCE at creation time in a reveal modal.
// On revocation, the DB record is updated to status='revoked'.
// ============================================================================

// -- Mask a stored key prefix for display (pp_live_XXXX••••••••XXXX) --
function maskPrefix(prefix) {
  // prefix is like "pp_live_XXXXXXXX" (16 chars) — show it + bullets
  return prefix + "•".repeat(24);
}

// -- cURL quick-start example --
const CURL_EXAMPLE = `curl -X POST https://api.aihrpilot.com/v1/query \\
  -H "Authorization: Bearer pp_live_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is our PTO policy?",
    "employee_id": "EMP001",
    "jurisdiction": "California"
  }'`;

// -- Reveal modal shown exactly once after key creation --
function KeyRevealModal({ rawKey, name, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rawKey]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">✅</div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">API Key Created: {name}</h3>
            <p className="text-xs text-gray-500">Copy this key now — it will never be shown again.</p>
          </div>
        </div>

        {/* Key display */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4 relative">
          <code className="text-green-400 text-xs font-mono break-all leading-relaxed">
            {rawKey}
          </code>
          <button
            onClick={copy}
            className="absolute top-2 right-2 px-2.5 py-1 text-[10px] font-semibold bg-gray-700 text-gray-300 rounded hover:bg-gray-600 hover:text-white transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <p className="text-xs text-amber-800 font-medium">
            ⚠️ This key is shown only once. Store it securely (e.g., in your environment variables or a secrets manager). We cannot retrieve it later.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
        >
          I've saved my key — Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ApiKeysContent() {
  const { addAudit, orgId, user } = useApp();
  const [keys, setKeys] = useState([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealKey, setRevealKey] = useState(null); // { rawKey, name }

  // -- Load keys from Neon on mount --
  useEffect(() => {
    const oid = orgId || "default";
    fetch(`/api/api-keys?orgId=${oid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) setKeys(data.keys);
      })
      .catch(() => {})
      .finally(() => setDbLoaded(true));
  }, [orgId]);

  // -- Create a new API key --
  const createKey = useCallback(async () => {
    const name = newKeyName.trim() || "Untitled Key";
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: orgId || "default", name, createdBy: user?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.record) {
        // -- Add to list (will show masked prefix) --
        setKeys((prev) => [data.record, ...prev]);
        // -- Show the raw key ONCE in modal --
        setRevealKey({ rawKey: data.key, name });
        addAudit("API_KEY_CREATED", `Created API key: ${name}`, "info");
      }
    } catch (err) {
      console.error("createKey error:", err);
    } finally {
      setCreating(false);
      setNewKeyName("");
      setShowCreate(false);
    }
  }, [newKeyName, orgId, user, addAudit]);

  // -- Revoke a key --
  const revokeKey = useCallback(async (keyId, keyName) => {
    // -- Optimistic update --
    setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, status: "revoked", revoked_at: new Date().toISOString() } : k));
    addAudit("API_KEY_REVOKED", `Revoked API key: ${keyName}`, "warning");

    fetch("/api/api-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: orgId || "default", keyId, action: "revoke", revokedBy: user?.name || "Admin" }),
    }).catch(() => {});
  }, [orgId, user, addAudit]);

  const activeCount = keys.filter((k) => k.status === "active").length;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">

      {/* ============ One-time key reveal modal ============ */}
      {revealKey && (
        <KeyRevealModal
          rawKey={revealKey.rawKey}
          name={revealKey.name}
          onClose={() => setRevealKey(null)}
        />
      )}

      {/* ============ Header ============ */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">API Keys</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {dbLoaded ? `${activeCount} active key${activeCount !== 1 ? "s" : ""}` : "Loading…"}
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Key Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !creating) createKey(); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              placeholder="e.g., Production API, Staging, CI/CD..."
              autoFocus
              disabled={creating}
            />
          </div>
          <button
            onClick={createKey}
            disabled={creating}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
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
        {!dbLoaded ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading API keys…</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔑</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">No API keys</h3>
            <p className="text-xs">Create an API key to start integrating with AI HR Pilot</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Name", "Key Prefix", "Created", "Last Used", "Status", ""].map((h) => (
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
                    <td className="px-3.5 py-3 text-sm font-medium text-gray-900">{k.name}</td>

                    {/* Masked key prefix */}
                    <td className="px-3.5 py-3">
                      <code className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {maskPrefix(k.key_prefix)}
                      </code>
                    </td>

                    {/* Created date */}
                    <td className="px-3.5 py-3 text-xs text-gray-500">
                      {k.created_at ? new Date(k.created_at).toLocaleDateString() : "—"}
                    </td>

                    {/* Last used */}
                    <td className="px-3.5 py-3 text-xs text-gray-500">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                    </td>

                    {/* Status pill */}
                    <td className="px-3.5 py-3">
                      <span className={`pill ${k.status === "active" ? "pill-green" : "pill-red"}`}>
                        {k.status}
                      </span>
                    </td>

                    {/* Revoke button */}
                    <td className="px-3.5 py-3">
                      {k.status === "active" && (
                        <button
                          onClick={() => revokeKey(k.id, k.name)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      {k.status === "revoked" && k.revoked_at && (
                        <span className="text-[11px] text-gray-400">
                          Revoked {new Date(k.revoked_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Security Note ============ */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h4 className="text-xs font-bold text-amber-900 mb-1">🔐 Key Security</h4>
        <p className="text-xs text-amber-800">
          API keys are stored as SHA-256 hashes — we never retain the raw key. When you create a key,
          you'll see it exactly once. Store it in your environment variables or a secrets manager.
        </p>
      </div>

      {/* ============ REST API Quick-Start ============ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">🚀 REST API Quick Start</h3>
        <p className="text-xs text-gray-500 mb-3">
          Use your API key to query AI HR Pilot programmatically. All responses include
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
