import Link from "next/link";
import { getAllPostsSorted } from "@/content/blog/posts";

// ============================================================================
// BLOG INDEX PAGE — /blog
// Lists all blog posts newest first. Public route.
// ============================================================================

export const metadata = {
  title: "AI HR Pilot Blog | HR Automation, AI Chatbots, Employee Experience",
  description:
    "Practical insights from a 3x CHRO on AI HR automation, employee experience, compliance, and HR chatbot implementation. Written for HR directors at 50-500 person companies.",
  keywords:
    "hr automation blog, ai hr blog, hr chatbot guide, hr operations insights",
  openGraph: {
    title: "AI HR Pilot Blog",
    description: "HR automation insights from a 3x CHRO.",
    url: "https://aihrpilot.com/blog",
    type: "website",
  },
};

// ============================================================================
// STYLES — Match the landing page aesthetic (dark theme, blue accent)
// ============================================================================

const S = {
  page: {
    background: "#09090b",
    color: "#e4e4e7",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    lineHeight: 1.6,
    minHeight: "100vh",
  },
  nav: {
    position: "sticky", top: 0, zIndex: 100,
    background: "rgba(9,9,11,0.92)", backdropFilter: "blur(12px)",
    borderBottom: "1px solid #27272a",
  },
  navInner: {
    maxWidth: 1100, margin: "0 auto", padding: "0 24px",
    display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
    fontWeight: 700, fontSize: 18, color: "#e4e4e7", textDecoration: "none",
  },
  brandIcon: {
    width: 32, height: 32, background: "#3b82f6", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
  },
  navLinks: { display: "flex", gap: 20, alignItems: "center" },
  navLink: { color: "#8b8fa3", fontSize: 14, fontWeight: 500, textDecoration: "none" },
  btnPrimary: {
    background: "#3b82f6", color: "#fff",
    padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14,
    textDecoration: "none", display: "inline-block",
  },
  container: { maxWidth: 900, margin: "0 auto", padding: "80px 24px" },
  hero: { textAlign: "center", marginBottom: 64 },
  heroLabel: {
    display: "inline-block", fontSize: 13, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: 2, color: "#3b82f6", marginBottom: 16,
  },
  h1: {
    fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 16,
  },
  heroSub: { fontSize: 17, color: "#8b8fa3", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 },
  postCard: {
    background: "#111113", border: "1px solid #27272a", borderRadius: 12,
    padding: 32, marginBottom: 20, transition: "border-color 0.2s",
    textDecoration: "none", display: "block", color: "#e4e4e7",
  },
  postMeta: { display: "flex", gap: 12, alignItems: "center", marginBottom: 12, fontSize: 13, color: "#8b8fa3" },
  postCategory: { background: "rgba(59,130,246,0.15)", color: "#60a5fa", padding: "3px 10px", borderRadius: 4, fontWeight: 600 },
  postDot: { opacity: 0.5 },
  postTitle: { fontSize: 22, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 },
  postDesc: { fontSize: 15, color: "#8b8fa3", lineHeight: 1.6 },
  footer: { padding: "40px 0", borderTop: "1px solid #27272a", textAlign: "center", marginTop: 80 },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function BlogIndex() {
  const posts = getAllPostsSorted();

  return (
    <div style={S.page}>
      {/* ============ NAV ============ */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link href="/" style={S.brand}>
            <span style={S.brandIcon}>⚡</span>
            AI HR Pilot
          </Link>
          <div style={S.navLinks}>
            <Link href="/" style={S.navLink}>Home</Link>
            <Link href="/blog" style={S.navLink}>Blog</Link>
            <Link href="/sign-in" style={S.navLink}>Log In</Link>
            <Link href="/sign-up" style={S.btnPrimary}>Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <div style={S.container}>
        <div style={S.hero}>
          <span style={S.heroLabel}>Blog</span>
          <h1 style={S.h1}>HR Automation Insights from a 3x CHRO</h1>
          <p style={S.heroSub}>
            Practical guidance on AI HR chatbots, compliance guardrails, onboarding automation,
            and building HR operations that scale. Written by Yuri Kruman.
          </p>
        </div>

        {/* ============ POSTS LIST ============ */}
        <div>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={S.postCard}
            >
              <div style={S.postMeta}>
                <span style={S.postCategory}>{post.category}</span>
                <span style={S.postDot}>·</span>
                <span>{post.readingTime}</span>
                <span style={S.postDot}>·</span>
                <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <h2 style={S.postTitle}>{post.title}</h2>
              <p style={S.postDesc}>{post.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <footer style={S.footer}>
        <p style={{ fontSize: 13, color: "#8b8fa3" }}>
          &copy; 2026 AI HR Pilot by Portfolio Leverage Co. &middot;{" "}
          <Link href="/" style={{ color: "#3b82f6" }}>Home</Link>{" "}&middot;{" "}
          <a href="mailto:support@aihrpilot.com" style={{ color: "#3b82f6" }}>Contact</a>
        </p>
      </footer>
    </div>
  );
}
