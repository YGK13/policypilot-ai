// ============================================================================
// API: /api/api-keys — CRUD for customer API keys
//
// GET:   List all keys for an org (prefix only — raw key never returned again)
// POST:  Generate a new key — returns raw key ONCE; only hash stored in DB
// PATCH: Revoke a key by ID
//
// Security: raw key generated via crypto.randomBytes; only SHA-256 hash stored.
// ============================================================================

import { NextResponse } from "next/server";
import crypto from "crypto";
import { storeApiKey, getApiKeys, revokeApiKey, isDbAvailable, createAuditEntry } from "@/lib/db";
import { requireRole } from "@/lib/auth/rbac";

// ============================================================================
// GET /api/api-keys?orgId=xxx
// ============================================================================
export async function GET(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId") || "default";

  if (!isDbAvailable()) {
    return NextResponse.json({ keys: [], demo: true });
  }

  try {
    const keys = await getApiKeys(orgId);
    return NextResponse.json({ keys });
  } catch (err) {
    console.error("[API] getApiKeys error:", err);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

// ============================================================================
// POST /api/api-keys
// Body: { orgId, name, createdBy? }
// Returns: { key } — raw key shown ONCE, then never again
// ============================================================================
export async function POST(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { orgId, name, createdBy } = body;

    if (!orgId || !name) {
      return NextResponse.json({ error: "Missing required fields: orgId, name" }, { status: 400 });
    }

    // -- Generate a cryptographically secure random key --
    const rawKey = `pp_live_${crypto.randomBytes(20).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 16); // "pp_live_XXXXXXXX"

    // -- Store hash + prefix only; raw key is never persisted --
    if (!isDbAvailable()) {
      // Demo mode: return a fake key record
      return NextResponse.json({
        key: rawKey,
        record: { id: `demo_${Date.now()}`, name, key_prefix: keyPrefix, status: "active", created_at: new Date().toISOString() },
        demo: true,
      }, { status: 201 });
    }

    const record = await storeApiKey(orgId, name, keyHash, keyPrefix, createdBy || null);

    // -- Audit log entry --
    createAuditEntry(orgId, {
      userName: createdBy || "System",
      userRole: "hr_admin",
      action: "API_KEY_CREATED",
      detail: `Created API key: ${name}`,
      level: "info",
    }).catch(() => {});

    return NextResponse.json({ key: rawKey, record }, { status: 201 });
  } catch (err) {
    console.error("[API] createApiKey error:", err);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

// ============================================================================
// PATCH /api/api-keys
// Body: { orgId, keyId, action: "revoke" }
// ============================================================================
export async function PATCH(request) {
  const guard = await requireRole("hr_admin");
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { orgId, keyId, action, revokedBy } = body;

    if (!orgId || !keyId || action !== "revoke") {
      return NextResponse.json({ error: "Missing required fields: orgId, keyId, action='revoke'" }, { status: 400 });
    }

    if (!isDbAvailable()) {
      return NextResponse.json({ demo: true });
    }

    const updated = await revokeApiKey(orgId, keyId);

    createAuditEntry(orgId, {
      userName: revokedBy || "System",
      userRole: "hr_admin",
      action: "API_KEY_REVOKED",
      detail: `Revoked API key ID: ${keyId}`,
      level: "warning",
    }).catch(() => {});

    return NextResponse.json({ key: updated });
  } catch (err) {
    console.error("[API] revokeApiKey error:", err);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
