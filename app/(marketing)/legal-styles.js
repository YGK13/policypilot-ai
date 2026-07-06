// ============================================================================
// SHARED STYLES for legal + security pages (terms, privacy, security).
// Matches the dark landing page theme.
// ============================================================================

const L = {
  page: {
    background: "#09090b",
    color: "#e4e4e7",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    lineHeight: 1.7,
    minHeight: "100vh",
    padding: "80px 24px",
  },
  container: { maxWidth: 760, margin: "0 auto" },
  h1: { fontSize: 34, fontWeight: 800, marginBottom: 8 },
  updated: { fontSize: 13, color: "#8b8fa3", marginBottom: 40 },
  h2: { fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 },
  p: { fontSize: 15, color: "#b4b8c5", marginBottom: 14 },
  li: { fontSize: 15, color: "#b4b8c5", marginBottom: 8 },
  ul: { paddingLeft: 22, marginBottom: 14 },
  a: { color: "#3b82f6" },
  back: {
    display: "inline-block", marginBottom: 32, color: "#3b82f6",
    fontSize: 14, textDecoration: "none",
  },
};

export default L;
