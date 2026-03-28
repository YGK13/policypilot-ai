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
  if (status && userId) {
    return sql`SELECT * FROM tickets WHERE org_id = ${orgId} AND status = ${status} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  }
  if (status) {
    return sql`SELECT * FROM tickets WHERE org_id = ${orgId} AND status = ${status} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  }
  if (userId) {
    return sql`SELECT * FROM tickets WHERE org_id = ${orgId} AND user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  }
  return sql`SELECT * FROM tickets WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
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

export default sql;
