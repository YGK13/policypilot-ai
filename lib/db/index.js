// ============================================================================
// DATABASE CLIENT — Neon serverless Postgres connection
//
// Uses @neondatabase/serverless for connection pooling.
// Falls back to in-memory mock when DATABASE_URL is not set (demo mode).
// ============================================================================

import { neon } from "@neondatabase/serverless";

// -- Create a SQL tagged template function from the connection string --
// In production: DATABASE_URL is auto-provisioned by Vercel Marketplace.
// In demo mode: returns null, and callers should use localStorage fallback.
let sql = null;

if (process.env.DATABASE_URL) {
  sql = neon(process.env.DATABASE_URL);
}

// -- Check if database is available --
export function isDbAvailable() {
  return sql !== null;
}

// -- Get the SQL client (throws if not available) --
export function getDb() {
  if (!sql) {
    throw new Error(
      "DATABASE_URL not configured. Install Neon from Vercel Marketplace: " +
      "vercel integration add neon"
    );
  }
  return sql;
}

// ============================================================================
// TICKET QUERIES
// ============================================================================

export async function createTicket(orgId, ticket) {
  if (!sql) return ticket; // demo mode fallback
  const result = await sql`
    INSERT INTO tickets (id, org_id, user_id, query, category, risk_score, routing, status, priority, assignee, department, state, flags, resolution, ai_response, ai_confidence, policy_id)
    VALUES (${ticket.id}, ${orgId}, ${ticket.userId || null}, ${ticket.query}, ${ticket.category}, ${ticket.riskScore}, ${ticket.routing}, ${ticket.status}, ${ticket.priority}, ${ticket.assignee}, ${ticket.department}, ${ticket.state}, ${JSON.stringify(ticket.flags || [])}, ${ticket.resolution}, ${ticket.aiResponse || null}, ${ticket.aiConfidence || null}, ${ticket.policyId || null})
    RETURNING *
  `;
  return result[0];
}

export async function getTickets(orgId, { status, userId, limit = 50, offset = 0 } = {}) {
  if (!sql) return []; // demo mode
  // -- JOIN users to get employee_name for display in the dashboard --
  if (status && userId) {
    return sql`
      SELECT t.*, u.name AS employee_name
      FROM tickets t LEFT JOIN users u ON t.user_id = u.id
      WHERE t.org_id = ${orgId} AND t.status = ${status} AND t.user_id = ${userId}
      ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }
  if (status) {
    return sql`
      SELECT t.*, u.name AS employee_name
      FROM tickets t LEFT JOIN users u ON t.user_id = u.id
      WHERE t.org_id = ${orgId} AND t.status = ${status}
      ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }
  if (userId) {
    return sql`
      SELECT t.*, u.name AS employee_name
      FROM tickets t LEFT JOIN users u ON t.user_id = u.id
      WHERE t.org_id = ${orgId} AND t.user_id = ${userId}
      ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }
  return sql`
    SELECT t.*, u.name AS employee_name
    FROM tickets t LEFT JOIN users u ON t.user_id = u.id
    WHERE t.org_id = ${orgId}
    ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}
  `;
}

// ============================================================================
// PAYROLL QUERIES
// All are scoped by orgId. Encrypted token fields are opaque strings here;
// encrypt/decrypt happen in lib/payroll/index.js.
// ============================================================================

// -- Upsert the (org, provider) connection row. Called from the OAuth callback
//    and again from every token refresh. --
export async function upsertPayrollConnection(orgId, provider, fields) {
  if (!sql) return null;
  const result = await sql`
    INSERT INTO payroll_connections
      (org_id, provider, provider_account_id, status, scope,
       access_token_enc, refresh_token_enc, token_expires_at, webhook_secret_enc,
       connected_by_user_id, updated_at)
    VALUES
      (${orgId}, ${provider}, ${fields.providerAccountId || null}, ${fields.status || 'active'}, ${fields.scope || null},
       ${fields.accessTokenEnc || null}, ${fields.refreshTokenEnc || null}, ${fields.tokenExpiresAt || null}, ${fields.webhookSecretEnc || null},
       ${fields.connectedByUserId || null}, NOW())
    ON CONFLICT (org_id, provider) DO UPDATE SET
      provider_account_id = COALESCE(EXCLUDED.provider_account_id, payroll_connections.provider_account_id),
      status              = EXCLUDED.status,
      scope               = COALESCE(EXCLUDED.scope, payroll_connections.scope),
      access_token_enc    = EXCLUDED.access_token_enc,
      refresh_token_enc   = COALESCE(EXCLUDED.refresh_token_enc, payroll_connections.refresh_token_enc),
      token_expires_at    = EXCLUDED.token_expires_at,
      webhook_secret_enc  = COALESCE(EXCLUDED.webhook_secret_enc, payroll_connections.webhook_secret_enc),
      connected_by_user_id= COALESCE(EXCLUDED.connected_by_user_id, payroll_connections.connected_by_user_id),
      updated_at          = NOW()
    RETURNING *
  `;
  return result[0];
}

export async function getPayrollConnection(orgId, provider) {
  if (!sql) return null;
  const rows = await sql`
    SELECT * FROM payroll_connections
    WHERE org_id = ${orgId} AND provider = ${provider}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function markPayrollSync(orgId, provider, status, error = null) {
  if (!sql) return null;
  await sql`
    UPDATE payroll_connections
    SET last_sync_at = NOW(), last_sync_status = ${status}, last_sync_error = ${error}
    WHERE org_id = ${orgId} AND provider = ${provider}
  `;
}

// -- Upsert one normalized employee row. Returns the DB id. --
export async function upsertPayrollEmployee(orgId, provider, e) {
  if (!sql) return null;
  // -- Best-effort link to a users row by email in the same org. --
  let linkedUserId = null;
  if (e.workEmail) {
    const u = await sql`
      SELECT id FROM users WHERE org_id = ${orgId} AND LOWER(email) = LOWER(${e.workEmail}) LIMIT 1
    `;
    linkedUserId = u[0]?.id || null;
  }
  const result = await sql`
    INSERT INTO payroll_employees
      (org_id, provider, provider_employee_id, linked_user_id,
       full_name, work_email, department, title, manager_provider_id,
       employment_type, hire_date, termination_date,
       work_location, work_state, comp_rate, comp_currency, pay_frequency, raw, synced_at)
    VALUES
      (${orgId}, ${provider}, ${e.providerEmployeeId}, ${linkedUserId},
       ${e.fullName}, ${e.workEmail}, ${e.department}, ${e.title}, ${e.managerProviderId},
       ${e.employmentType}, ${e.hireDate}, ${e.terminationDate},
       ${e.workLocation}, ${e.workState}, ${e.compRate}, ${e.compCurrency}, ${e.payFrequency},
       ${JSON.stringify(e.raw || {})}, NOW())
    ON CONFLICT (org_id, provider, provider_employee_id) DO UPDATE SET
      linked_user_id      = COALESCE(EXCLUDED.linked_user_id, payroll_employees.linked_user_id),
      full_name           = EXCLUDED.full_name,
      work_email          = EXCLUDED.work_email,
      department          = EXCLUDED.department,
      title               = EXCLUDED.title,
      manager_provider_id = EXCLUDED.manager_provider_id,
      employment_type     = EXCLUDED.employment_type,
      hire_date           = EXCLUDED.hire_date,
      termination_date    = EXCLUDED.termination_date,
      work_location       = EXCLUDED.work_location,
      work_state          = EXCLUDED.work_state,
      comp_rate           = EXCLUDED.comp_rate,
      comp_currency       = EXCLUDED.comp_currency,
      pay_frequency       = EXCLUDED.pay_frequency,
      raw                 = EXCLUDED.raw,
      synced_at           = NOW()
    RETURNING id
  `;
  return result[0]?.id;
}

export async function findPayrollEmployeeDbId(orgId, provider, providerEmployeeId) {
  if (!sql) return null;
  const rows = await sql`
    SELECT id FROM payroll_employees
    WHERE org_id = ${orgId} AND provider = ${provider} AND provider_employee_id = ${providerEmployeeId}
    LIMIT 1
  `;
  return rows[0]?.id || null;
}

export async function upsertPayrollPaystub(orgId, provider, payrollEmployeeDbId, p) {
  if (!sql) return null;
  await sql`
    INSERT INTO payroll_paystubs
      (org_id, payroll_employee_id, provider, provider_paystub_id,
       pay_date, period_start, period_end,
       gross_pay, net_pay, federal_withholding, state_withholding,
       fica, benefit_deductions, other_deductions, raw, synced_at)
    VALUES
      (${orgId}, ${payrollEmployeeDbId}, ${provider}, ${p.providerPaystubId},
       ${p.payDate}, ${p.periodStart}, ${p.periodEnd},
       ${p.grossPay}, ${p.netPay}, ${p.federalWithholding}, ${p.stateWithholding},
       ${p.fica}, ${p.benefitDeductions}, ${p.otherDeductions},
       ${JSON.stringify(p.raw || {})}, NOW())
    ON CONFLICT (org_id, provider, provider_paystub_id) DO UPDATE SET
      pay_date             = EXCLUDED.pay_date,
      period_start         = EXCLUDED.period_start,
      period_end           = EXCLUDED.period_end,
      gross_pay            = EXCLUDED.gross_pay,
      net_pay              = EXCLUDED.net_pay,
      federal_withholding  = EXCLUDED.federal_withholding,
      state_withholding    = EXCLUDED.state_withholding,
      fica                 = EXCLUDED.fica,
      benefit_deductions   = EXCLUDED.benefit_deductions,
      other_deductions     = EXCLUDED.other_deductions,
      raw                  = EXCLUDED.raw,
      synced_at            = NOW()
  `;
}

export async function upsertPayrollPtoBalance(orgId, payrollEmployeeDbId, b) {
  if (!sql) return null;
  await sql`
    INSERT INTO payroll_pto_balances
      (org_id, payroll_employee_id, provider, policy_name,
       accrued_hours, used_hours, balance_hours, as_of, raw, synced_at)
    VALUES
      (${orgId}, ${payrollEmployeeDbId}, ${b.provider}, ${b.policyName},
       ${b.accruedHours}, ${b.usedHours}, ${b.balanceHours}, ${b.asOf},
       ${JSON.stringify(b.raw || {})}, NOW())
    ON CONFLICT (org_id, payroll_employee_id, policy_name) DO UPDATE SET
      accrued_hours = EXCLUDED.accrued_hours,
      used_hours    = EXCLUDED.used_hours,
      balance_hours = EXCLUDED.balance_hours,
      as_of         = EXCLUDED.as_of,
      raw           = EXCLUDED.raw,
      synced_at     = NOW()
  `;
}

// -- Idempotency check + record for a webhook event. Returns true if this is
//    the first time we have seen this (provider, provider_event_id). --
export async function claimPayrollWebhookEvent(orgId, provider, providerEventId, eventType) {
  if (!sql) return true;
  const result = await sql`
    INSERT INTO payroll_webhook_events
      (org_id, provider, provider_event_id, event_type, status)
    VALUES
      (${orgId}, ${provider}, ${providerEventId}, ${eventType}, 'received')
    ON CONFLICT (provider, provider_event_id) DO NOTHING
    RETURNING id
  `;
  return result.length > 0;
}

export async function markPayrollWebhookProcessed(provider, providerEventId, status, error = null) {
  if (!sql) return null;
  await sql`
    UPDATE payroll_webhook_events
    SET status = ${status}, error = ${error}, processed_at = NOW()
    WHERE provider = ${provider} AND provider_event_id = ${providerEventId}
  `;
}

// -- Wipe every payroll_* row for (org, provider). Called when the admin
//    disconnects the provider. Cascades via foreign keys. --
export async function deletePayrollData(orgId, provider) {
  if (!sql) return null;
  await sql`DELETE FROM payroll_employees WHERE org_id = ${orgId} AND provider = ${provider}`;
  await sql`DELETE FROM payroll_connections WHERE org_id = ${orgId} AND provider = ${provider}`;
}

// -- Single-ticket fetch for ownership checks. Scoped by orgId so a ticket
//    from org A can never leak into an ownership decision in org B. --
export async function getTicketById(orgId, ticketId) {
  if (!sql) return null;
  const result = await sql`
    SELECT * FROM tickets WHERE id = ${ticketId} AND org_id = ${orgId} LIMIT 1
  `;
  return result[0] || null;
}

export async function updateTicketStatus(orgId, ticketId, status, resolution) {
  if (!sql) return null;
  const result = await sql`
    UPDATE tickets SET status = ${status}, resolution = ${resolution}, updated_at = NOW(), resolved_at = ${status === 'resolved' ? new Date().toISOString() : null}
    WHERE id = ${ticketId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

export async function updateTicketSatisfaction(orgId, ticketId, satisfaction) {
  if (!sql) return null;
  const result = await sql`
    UPDATE tickets SET satisfaction = ${satisfaction}, updated_at = NOW()
    WHERE id = ${ticketId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

export async function createAuditEntry(orgId, entry) {
  if (!sql) return entry;
  const result = await sql`
    INSERT INTO audit_log (org_id, user_id, user_name, user_role, action, detail, level, metadata, ip_address)
    VALUES (${orgId}, ${entry.userId || null}, ${entry.userName}, ${entry.userRole || 'unknown'}, ${entry.action}, ${entry.detail}, ${entry.level || 'info'}, ${JSON.stringify(entry.metadata || {})}, ${entry.ipAddress || null})
    RETURNING *
  `;
  return result[0];
}

export async function getAuditLog(orgId, { limit = 100, offset = 0 } = {}) {
  if (!sql) return [];
  return sql`SELECT * FROM audit_log WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
}

// ============================================================================
// CASE NOTE QUERIES
// ============================================================================

export async function createCaseNote(orgId, note) {
  if (!sql) return note;
  const result = await sql`
    INSERT INTO case_notes (ticket_id, org_id, author_id, author_name, author_role, content, is_internal)
    VALUES (${note.ticketId}, ${orgId}, ${note.authorId || null}, ${note.authorName}, ${note.authorRole}, ${note.content}, ${note.isInternal !== false})
    RETURNING *
  `;
  return result[0];
}

export async function getCaseNotes(orgId, ticketId) {
  if (!sql) return [];
  return sql`SELECT * FROM case_notes WHERE org_id = ${orgId} AND ticket_id = ${ticketId} ORDER BY created_at ASC`;
}

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

export async function createDocument(orgId, doc) {
  if (!sql) return doc;
  const result = await sql`
    INSERT INTO documents (org_id, name, type, category, jurisdictions, version, pages, status, blob_url, blob_size, uploaded_by)
    VALUES (${orgId}, ${doc.name}, ${doc.type}, ${doc.category || 'Uploaded'}, ${JSON.stringify(doc.jurisdictions || ['All'])}, ${doc.version || '1.0'}, ${doc.pages || null}, ${doc.status || 'draft'}, ${doc.blobUrl || null}, ${doc.blobSize || null}, ${doc.uploadedBy || null})
    RETURNING *
  `;
  return result[0];
}

export async function getDocuments(orgId) {
  if (!sql) return [];
  return sql`SELECT * FROM documents WHERE org_id = ${orgId} ORDER BY created_at DESC`;
}

export async function deleteDocument(orgId, docId) {
  if (!sql) return null;
  return sql`DELETE FROM documents WHERE org_id = ${orgId} AND id = ${docId}`;
}

// ============================================================================
// CHAT MESSAGE QUERIES
// ============================================================================

export async function saveChatMessage(orgId, msg) {
  if (!sql) return msg;
  const result = await sql`
    INSERT INTO chat_messages (org_id, user_id, session_id, role, content, metadata)
    VALUES (${orgId}, ${msg.userId || null}, ${msg.sessionId || null}, ${msg.role}, ${msg.content}, ${JSON.stringify(msg.metadata || {})})
    RETURNING *
  `;
  return result[0];
}

export async function getChatHistory(orgId, userId, sessionId, { limit = 50 } = {}) {
  if (!sql) return [];
  if (sessionId) {
    return sql`SELECT * FROM chat_messages WHERE org_id = ${orgId} AND session_id = ${sessionId} ORDER BY created_at ASC LIMIT ${limit}`;
  }
  return sql`SELECT * FROM chat_messages WHERE org_id = ${orgId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
}

// ============================================================================
// ORGANIZATION + USER QUERIES
// ============================================================================

export async function getOrCreateOrg(orgData) {
  if (!sql) return { id: "demo-org", ...orgData };
  // Try to find existing org by slug
  const existing = await sql`SELECT * FROM organizations WHERE slug = ${orgData.slug} LIMIT 1`;
  if (existing.length > 0) return existing[0];
  // Create new
  const result = await sql`
    INSERT INTO organizations (name, slug, industry, employee_count, hq_state, support_email, settings)
    VALUES (${orgData.name}, ${orgData.slug}, ${orgData.industry || null}, ${orgData.employeeCount || null}, ${orgData.hqState || null}, ${orgData.supportEmail || null}, ${JSON.stringify(orgData.settings || {})})
    RETURNING *
  `;
  return result[0];
}

export async function getOrgUsers(orgId) {
  if (!sql) return [];
  return sql`SELECT * FROM users WHERE org_id = ${orgId} AND is_active = TRUE ORDER BY name ASC`;
}

export async function getUserByClerkId(clerkId) {
  if (!sql) return null;
  const result = await sql`SELECT u.*, o.name as org_name, o.slug as org_slug FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.clerk_id = ${clerkId} LIMIT 1`;
  return result[0] || null;
}

// ============================================================================
// TEAM / USER MANAGEMENT QUERIES
// ============================================================================

export async function inviteUser(orgId, userData) {
  if (!sql) return userData;
  // -- Check for an existing row for this email in the org first --
  // (avoids ON CONFLICT which requires a UNIQUE constraint on (org_id, email)
  //  that may not exist in older schemas)
  const existing = await sql`
    SELECT id FROM users WHERE org_id = ${orgId} AND email = ${userData.email} LIMIT 1
  `;
  if (existing.length > 0) {
    // -- Re-invite: update role and re-activate --
    const result = await sql`
      UPDATE users SET role = ${userData.role || 'employee'}, is_active = TRUE, updated_at = NOW()
      WHERE org_id = ${orgId} AND email = ${userData.email}
      RETURNING *
    `;
    return result[0];
  }
  const result = await sql`
    INSERT INTO users (org_id, email, name, role, department, title, state, location, clerk_id)
    VALUES (${orgId}, ${userData.email}, ${userData.name}, ${userData.role || 'employee'}, ${userData.department || null}, ${userData.title || null}, ${userData.state || null}, ${userData.location || null}, ${userData.clerkId || null})
    RETURNING *
  `;
  return result[0];
}

export async function updateUserRole(orgId, userId, role) {
  if (!sql) return null;
  const result = await sql`
    UPDATE users SET role = ${role}, updated_at = NOW()
    WHERE id = ${userId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

export async function setUserActive(orgId, userId, isActive) {
  if (!sql) return null;
  const result = await sql`
    UPDATE users SET is_active = ${isActive}, updated_at = NOW()
    WHERE id = ${userId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

export async function getOrgSettings(orgId) {
  if (!sql) return {};
  const result = await sql`SELECT settings FROM organizations WHERE id = ${orgId} OR slug = ${orgId} LIMIT 1`;
  if (!result.length) return {};
  const s = result[0].settings;
  return typeof s === "string" ? JSON.parse(s) : (s || {});
}

export async function updateOrgPlan(orgId, plan) {
  if (!sql) return null;
  const result = await sql`
    UPDATE organizations SET plan = ${plan}, updated_at = NOW()
    WHERE id = ${orgId} OR slug = ${orgId}
    RETURNING id, plan
  `;
  return result[0];
}

// ============================================================================
// API KEY QUERIES
// ============================================================================

export async function storeApiKey(orgId, name, keyHash, keyPrefix, createdBy) {
  if (!sql) return { id: `demo_${Date.now()}`, name, key_prefix: keyPrefix, status: "active", created_at: new Date().toISOString() };
  const result = await sql`
    INSERT INTO api_keys (org_id, name, key_hash, key_prefix, created_by)
    VALUES (${orgId}, ${name}, ${keyHash}, ${keyPrefix}, ${createdBy || null})
    RETURNING id, org_id, name, key_prefix, status, last_used_at, created_at, revoked_at
  `;
  return result[0];
}

export async function getApiKeys(orgId) {
  if (!sql) return [];
  return sql`
    SELECT id, org_id, name, key_prefix, status, last_used_at, created_at, revoked_at
    FROM api_keys WHERE org_id = ${orgId} ORDER BY created_at DESC
  `;
}

export async function revokeApiKey(orgId, keyId) {
  if (!sql) return null;
  const result = await sql`
    UPDATE api_keys SET status = 'revoked', revoked_at = NOW()
    WHERE id = ${keyId} AND org_id = ${orgId}
    RETURNING id, status, revoked_at
  `;
  return result[0];
}

// ============================================================================
// INTEGRATION QUERIES
// ============================================================================

export async function getIntegrations(orgId) {
  if (!sql) return [];
  return sql`SELECT * FROM integrations WHERE org_id = ${orgId}`;
}

export async function upsertIntegration(orgId, connectorId, data) {
  if (!sql) return { connector_id: connectorId, ...data };
  const result = await sql`
    INSERT INTO integrations (org_id, connector_id, status, config, sync_fields, last_sync_at)
    VALUES (${orgId}, ${connectorId}, ${data.status || "pending"}, ${JSON.stringify(data.config || {})}, ${JSON.stringify(data.syncFields || [])}, ${data.lastSyncAt || null})
    ON CONFLICT (org_id, connector_id) DO UPDATE SET
      status     = EXCLUDED.status,
      config     = EXCLUDED.config,
      sync_fields = EXCLUDED.sync_fields,
      last_sync_at = COALESCE(EXCLUDED.last_sync_at, integrations.last_sync_at),
      updated_at = NOW()
    RETURNING *
  `;
  return result[0];
}

// ============================================================================
// SENSITIVE CASE QUERIES
// ============================================================================

export async function createCase(orgId, caseObj) {
  if (!sql) return caseObj;
  const result = await sql`
    INSERT INTO cases (id, org_id, type, type_label, type_icon, confidentiality, subject, description, reported_by, accused_party, status, assignee, created_by, risk, notes, documents)
    VALUES (${caseObj.id}, ${orgId}, ${caseObj.type}, ${caseObj.typeLabel}, ${caseObj.typeIcon || '📋'}, ${caseObj.confidentiality || 'standard'}, ${caseObj.subject}, ${caseObj.description || null}, ${caseObj.reportedBy || null}, ${caseObj.accusedParty || null}, ${caseObj.status || 'open'}, ${caseObj.assignee || null}, ${caseObj.createdBy}, ${caseObj.risk || 'medium'}, ${JSON.stringify(caseObj.notes || [])}, ${JSON.stringify(caseObj.documents || [])})
    RETURNING *
  `;
  return result[0];
}

export async function getCases(orgId) {
  if (!sql) return [];
  return sql`SELECT * FROM cases WHERE org_id = ${orgId} ORDER BY created_at DESC`;
}

export async function updateCase(orgId, caseId, updates) {
  if (!sql) return null;
  const { status, notes } = updates;
  const result = await sql`
    UPDATE cases
    SET status = COALESCE(${status || null}, status),
        notes = COALESCE(${notes ? JSON.stringify(notes) : null}::jsonb, notes),
        updated_at = NOW()
    WHERE id = ${caseId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export async function getTicketStats(orgId, days = 30) {
  if (!sql) return null;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const result = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE status = 'escalated' OR status = 'pending') as escalated,
      ROUND(AVG(risk_score)) as avg_risk,
      ROUND(AVG(satisfaction) FILTER (WHERE satisfaction IS NOT NULL), 1) as avg_satisfaction,
      ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) FILTER (WHERE resolved_at IS NOT NULL)) as avg_resolution_seconds
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ
  `;
  return result[0];
}

export async function getTicketsByCategory(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT category, COUNT(*) as count
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `;
}

export async function getTicketsByState(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT state, COUNT(*) as count
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ AND state IS NOT NULL
    GROUP BY state
    ORDER BY count DESC
  `;
}

// -- Routing breakdown: auto / hr / legal / pending --
export async function getTicketsByRouting(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT routing, COUNT(*) as count
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ AND routing IS NOT NULL
    GROUP BY routing
    ORDER BY count DESC
  `;
}

// ============================================================================
// TIER 1 ANALYTICS — ROI / Adoption / Answer quality
// See ANALYTICS_SPEC_2026_07.md for buyer rationale.
// All queries scoped by orgId. `days` is the window in days.
// ============================================================================

// -- ROI card: auto-resolve rate + hours saved + cost avoided.
//    Hours saved assumes ~15 min saved per auto-resolved ticket vs a human
//    reply. Cost avoided uses a default $12/ticket baseline; make this
//    per-org configurable later. --
export async function getRoiSummary(orgId, days = 30) {
  if (!sql) return null;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [row] = await sql`
    SELECT
      COUNT(*)::int                                        AS total,
      COUNT(*) FILTER (WHERE was_auto_resolved = TRUE)::int AS auto_resolved,
      COUNT(*) FILTER (WHERE routing IN ('hr', 'legal'))::int AS escalated_to_human,
      COUNT(*) FILTER (WHERE was_auto_resolved = TRUE) * 15   AS minutes_saved,
      COUNT(*) FILTER (WHERE was_auto_resolved = TRUE) * 12   AS dollars_avoided
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ
  `;
  return row;
}

// -- Adoption card: WAU + MAU + eligible reach + P50/P95 time-to-first-answer.
//    "Eligible" defaults to all users in the org's users table. --
export async function getAdoptionSummary(orgId, days = 30) {
  if (!sql) return null;
  const nowMs = Date.now();
  const wauCutoff = new Date(nowMs - 7  * 24 * 60 * 60 * 1000).toISOString();
  const mauCutoff = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();
  const windowCutoff = new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();

  const [row] = await sql`
    WITH tt_secs AS (
      SELECT EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at))::int AS secs
      FROM tickets
      WHERE org_id = ${orgId}
        AND created_at >= ${windowCutoff}::TIMESTAMPTZ
        AND (resolved_at IS NOT NULL OR was_auto_resolved = TRUE)
    )
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM tickets
        WHERE org_id = ${orgId} AND created_at >= ${wauCutoff}::TIMESTAMPTZ)::int AS wau,
      (SELECT COUNT(DISTINCT user_id) FROM tickets
        WHERE org_id = ${orgId} AND created_at >= ${mauCutoff}::TIMESTAMPTZ)::int AS mau,
      (SELECT COUNT(*) FROM users WHERE org_id = ${orgId} AND is_active IS NOT FALSE)::int AS eligible,
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY secs), 0)::int  AS ttfa_p50_secs,
      COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY secs), 0)::int AS ttfa_p95_secs
    FROM tt_secs
  `;
  return row;
}

// -- Per-role adoption breakdown. Feeds the WAU stacked bar. --
export async function getAdoptionByRole(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT COALESCE(u.role, 'unknown')::text AS role,
           COUNT(DISTINCT t.user_id)::int    AS active_users,
           COUNT(t.id)::int                  AS tickets
    FROM tickets t LEFT JOIN users u ON t.user_id = u.id
    WHERE t.org_id = ${orgId} AND t.created_at >= ${cutoff}::TIMESTAMPTZ
    GROUP BY COALESCE(u.role, 'unknown')
    ORDER BY tickets DESC
  `;
}

// -- Answer quality card: citation coverage + override/thumbs-down + confidence bucket --
export async function getAnswerQualitySummary(orgId, days = 30) {
  if (!sql) return null;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [row] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE ai_response IS NOT NULL)::int                       AS answered,
      COUNT(*) FILTER (WHERE ai_response IS NOT NULL AND policy_id IS NOT NULL)::int AS cited,
      COUNT(*) FILTER (WHERE satisfaction IS NOT NULL AND satisfaction <= 2)::int   AS thumbs_down,
      COUNT(*) FILTER (WHERE satisfaction IS NOT NULL)::int                          AS rated,
      COUNT(*) FILTER (WHERE ai_confidence >= 80)::int                               AS conf_high,
      COUNT(*) FILTER (WHERE ai_confidence >= 60 AND ai_confidence < 80)::int         AS conf_mid,
      COUNT(*) FILTER (WHERE ai_confidence <  60 AND ai_confidence IS NOT NULL)::int  AS conf_low,
      ROUND(AVG(ai_confidence) FILTER (WHERE ai_confidence IS NOT NULL))::int        AS conf_avg
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ
  `;
  return row;
}

// -- Escalation reasons breakdown (Tier 2 #5) --
export async function getEscalationReasons(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT COALESCE(escalation_reason, 'other')::text AS reason,
           COUNT(*)::int                              AS count
    FROM tickets
    WHERE org_id = ${orgId}
      AND created_at >= ${cutoff}::TIMESTAMPTZ
      AND (status IN ('escalated', 'pending') OR routing IN ('hr', 'legal'))
    GROUP BY COALESCE(escalation_reason, 'other')
    ORDER BY count DESC
  `;
}

// -- Compliance risk heatmap (Tier 2 #4).
//    Rows = state, cols = category, cell = escalated + unresolved count in
//    the window. Frontend does the topic bucketing (leave / wage /
//    harassment / ada / fmla / other) so the storage layer stays honest
//    about what raw categories exist. --
export async function getComplianceHeatmap(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT
      COALESCE(state, 'unknown')::text                          AS state,
      COALESCE(category, 'uncategorized')::text                 AS category,
      COUNT(*)::int                                             AS unanswered
    FROM tickets
    WHERE org_id = ${orgId}
      AND created_at >= ${cutoff}::TIMESTAMPTZ
      AND (status IN ('escalated', 'pending', 'open')
           OR (was_auto_resolved = FALSE AND resolved_at IS NULL))
    GROUP BY COALESCE(state, 'unknown'), COALESCE(category, 'uncategorized')
    ORDER BY unanswered DESC
    LIMIT 500
  `;
}

// -- Risk score distribution: low (0-30), medium (31-60), high (61-80), critical (81-100) --
export async function getTicketsByRisk(orgId, days = 30) {
  if (!sql) return [];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sql`
    SELECT
      SUM(CASE WHEN risk_score <= 30 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN risk_score > 30 AND risk_score <= 60 THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN risk_score > 60 AND risk_score <= 80 THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN risk_score > 80 THEN 1 ELSE 0 END) as critical
    FROM tickets
    WHERE org_id = ${orgId} AND created_at >= ${cutoff}::TIMESTAMPTZ AND risk_score IS NOT NULL
  `;
}

// ============================================================================
// SELF-SERVICE REQUEST QUERIES
// ============================================================================

export async function createSelfServiceRequest(orgId, req) {
  if (!sql) return { id: `ssr_demo_${Date.now()}`, ...req, created_at: new Date().toISOString() };
  const result = await sql`
    INSERT INTO self_service_requests
      (org_id, user_id, employee_id, action, status, payload, ticket_id, notes)
    VALUES (
      ${orgId},
      ${req.userId || null},
      ${req.employeeId || null},
      ${req.action},
      ${req.status || "pending"},
      ${JSON.stringify(req.payload || {})},
      ${req.ticketId || null},
      ${req.notes || null}
    )
    RETURNING *
  `;
  return result[0];
}

export async function getSelfServiceRequests(orgId, { userId, action, status, limit = 50 } = {}) {
  if (!sql) return [];
  if (userId && action) {
    return sql`SELECT * FROM self_service_requests WHERE org_id = ${orgId} AND user_id = ${userId} AND action = ${action} ORDER BY created_at DESC LIMIT ${limit}`;
  }
  if (userId) {
    return sql`SELECT * FROM self_service_requests WHERE org_id = ${orgId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
  }
  if (action) {
    return sql`SELECT * FROM self_service_requests WHERE org_id = ${orgId} AND action = ${action} ORDER BY created_at DESC LIMIT ${limit}`;
  }
  if (status) {
    return sql`SELECT * FROM self_service_requests WHERE org_id = ${orgId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit}`;
  }
  return sql`SELECT * FROM self_service_requests WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT ${limit}`;
}

export async function updateSelfServiceRequest(orgId, requestId, { status, reviewedBy, notes } = {}) {
  if (!sql) return null;
  const result = await sql`
    UPDATE self_service_requests
    SET status       = COALESCE(${status || null}, status),
        reviewed_by  = COALESCE(${reviewedBy || null}, reviewed_by),
        reviewed_at  = CASE WHEN ${status || null} IS NOT NULL THEN NOW() ELSE reviewed_at END,
        notes        = COALESCE(${notes || null}, notes),
        updated_at   = NOW()
    WHERE id = ${requestId} AND org_id = ${orgId}
    RETURNING *
  `;
  return result[0];
}

// ============================================================================
// DOCUMENT CHUNK QUERIES — handbook retrieval (RAG)
// ============================================================================

// -- Replace all chunks for a document (idempotent re-index on re-upload) --
export async function replaceDocumentChunks(orgId, documentId, documentName, chunks) {
  if (!sql) return 0;
  await sql`DELETE FROM document_chunks WHERE org_id = ${orgId} AND document_id = ${documentId}`;
  // -- Insert in small parallel batches to keep serverless round-trips bounded --
  const BATCH = 20;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    await Promise.all(batch.map((c, j) => sql`
      INSERT INTO document_chunks (org_id, document_id, document_name, chunk_index, section, content, embedding)
      VALUES (
        ${orgId}, ${documentId}, ${documentName}, ${i + j}, ${c.section || null}, ${c.content},
        ${c.embedding ? JSON.stringify(c.embedding) : null}::vector
      )
    `));
  }
  return chunks.length;
}

// -- Vector similarity search (cosine distance) over the org's handbook --
export async function searchChunksByEmbedding(orgId, queryEmbedding, k = 6) {
  if (!sql) return [];
  const vec = JSON.stringify(queryEmbedding);
  return sql`
    SELECT document_name, section, content
    FROM document_chunks
    WHERE org_id = ${orgId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${k}
  `;
}

// -- Full-text fallback when no embeddings exist (or provider is down) --
export async function searchChunksByKeyword(orgId, query, k = 6) {
  if (!sql) return [];
  return sql`
    SELECT document_name, section, content,
           ts_rank(to_tsvector('english', content), websearch_to_tsquery('english', ${query})) AS rank
    FROM document_chunks
    WHERE org_id = ${orgId}
      AND to_tsvector('english', content) @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${k}
  `;
}

export async function countDocumentChunks(orgId) {
  if (!sql) return 0;
  const r = await sql`SELECT COUNT(*)::int AS n FROM document_chunks WHERE org_id = ${orgId}`;
  return r[0]?.n || 0;
}

// ============================================================================
// PLAN ENFORCEMENT + RATE LIMIT QUERIES
// ============================================================================

export async function getOrgPlan(orgId) {
  if (!sql) return "starter";
  const r = await sql`SELECT plan FROM organizations WHERE id = ${orgId} OR slug = ${orgId} LIMIT 1`;
  return r[0]?.plan || "starter";
}

export async function countDocuments(orgId) {
  if (!sql) return 0;
  const r = await sql`SELECT COUNT(*)::int AS n FROM documents WHERE org_id = ${orgId}`;
  return r[0]?.n || 0;
}

export async function countActiveUsers(orgId) {
  if (!sql) return 0;
  const r = await sql`SELECT COUNT(*)::int AS n FROM users WHERE org_id = ${orgId} AND is_active = TRUE`;
  return r[0]?.n || 0;
}

// -- DB-backed sliding-window rate limit: user messages saved in the last N seconds.
//    Survives serverless cold starts, unlike in-memory counters. --
export async function countRecentChatMessages(orgId, userId, windowSeconds = 60) {
  if (!sql) return 0;
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const r = await sql`
    SELECT COUNT(*)::int AS n FROM chat_messages
    WHERE org_id = ${orgId} AND user_id = ${userId} AND role = 'user'
      AND created_at >= ${cutoff}::TIMESTAMPTZ
  `;
  return r[0]?.n || 0;
}

export default sql;
