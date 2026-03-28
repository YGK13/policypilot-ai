-- ============================================================================
-- AI HR PILOT — Neon Postgres Schema
-- Multi-tenant database for persistent ticket, document, and audit storage.
-- Designed for Neon serverless with connection pooling.
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
CREATE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
