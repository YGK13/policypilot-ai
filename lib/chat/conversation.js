// ============================================================================
// CHAT CONVERSATION HELPERS — multi-turn context + visible citations for
// /api/chat. Pure functions, no I/O, so they are unit-tested directly.
//
//   buildConversationMessages: last few turns of THIS session (already scoped
//     to the calling user by the DB query) + the new question, as AI SDK
//     ModelMessages. Follow-ups like "what about in New York?" keep context.
//   buildRetrievalQuery: short follow-ups borrow the previous question so
//     handbook retrieval still finds the right section.
//   collectSources: de-duplicated [document § section] list shown to the user
//     under the answer, so every grounded answer shows where it came from.
// ============================================================================

// -- How much history reaches the model (cost bound) --
export const HISTORY_MAX_MESSAGES = 6;
export const HISTORY_MAX_CHARS = 1500;

// -- Stored assistant answers end with a server-appended disclaimer (<br><br><em>…</em>)
//    and may carry an interrupted-stream fallback; neither is useful context. --
const TRAILING_DISCLAIMER = /(<br\s*\/?>\s*){2}<em>This is (general HR policy information|a compliance-oriented draft), not legal advice\.[\s\S]*?<\/em>\s*$/i;

const ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };

// -- HTML answer → plain text for the model's context window --
export function toPlainText(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(TRAILING_DISCLAIMER, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m])
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clip(text, max) {
  return text.length > max ? text.slice(0, max) + " …" : text;
}

// -- rows: [{ role: "user"|"assistant", content }] oldest first.
//    Returns ModelMessage[] that starts with a user turn, strictly alternates
//    (consecutive same-role rows are merged) and ends with the new query. --
export function buildConversationMessages(rows, query, {
  maxMessages = HISTORY_MAX_MESSAGES,
  maxChars = HISTORY_MAX_CHARS,
} = {}) {
  const history = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && (r.role === "user" || r.role === "assistant"))
    .slice(-maxMessages)
    .map((r) => ({ role: r.role, content: clip(toPlainText(r.content), maxChars) }))
    .filter((m) => m.content);

  // -- The current question may already be persisted (race with the save);
  //    drop a trailing identical user row so it is not sent twice. --
  const last = history[history.length - 1];
  if (last && last.role === "user" && last.content === query.trim()) history.pop();

  const messages = [];
  for (const m of [...history, { role: "user", content: query }]) {
    if (messages.length === 0 && m.role !== "user") continue; // must open with the user
    const prev = messages[messages.length - 1];
    if (prev && prev.role === m.role) {
      prev.content += "\n\n" + m.content;
    } else {
      messages.push({ ...m });
    }
  }
  return messages;
}

// -- Short follow-ups ("and for part-time staff?") carry little retrieval
//    signal on their own; prefix the previous user question. --
const FOLLOW_UP_MAX_WORDS = 12;

export function buildRetrievalQuery(query, rows) {
  const words = query.trim().split(/\s+/).filter(Boolean).length;
  if (words > FOLLOW_UP_MAX_WORDS) return query;
  const prevUser = (Array.isArray(rows) ? rows : [])
    .filter((r) => r?.role === "user" && toPlainText(r.content) !== query.trim())
    .pop();
  if (!prevUser) return query;
  return `${clip(toPlainText(prevUser.content), 500)}\n${query}`;
}

// -- Unique handbook citations from retrieved excerpts, in rank order --
export function collectSources(excerpts, max = 6) {
  const seen = new Set();
  const out = [];
  for (const e of excerpts || []) {
    if (!e?.document_name) continue;
    const section = e.section || null;
    const key = `${e.document_name}\u0000${section || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ document: e.document_name, section });
    if (out.length >= max) break;
  }
  return out;
}

// -- Header-safe encoding (headers must be ByteString; names can be UTF-8) --
export function encodeSourcesHeader(sources) {
  return encodeURIComponent(JSON.stringify(sources || []));
}

export function decodeSourcesHeader(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return Array.isArray(parsed) ? parsed.filter((s) => s && typeof s.document === "string") : [];
  } catch {
    return [];
  }
}
