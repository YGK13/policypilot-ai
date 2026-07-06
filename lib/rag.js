// ============================================================================
// RAG PIPELINE — makes "answers from YOUR handbook" true.
//
// Upload path:   extractText → chunkText → embedTexts → replaceDocumentChunks
// Query path:    retrieveContext → (vector search | full-text fallback)
//
// Embeddings run through the Vercel AI Gateway (OIDC, same auth as chat).
// When the gateway is unavailable (local dev without `vercel env pull`),
// chunks are stored without embeddings and retrieval falls back to Postgres
// full-text search — still the customer's real handbook text, never canned.
// ============================================================================

import { embed, embedMany } from "ai";
import {
  replaceDocumentChunks,
  searchChunksByEmbedding,
  searchChunksByKeyword,
  isDbAvailable,
} from "@/lib/db";

// -- Gateway embedding model. text-embedding-3-small = 1536 dims (matches schema). --
const EMBED_MODEL = process.env.EMBED_MODEL || "openai/text-embedding-3-small";
const HAS_GATEWAY = !!process.env.VERCEL_OIDC_TOKEN || !!process.env.AI_GATEWAY_API_KEY;

// ============================================================================
// TEXT EXTRACTION — PDF (unpdf), DOCX (mammoth), plain text/markdown/CSV
// ============================================================================
export async function extractText(buffer, filename) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const { extractText: extractPdf, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractPdf(pdf, { mergePages: true });
    return typeof text === "string" ? text : (text || []).join("\n");
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }

  if (["txt", "md", "csv"].includes(ext)) {
    return Buffer.from(buffer).toString("utf-8");
  }

  // -- .doc, .xlsx and anything else: not extractable server-side yet --
  return null;
}

// ============================================================================
// CHUNKING — paragraph-aware, ~1400 chars per chunk with 200-char overlap.
// Tracks the nearest heading-looking line so answers can cite the section.
// ============================================================================
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;

function looksLikeHeading(line) {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  // Markdown headings, numbered sections (e.g. "4.2 Paid Time Off"), ALL-CAPS lines
  return /^#{1,4}\s/.test(t) || /^\d+(\.\d+)*[.)]?\s+\S/.test(t) ||
    (t === t.toUpperCase() && /[A-Z]{3,}/.test(t) && t.split(/\s+/).length <= 10);
}

export function chunkText(text) {
  const chunks = [];
  let currentSection = null;
  let buf = "";

  const flush = () => {
    const content = buf.trim();
    if (content.length > 40) chunks.push({ section: currentSection, content });
    // -- Keep tail overlap so answers spanning a boundary stay retrievable --
    buf = content.length > CHUNK_OVERLAP ? content.slice(-CHUNK_OVERLAP) : "";
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/g, "");
    if (looksLikeHeading(line)) {
      if (buf.trim().length > CHUNK_SIZE / 2) flush();
      currentSection = line.replace(/^#{1,4}\s*/, "").trim();
    }
    buf += line + "\n";
    if (buf.length >= CHUNK_SIZE) flush();
  }
  if (buf.trim().length > 40) {
    const content = buf.trim();
    chunks.push({ section: currentSection, content });
  }
  return chunks;
}

// ============================================================================
// EMBEDDINGS — via AI Gateway. Returns null (not throw) on any failure so the
// pipeline degrades to full-text search instead of failing the upload.
// ============================================================================
export async function embedTexts(texts) {
  if (!HAS_GATEWAY || texts.length === 0) return null;
  try {
    const { embeddings } = await embedMany({ model: EMBED_MODEL, values: texts });
    return embeddings;
  } catch (err) {
    console.warn("[RAG] embedMany failed, storing chunks without embeddings:", err.message);
    return null;
  }
}

async function embedQuery(query) {
  if (!HAS_GATEWAY) return null;
  try {
    const { embedding } = await embed({ model: EMBED_MODEL, value: query });
    return embedding;
  } catch (err) {
    console.warn("[RAG] query embed failed, falling back to keyword search:", err.message);
    return null;
  }
}

// ============================================================================
// INDEX A DOCUMENT — called from the upload route after the Blob write.
// Returns { indexed, chunks, reason } so the UI can show ingestion status.
// ============================================================================
export async function indexDocument({ orgId, documentId, documentName, buffer, filename }) {
  if (!isDbAvailable()) return { indexed: false, chunks: 0, reason: "no_database" };

  const text = await extractText(buffer, filename);
  if (!text || text.trim().length < 100) {
    return { indexed: false, chunks: 0, reason: "no_extractable_text" };
  }

  const chunks = chunkText(text);
  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const enriched = chunks.map((c, i) => ({ ...c, embedding: embeddings ? embeddings[i] : null }));

  const stored = await replaceDocumentChunks(orgId, documentId, documentName, enriched);
  return { indexed: true, chunks: stored, embedded: !!embeddings, reason: null };
}

// ============================================================================
// RETRIEVE CONTEXT FOR A QUERY — vector search first, full-text fallback.
// Returns [{ document_name, section, content }] capped at k.
// ============================================================================
export async function retrieveContext(orgId, query, k = 6) {
  if (!isDbAvailable()) return [];
  try {
    const queryEmbedding = await embedQuery(query);
    if (queryEmbedding) {
      const rows = await searchChunksByEmbedding(orgId, queryEmbedding, k);
      if (rows.length > 0) return rows;
    }
    return await searchChunksByKeyword(orgId, query, k);
  } catch (err) {
    console.error("[RAG] retrieveContext failed:", err.message);
    return [];
  }
}
