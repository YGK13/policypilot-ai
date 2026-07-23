-- ============================================================================
-- AI HR PILOT — Neon Postgres Schema
-- Multi-tenant database for persistent ticket, document, and audit storage.
-- Designed for Neon serverless with connection pooling.
--
-- ============================================================================
-- APPLYING THIS SCHEMA — DDL must NOT use the Neon HTTP driver
-- ============================================================================
-- @neondatabase/serverless's `neon()` HTTP driver silently DROPS DDL: it
-- reports success for CREATE TABLE / CREATE INDEX / ALTER TABLE statements
-- but the changes never appear in pg_tables / pg_indexes / pg_constraint.
-- Both pooled and unpooled URLs exhibit this — the issue is the implicit-
-- transaction handling on Neon's HTTP proxy.
--
-- To apply schema changes, use ONE of:
--   1. The /api/setup endpoint (runs server-side in Vercel; needs SETUP_SECRET)
--   2. The WebSocket `Pool` transport, e.g.:
--        import { Pool, neonConfig } from "@neondatabase/serverless";
--        import ws from "ws";
--        neonConfig.webSocketConstructor = ws;
--        const pool = new Pool({ connectionString: DATABASE_URL_UNPOOLED });
--        await pool.query("CREATE TABLE ...");
--
-- This is recorded so future schema migrations don't repeat the discovery
-- (it cost us several hours in June 2026 — first on idx_users_org_email,
-- again on self_service_requests).
-- ============================================================================

-- ============================================================================
-- ORGANIZATIONS (tenants)
-- Each customer company is an organization. All data is scoped to org_id.
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  industry      TEXT,
  employee_count TEXT,
  hq_state      TEXT,
  support_email TEXT,
  plan          TEXT DEFAULT 'starter',  -- starter, professional, enterprise
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USERS — linked to Clerk via clerk_id
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clerk_id      TEXT UNIQUE,              -- Clerk user ID (set after Clerk integration)
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'employee',  -- employee, hr_staff, hr_admin, legal
  department    TEXT,
  title         TEXT,
  state         TEXT,                     -- jurisdiction (e.g., 'California')
  location      TEXT,                     -- city (e.g., 'San Francisco, CA')
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_id);
-- Email unique per org so re-inviting updates rather than duplicating
-- Note: ALTER TABLE ADD CONSTRAINT is handled by the migration step in /api/setup

-- ============================================================================
-- TICKETS — AI chat queries that become trackable items
-- ============================================================================
CREATE TABLE IF NOT EXISTS tickets (
  id            TEXT PRIMARY KEY,          -- HR-2026-0001 format
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id),
  query         TEXT NOT NULL,
  category      TEXT,
  risk_score    INTEGER DEFAULT 0,
  routing       TEXT DEFAULT 'auto',       -- auto, auto_enhanced, hr, legal
  status        TEXT DEFAULT 'open',       -- open, pending, escalated, resolved, closed
  priority      TEXT DEFAULT 'low',        -- low, medium, high, critical
  assignee      TEXT,
  department    TEXT,
  state         TEXT,                      -- employee jurisdiction at time of query
  flags         JSONB DEFAULT '[]',
  resolution    TEXT,
  satisfaction  INTEGER,                   -- 1-5 CSAT rating
  ai_response   TEXT,                      -- AI-generated answer
  ai_confidence INTEGER,                   -- 0-100 confidence score
  policy_id     TEXT,                      -- matched policy
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(org_id, created_at DESC);

-- ============================================================================
-- ANALYTICS SCHEMA DELTAS (added 2026-07-21 for Track A analytics work).
-- These are additive and safe to re-run: ADD COLUMN IF NOT EXISTS is
-- idempotent on Postgres 9.6+ (Neon is far past that).
--
-- escalation_reason  -- one of the six spec buckets, filled by the routing
--                       logic when a ticket is escalated. Powers the
--                       Tier 2 escalation-reasons breakdown.
-- was_auto_resolved  -- explicit flag rather than deriving from status +
--                       routing at query time; makes the ROI card cheap.
-- ============================================================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_reason TEXT;   -- policy_not_found | jurisdiction_not_covered | sensitive_topic | low_confidence | user_requested_human | other
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS was_auto_resolved BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_tickets_escalation_reason ON tickets(org_id, escalation_reason) WHERE escalation_reason IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_auto_resolved ON tickets(org_id, was_auto_resolved);

-- ============================================================================
-- CASE NOTES — threaded notes on escalated tickets
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_notes (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id     TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id     TEXT REFERENCES users(id),
  author_name   TEXT NOT NULL,
  author_role   TEXT NOT NULL,
  content       TEXT NOT NULL,
  is_internal   BOOLEAN DEFAULT TRUE,     -- internal notes not visible to employee
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_case_notes_ticket ON case_notes(ticket_id);

-- ============================================================================
-- DOCUMENTS — uploaded policy documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT,                      -- pdf, docx, xlsx
  category      TEXT,
  jurisdictions JSONB DEFAULT '[]',
  version       TEXT DEFAULT '1.0',
  pages         INTEGER,
  status        TEXT DEFAULT 'draft',      -- draft, active, archived
  blob_url      TEXT,                      -- Vercel Blob URL
  blob_size     INTEGER,
  uploaded_by   TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);

-- ============================================================================
-- AUDIT LOG — immutable record of all actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id),
  user_name     TEXT NOT NULL,
  user_role     TEXT,
  action        TEXT NOT NULL,             -- QUERY_RECEIVED, RESPONSE_SENT, etc.
  detail        TEXT,
  level         TEXT DEFAULT 'info',       -- info, warning, critical, success
  metadata      JSONB DEFAULT '{}',
  ip_address    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id, created_at DESC);

-- ============================================================================
-- REGULATORY UPDATES — tracked review/implementation status per org
-- ============================================================================
CREATE TABLE IF NOT EXISTS regulatory_reviews (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  update_id     TEXT NOT NULL,             -- references regulatory update ID
  status        TEXT NOT NULL,             -- reviewed, implemented
  reviewed_by   TEXT REFERENCES users(id),
  reviewer_name TEXT,
  notes         TEXT,
  affected_policies JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_reviews_org ON regulatory_reviews(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_reviews_unique ON regulatory_reviews(org_id, update_id);

-- ============================================================================
-- INTEGRATIONS — connected services per org
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id  TEXT NOT NULL,             -- bamboohr, slack, greenhouse, etc.
  status        TEXT DEFAULT 'pending',    -- pending, connected, error, disconnected
  config        JSONB DEFAULT '{}',        -- encrypted at rest by Neon
  sync_fields   JSONB DEFAULT '[]',
  last_sync_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_unique ON integrations(org_id, connector_id);

-- ============================================================================
-- CHAT MESSAGES — conversation history per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id),
  session_id    TEXT,                      -- groups messages in a conversation
  role          TEXT NOT NULL,             -- user, assistant, system
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',        -- source, routing, confidence, etc.
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_org_user ON chat_messages(org_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);

-- ============================================================================
-- SENSITIVE CASES — confidential HR case files (harassment, investigations, etc.)
-- Separate from regular ticket queue. Stores full notes timeline as JSONB.
-- ============================================================================
CREATE TABLE IF NOT EXISTS cases (
  id            TEXT PRIMARY KEY,                -- CASE-XXXXX format
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                  -- harassment, accommodation, investigation, etc.
  type_label    TEXT NOT NULL,
  type_icon     TEXT DEFAULT '📋',
  confidentiality TEXT DEFAULT 'standard',      -- standard, restricted, legal_hold
  subject       TEXT NOT NULL,
  description   TEXT,
  reported_by   TEXT,
  accused_party TEXT,
  status        TEXT DEFAULT 'open',            -- open, investigating, pending_resolution, resolved, closed
  assignee      TEXT,
  created_by    TEXT NOT NULL,
  risk          TEXT DEFAULT 'medium',          -- medium, high, critical
  notes         JSONB DEFAULT '[]',             -- full notes timeline stored as JSONB array
  documents     JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cases_org ON cases(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(org_id, status);

-- ============================================================================
-- API KEYS — customer-generated API keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL,             -- SHA-256 of the key (never store raw)
  key_prefix    TEXT NOT NULL,             -- first 8 chars for display (pp_live_xxxx...)
  status        TEXT DEFAULT 'active',     -- active, revoked
  last_used_at  TIMESTAMPTZ,
  created_by    TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- ============================================================================
-- SELF-SERVICE REQUESTS
-- Persists PTO, leave of absence, and personal info change requests.
-- PTO/leave requests are also mirrored in tickets for HR visibility;
-- info_update requests are stored here only (low risk, no ticket needed).
-- ============================================================================
CREATE TABLE IF NOT EXISTS self_service_requests (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id),
  employee_id   TEXT,                       -- demo employee ID (before DB user exists)
  action        TEXT NOT NULL,              -- 'pto' | 'leave' | 'info_update'
  status        TEXT DEFAULT 'pending',     -- pending | approved | denied | completed
  payload       JSONB DEFAULT '{}',         -- form data (dates, type, fields changed, etc.)
  ticket_id     TEXT,                       -- FK to tickets (for pto/leave only)
  notes         TEXT,
  reviewed_by   TEXT REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ssr_org ON self_service_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_ssr_user ON self_service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ssr_action ON self_service_requests(org_id, action);
CREATE INDEX IF NOT EXISTS idx_ssr_status ON self_service_requests(org_id, status);

-- ============================================================================
-- DOCUMENT CHUNKS — extracted handbook text for retrieval (RAG)
-- Populated at upload time by lib/rag.js: extract → chunk → embed → store.
-- embedding is nullable so keyword search still works when the embedding
-- provider is unavailable (retrieval falls back to Postgres full-text rank).
-- Requires the pgvector extension (supported natively on Neon).
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  section       TEXT,                      -- nearest heading above the chunk, for citations
  content       TEXT NOT NULL,
  embedding     vector(1536),              -- text-embedding-3-small via AI Gateway
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_org ON document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);

-- ============================================================================
-- PAYROLL — provider-native connection state + normalized workforce data
--
-- Design: one payroll_connections row per (org, provider). Encrypted tokens
-- and cursor state live here. Employee/paystub/PTO rows are keyed on
-- (org_id, provider, provider_employee_id) so multiple providers per org
-- do not collide, and disconnecting a provider ON DELETE CASCADEs everything.
--
-- Read-only, one-way sync. See PAYROLL_INTEGRATIONS_SPEC_2026_07.md.
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_connections (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id                TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL,               -- 'gusto' | 'rippling' | 'qbo' | 'bamboohr' | 'finch'
  provider_account_id   TEXT,                        -- Gusto company_uuid, etc.
  status                TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'revoked' | 'error'
  scope                 TEXT,
  access_token_enc      TEXT,                        -- AES-GCM encrypted via lib/payroll/index.js
  refresh_token_enc     TEXT,
  token_expires_at      TIMESTAMPTZ,
  webhook_secret_enc    TEXT,                        -- provider-issued webhook signing secret
  last_sync_at          TIMESTAMPTZ,
  last_sync_status      TEXT,                        -- 'ok' | 'partial' | 'error'
  last_sync_error       TEXT,
  connected_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  connected_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_payroll_conn_org ON payroll_connections(org_id);

CREATE TABLE IF NOT EXISTS payroll_employees (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id                 TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL,
  provider_employee_id   TEXT NOT NULL,
  linked_user_id         TEXT REFERENCES users(id) ON DELETE SET NULL, -- matched on email
  full_name              TEXT,
  work_email             TEXT,
  department             TEXT,
  title                  TEXT,
  manager_provider_id    TEXT,
  employment_type        TEXT,                       -- 'full_time' | 'part_time' | 'contractor' | ...
  hire_date              DATE,
  termination_date       DATE,
  work_location          TEXT,
  work_state             TEXT,                       -- for compliance heatmap join
  comp_rate              NUMERIC(12,2),
  comp_currency          TEXT,
  pay_frequency          TEXT,                       -- 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  raw                    JSONB,                      -- full provider payload, for debugging + future fields
  synced_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, provider, provider_employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_org       ON payroll_employees(org_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_linked    ON payroll_employees(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_workemail ON payroll_employees(org_id, work_email);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_state     ON payroll_employees(org_id, work_state);

CREATE TABLE IF NOT EXISTS payroll_paystubs (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id                 TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_employee_id    TEXT NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL,
  provider_paystub_id    TEXT NOT NULL,
  pay_date               DATE NOT NULL,
  period_start           DATE,
  period_end             DATE,
  gross_pay              NUMERIC(12,2),
  net_pay                NUMERIC(12,2),
  federal_withholding    NUMERIC(12,2),
  state_withholding      NUMERIC(12,2),
  fica                   NUMERIC(12,2),
  benefit_deductions     NUMERIC(12,2),
  other_deductions       NUMERIC(12,2),
  raw                    JSONB,                      -- SUMMARY only. No full line items, no SSN, no bank routing.
  synced_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, provider, provider_paystub_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_emp  ON payroll_paystubs(payroll_employee_id, pay_date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_pay_org  ON payroll_paystubs(org_id, pay_date DESC);

CREATE TABLE IF NOT EXISTS payroll_pto_balances (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id                 TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_employee_id    TEXT NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL,
  policy_name            TEXT NOT NULL,
  accrued_hours          NUMERIC(8,2),
  used_hours             NUMERIC(8,2),
  balance_hours          NUMERIC(8,2),
  as_of                  DATE NOT NULL,
  raw                    JSONB,
  synced_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, payroll_employee_id, policy_name)
);
CREATE INDEX IF NOT EXISTS idx_payroll_pto_emp ON payroll_pto_balances(payroll_employee_id);

-- Idempotent webhook receipts: providers frequently re-deliver events on
-- transient errors. Recording provider_event_id lets us short-circuit
-- duplicates before doing any DB writes.
CREATE TABLE IF NOT EXISTS payroll_webhook_events (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id                 TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  provider               TEXT NOT NULL,
  provider_event_id      TEXT NOT NULL,
  event_type             TEXT,
  received_at            TIMESTAMPTZ DEFAULT NOW(),
  processed_at           TIMESTAMPTZ,
  status                 TEXT DEFAULT 'received',    -- 'received' | 'processed' | 'error' | 'duplicate'
  error                  TEXT,
  UNIQUE (provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_wh_org ON payroll_webhook_events(org_id, received_at DESC);
