// ============================================================================
// SHARED STYLES for legal + security pages (terms, privacy, security).
// Signal palette: ink on paper. Layout chrome comes from the marketing layout.
// ============================================================================

const L = {
  page: {
    color: "#0a0b0d",
    lineHeight: 1.7,
    padding: "32px 0 80px",
  },
  container: { maxWidth: 760, margin: "0 auto", padding: "0 20px" },
  h1: { fontSize: "clamp(30px, 4.5vw, 42px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 8 },
  updated: { fontSize: 13, color: "#8b8c8f", marginBottom: 40, fontFamily: "var(--font-mono), ui-monospace, monospace" },
  h2: { fontSize: 22, fontWeight: 600, marginTop: 36, marginBottom: 12, letterSpacing: "-0.01em" },
  p: { fontSize: 15.5, color: "#4a4b4e", marginBottom: 14 },
  li: { fontSize: 15.5, color: "#4a4b4e", marginBottom: 8 },
  ul: { paddingLeft: 22, marginBottom: 14 },
  a: { color: "#0a0b0d", textDecoration: "underline", textUnderlineOffset: 3 },
  back: {
    display: "inline-block", marginBottom: 32, color: "#4a4b4e",
    fontSize: 13, textDecoration: "none", fontFamily: "var(--font-mono), ui-monospace, monospace",
  },
};

export default L;
