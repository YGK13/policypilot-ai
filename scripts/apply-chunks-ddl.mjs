// Apply the document_chunks DDL to Neon via WebSocket Pool (HTTP driver drops DDL).
import { Pool, neonConfig } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env.local manually
const env = readFileSync(".env.local", "utf-8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

// Node 24 has global WebSocket
if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL found"); process.exit(1); }

const pool = new Pool({ connectionString: url });

const statements = [
  `CREATE EXTENSION IF NOT EXISTS vector`,
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    org_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    chunk_index   INTEGER NOT NULL,
    section       TEXT,
    content       TEXT NOT NULL,
    embedding     vector(1536),
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_org ON document_chunks(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id)`,
];

try {
  for (const s of statements) {
    await pool.query(s);
    console.log("OK:", s.slice(0, 60).replace(/\s+/g, " "));
  }
  const check = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = 'document_chunks'`
  );
  const ext = await pool.query(`SELECT extname FROM pg_extension WHERE extname = 'vector'`);
  console.log("VERIFY table:", JSON.stringify(check.rows), "extension:", JSON.stringify(ext.rows));
} finally {
  await pool.end();
}
