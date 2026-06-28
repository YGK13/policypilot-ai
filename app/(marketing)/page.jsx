import Link from "next/link";
import { Crimson_Pro, IBM_Plex_Mono } from "next/font/google";

// ============================================================================
// PUBLIC LANDING PAGE — AI HR Pilot marketing homepage
// "The Protocol" brand direction: light/cream, forest + brass, serif authority.
// Server component. No auth. Left-aligned, institutional, compliance-first.
// ============================================================================

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata = {
  title: "AI HR Pilot | Compliance Intelligence for Enterprise HR",
  description:
    "AI-powered HR policy intelligence that cites every source, flags ADA/FMLA/harassment risk, and routes sensitive cases to the right human. Built by a 3x CHRO with a law degree.",
  keywords:
    "hr compliance ai, hr policy intelligence, hris ai, employee relations ai, fmla ada compliance software, hr automation enterprise",
  openGraph: {
    title: "AI HR Pilot | The compliance standard for enterprise HR",
    description:
      "Cited answers. Routed escalations. Zero guesswork. Built by a 3x CHRO, J.D.",
    url: "https://aihrpilot.com",
    type: "website",
  },
};

// ============================================================================
// CONTENT
// ============================================================================

const CAPABILITIES = [
  {
    k: "01",
    title: "Policy Intelligence",
    desc: "Every answer is grounded in YOUR handbook and cites the exact section — not generic AI guesswork. Defensible by design.",
  },
  {
    k: "02",
    title: "Risk Detection",
    desc: "Automatically flags ADA, FMLA, harassment, and discrimination exposure before a wrong answer becomes a six-figure liability.",
  },
  {
    k: "03",
    title: "Intelligent Routing",
    desc: "Low-confidence and legally sensitive matters escalate to the right human — with full context attached, never lost in a queue.",
  },
  {
    k: "04",
    title: "Audit Trail",
    desc: "Every query, citation, and routing decision is logged and exportable. When a regulator or counsel asks, you have the record.",
  },
  {
    k: "05",
    title: "50-State Jurisdiction",
    desc: "Answers adapt to the employee's state — CFRA in California, PDL, state pay-transparency law — not one-size-fits-all federal.",
  },
  {
    k: "06",
    title: "Multi-Channel",
    desc: "Meets employees in Slack, Teams, email, or an embedded widget. One policy brain, every channel your workforce already uses.",
  },
];

const PRICING = [
  {
    tier: "Starter",
    price: "$299",
    period: "per month",
    employees: "Up to 100 employees",
    features: [
      "Policy intelligence engine",
      "10 policy documents",
      "Web + email channel",
      "Federal jurisdiction",
      "Audit trail & exports",
      "Email support",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    tier: "Professional",
    price: "$799",
    period: "per month",
    employees: "Up to 500 employees",
    features: [
      "Everything in Starter, plus —",
      "Unlimited documents",
      "Slack + Teams + web",
      "50-state jurisdiction engine",
      "ADA / FMLA / harassment risk flags",
      "Advanced analytics & reporting",
      "Priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    tier: "Enterprise",
    price: "Custom",
    period: "annual",
    employees: "Unlimited",
    features: [
      "Everything in Professional, plus —",
      "SSO (Okta, Azure AD, Google)",
      "HRIS / ATS integrations",
      "Custom compliance rules",
      "Dedicated CSM + SLA",
      "White-label option",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We went from 200+ Slack DMs a week to under 30 — and every answer that goes out is one I'd defend in front of counsel.",
    author: "VP, People",
    company: "250-person SaaS company",
  },
  {
    quote:
      "The risk flagging alone paid for itself. It caught an ADA accommodation issue our team would have answered wrong.",
    author: "Chief People Officer",
    company: "Healthcare, 400 employees",
  },
  {
    quote:
      "I run HR across three portfolio companies. It's deployed at all of them. The audit trail is what sold our GC.",
    author: "Operating Partner",
    company: "Private equity firm",
  },
];

const CREDENTIALS = [
  "3× CHRO",
  "JD, Cardozo Law",
  "BA, UPenn",
  "AI Trainer — Meta, Microsoft, OpenAI",
  "2,300+ executives coached",
  "Top 5 Global HR Thought Leader",
];

const FAQS = [
  {
    q: "How is this different from a generic AI chatbot?",
    a: "A generic chatbot generates plausible-sounding answers. AI HR Pilot grounds every response in your actual policies, cites the section, attaches a confidence score, and refuses to guess on legally sensitive matters — it routes those to a human instead.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams are live in under two hours. Upload your handbook and policy documents, set your jurisdictions, configure routing rules — done. No three-month implementation.",
  },
  {
    q: "What happens with high-risk questions like harassment or FMLA?",
    a: "These are detected automatically and never answered by AI alone. They escalate to your designated human reviewer with the full query, context, and relevant citations attached — and the entire chain is logged.",
  },
  {
    q: "Is my data secure, and is it used to train models?",
    a: "Your data is never used to train any model. Encryption in transit (TLS 1.3) and at rest via our infrastructure providers (Vercel + Neon). Authentication via Clerk (a SOC 2 Type II certified provider). Strict per-organization data isolation.",
  },
  {
    q: "Who built this?",
    a: "AI HR Pilot was built by a 3× Chief HR Officer with a law degree from Cardozo — someone who has conducted thousands of employee relations meetings, not engineers who've never sat in one.",
  },
];

// ============================================================================
// PALETTE
// ============================================================================
const C = {
  forest: "#1A3D2B",
  deep: "#13301F",
  brass: "#B8963E",
  brassSoft: "#C9A85A",
  cream: "#F5F0E8",
  linen: "#EDE7DA",
  card: "#FBF8F2",
  slate: "#6E7E72",
  line: "#DED7C7",
  inkOnDark: "#EAE4D6",
};

const serif = `${crimson.style.fontFamily}, Georgia, serif`;
const monoF = `${mono.style.fontFamily}, ui-monospace, monospace`;
const sans = `var(--font-inter), system-ui, -apple-system, sans-serif`;

const S = {
  page: { background: C.cream, color: C.forest, fontFamily: sans, lineHeight: 1.6, minHeight: "100vh", overflowX: "hidden" },
  container: { maxWidth: 1160, margin: "0 auto", padding: "0 28px" },

  nav: {
    position: "sticky", top: 0, zIndex: 100,
    background: "rgba(245,240,232,0.85)", backdropFilter: "blur(14px)",
    borderBottom: `1px solid ${C.line}`,
  },
  navInner: { maxWidth: 1160, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand: { display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: C.forest },
  brandName: { fontFamily: serif, fontWeight: 600, fontSize: 21, letterSpacing: "-0.01em" },
  navLinks: { listStyle: "none", display: "flex", gap: 30, padding: 0, margin: 0 },
  navLink: { color: C.slate, fontSize: 13.5, fontWeight: 500, textDecoration: "none", letterSpacing: "0.01em" },

  eyebrow: { fontFamily: monoF, fontSize: 12, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brass },
  h1: { fontFamily: serif, fontSize: "clamp(40px, 5.4vw, 66px)", fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.02em", color: C.forest, margin: "22px 0 0" },
  h2: { fontFamily: serif, fontSize: "clamp(30px, 3.6vw, 44px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.015em", color: C.forest, margin: 0 },
  lede: { fontSize: 18.5, color: C.slate, lineHeight: 1.65, maxWidth: 540 },

  btnPrimary: { display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 26px", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", background: C.forest, color: C.cream, border: `1px solid ${C.forest}` },
  btnGhost: { display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 26px", borderRadius: 8, fontWeight: 600, fontSize: 15, textDecoration: "none", background: "transparent", color: C.forest, border: `1px solid ${C.forest}` },
  btnSmall: { padding: "9px 18px", fontSize: 13.5, borderRadius: 7 },

  sectionLabel: { fontFamily: monoF, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.brass, fontWeight: 500 },
  muted: { color: C.slate, fontSize: 16, lineHeight: 1.7 },
};

// Inline SVG mark — abstract "P" inside a compliance bracket
function Mark({ size = 34 }) {
  return (
    <span style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", background: C.forest, borderRadius: 8, flexShrink: 0 }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* bracket */}
        <path d="M6 3 H4 V21 H6" stroke={C.brass} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 3 H20 V21 H18" stroke={C.brass} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* P */}
        <path d="M9 19 V6 H13.2 a3.4 3.4 0 0 1 0 6.8 H9" stroke={C.cream} strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div style={S.page}>
      {/* ===================== NAV ===================== */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <Link href="/" style={S.brand}>
            <Mark />
            <span style={S.brandName}>AI HR Pilot</span>
          </Link>
          <ul style={S.navLinks}>
            <li><a href="#platform" style={S.navLink}>Platform</a></li>
            <li><a href="#why" style={S.navLink}>Why Different</a></li>
            <li><a href="#pricing" style={S.navLink}>Pricing</a></li>
            <li><a href="#faq" style={S.navLink}>FAQ</a></li>
          </ul>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/sign-in" style={{ ...S.navLink, fontWeight: 600 }}>Sign in</Link>
            <Link href="/sign-up" style={{ ...S.btnPrimary, ...S.btnSmall }}>Request Demo</Link>
          </div>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <section style={{ ...S.container, paddingTop: 88, paddingBottom: 64 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "center" }}>
          {/* Left — copy */}
          <div>
            <span style={S.eyebrow}>Compliance Intelligence · Built by a 3× CHRO, J.D.</span>
            <h1 style={S.h1}>
              Resolve 90% of HR<br />questions instantly —<br />
              <span style={{ color: C.brass }}>with answers you can defend.</span>
            </h1>
            <p style={{ ...S.lede, marginTop: 26 }}>
              AI policy intelligence that cites every source, flags ADA, FMLA and
              harassment risk, and routes sensitive cases to the right human —
              automatically. Built for operators who can&apos;t afford a wrong answer.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
              <Link href="/sign-up" style={S.btnPrimary}>Start Free Trial →</Link>
              <a href="#platform" style={S.btnGhost}>See how it works</a>
            </div>
            <div style={{ display: "flex", gap: 22, marginTop: 30, flexWrap: "wrap", fontFamily: monoF, fontSize: 12.5, color: C.slate, letterSpacing: "0.03em" }}>
              <span>Encryption at rest &amp; in transit</span><span style={{ color: C.line }}>·</span>
              <span>Zero AI training on your data</span><span style={{ color: C.line }}>·</span>
              <span>Live in 2 hours</span>
            </div>
          </div>

          {/* Right — product answer card */}
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 26, boxShadow: "0 24px 60px -28px rgba(26,61,43,0.30)", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: monoF, fontSize: 11, color: C.slate, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3FA56A" }} /> AI HR Pilot · live
            </div>
            <div style={{ fontFamily: serif, fontSize: 19, color: C.forest, lineHeight: 1.4, marginBottom: 16 }}>
              &ldquo;Is Sarah eligible for FMLA leave?&rdquo;
            </div>
            <div style={{ borderLeft: `3px solid ${C.forest}`, paddingLeft: 16, marginBottom: 18 }}>
              <p style={{ fontSize: 15, color: C.forest, lineHeight: 1.65, margin: 0 }}>
                Yes — Sarah meets the 12-month / 1,250-hour threshold. Entitlement:
                12 weeks unpaid, job-protected leave per 12-month period.
              </p>
            </div>
            <div style={{ fontFamily: monoF, fontSize: 12, color: C.slate, lineHeight: 1.9, background: C.linen, borderRadius: 8, padding: "12px 14px" }}>
              <div><span style={{ color: C.brass }}>cite:</span> 29 C.F.R. § 825.110</div>
              <div><span style={{ color: C.brass }}>source:</span> FMLA &amp; Leave Policy v3.2</div>
              <div><span style={{ color: C.brass }}>confidence:</span> 94%</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              {["CITED", "AUDITABLE", "AUTO-RESOLVED"].map((t) => (
                <span key={t} style={{ fontFamily: monoF, fontSize: 10.5, letterSpacing: "0.08em", color: C.forest, border: `1px solid ${C.brass}`, borderRadius: 5, padding: "4px 9px" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== LOGO / METRIC STRIP ===================== */}
      <section style={{ background: C.linen, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...S.container, padding: "32px 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, textAlign: "center" }}>
          {[
            ["73%", "of HR inquiries are repetitive, documented questions"],
            ["1,200+", "average monthly inquiries at a 200-person company"],
            ["6 figures", "the cost of one wrong answer on ADA or FMLA"],
          ].map(([n, l]) => (
            <div key={n}>
              <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 600, color: C.forest }}>{n}</div>
              <div style={{ ...S.muted, fontSize: 13.5, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== PLATFORM / CAPABILITIES ===================== */}
      <section id="platform" style={{ ...S.container, padding: "96px 28px" }}>
        <div style={{ maxWidth: 640, marginBottom: 56 }}>
          <span style={S.sectionLabel}>The Platform</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>An HR brain that knows the law — and knows its limits.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
          {CAPABILITIES.map((c) => (
            <div key={c.k} style={{ background: C.cream, padding: "30px 28px" }}>
              <div style={{ fontFamily: monoF, fontSize: 12, color: C.brass, letterSpacing: "0.1em", marginBottom: 14 }}>{c.k}</div>
              <h3 style={{ fontFamily: serif, fontSize: 21, fontWeight: 600, color: C.forest, margin: "0 0 10px" }}>{c.title}</h3>
              <p style={{ ...S.muted, fontSize: 14.5 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section style={{ background: C.linen, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ ...S.container, padding: "96px 28px" }}>
          <div style={{ maxWidth: 640, marginBottom: 56 }}>
            <span style={S.sectionLabel}>How It Works</span>
            <h2 style={{ ...S.h2, marginTop: 14 }}>Three steps. Two hours. Zero implementation team.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 36 }}>
            {[
              ["Ingest", "Upload your handbook, benefits docs and policies. The engine indexes and maps them to jurisdiction and topic in minutes."],
              ["Deploy", "Employees ask in plain language across Slack, Teams, email or web. Every answer arrives cited, scored and jurisdiction-aware."],
              ["Route & Prove", "Sensitive matters escalate to the right human with full context. Every decision is logged for audit, counsel and the board."],
            ].map(([t, d], i) => (
              <div key={t}>
                <div style={{ fontFamily: monoF, fontSize: 13, color: C.brass, borderTop: `2px solid ${C.brass}`, paddingTop: 14, marginBottom: 14, letterSpacing: "0.06em" }}>
                  STEP {i + 1}
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 23, fontWeight: 600, color: C.forest, margin: "0 0 10px" }}>{t}</h3>
                <p style={S.muted}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== WHY DIFFERENT / CREDIBILITY ===================== */}
      <section id="why" style={{ ...S.container, padding: "96px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <span style={S.sectionLabel}>Why It&apos;s Different</span>
            <h2 style={{ ...S.h2, marginTop: 14 }}>Built by someone who&apos;s sat in the room.</h2>
            <p style={{ ...S.muted, fontSize: 17, marginTop: 18 }}>
              Every other HR chatbot was built by engineers who&apos;ve never sat across
              from an employee in crisis. This one was built by a 3× CHRO with a law
              degree who has conducted thousands of those conversations.
            </p>
            <p style={{ ...S.muted, fontSize: 17, marginTop: 14 }}>
              The compliance guardrails aren&apos;t a feature bolted on at the end —
              they&apos;re the architecture. When an employee asks about harassment, the
              last thing you want is an AI confidently making something up.
            </p>
            <p style={{ fontFamily: serif, fontStyle: "italic", fontSize: 18, color: C.forest, marginTop: 22 }}>
              &ldquo;The compliance standard for enterprise HR.&rdquo;
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignContent: "flex-start" }}>
            {CREDENTIALS.map((c) => (
              <span key={c} style={{ fontSize: 13.5, fontWeight: 500, color: C.forest, background: C.card, border: `1px solid ${C.line}`, borderRadius: 999, padding: "9px 16px" }}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section style={{ background: C.deep, color: C.inkOnDark }}>
        <div style={{ ...S.container, padding: "88px 28px" }}>
          <span style={{ ...S.sectionLabel, color: C.brassSoft }}>In the field</span>
          <h2 style={{ ...S.h2, color: C.cream, marginTop: 14, marginBottom: 48 }}>What HR and operating leaders say.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: "rgba(245,240,232,0.04)", border: "1px solid rgba(184,150,62,0.25)", borderRadius: 12, padding: 28 }}>
                <p style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.5, color: C.cream, margin: "0 0 22px" }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.brassSoft }}>{t.author}</div>
                <div style={{ fontSize: 13, color: "rgba(234,228,214,0.6)" }}>{t.company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" style={{ ...S.container, padding: "96px 28px" }}>
        <div style={{ maxWidth: 640, marginBottom: 56 }}>
          <span style={S.sectionLabel}>Pricing</span>
          <h2 style={{ ...S.h2, marginTop: 14 }}>Less than one HR coordinator&apos;s week.</h2>
          <p style={{ ...S.muted, marginTop: 12 }}>7-day free trial on every plan. No credit card to start.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 24 }}>
          {PRICING.map((p) => (
            <div key={p.tier} style={{
              background: p.featured ? C.forest : C.card,
              color: p.featured ? C.cream : C.forest,
              border: `1px solid ${p.featured ? C.forest : C.line}`,
              borderRadius: 16, padding: 32, position: "relative",
            }}>
              {p.featured && (
                <div style={{ position: "absolute", top: -11, left: 32, background: C.brass, color: C.deep, fontFamily: monoF, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 6 }}>MOST POPULAR</div>
              )}
              <div style={{ fontFamily: monoF, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: p.featured ? C.brassSoft : C.brass, marginBottom: 14 }}>{p.tier}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: serif, fontSize: 40, fontWeight: 600 }}>{p.price}</span>
                <span style={{ fontSize: 13, color: p.featured ? "rgba(234,228,214,0.7)" : C.slate }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 13.5, color: p.featured ? "rgba(234,228,214,0.7)" : C.slate, marginBottom: 22 }}>{p.employees}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ padding: "7px 0", fontSize: 14, display: "flex", gap: 10, color: p.featured ? "rgba(234,228,214,0.9)" : C.slate }}>
                    <span style={{ color: p.featured ? C.brassSoft : C.brass, fontWeight: 700 }}>·</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={p.tier === "Enterprise" ? "#contact" : "/sign-up"} style={{
                display: "block", textAlign: "center", padding: "13px", borderRadius: 8, fontWeight: 600, fontSize: 14.5, textDecoration: "none",
                background: p.featured ? C.brass : "transparent",
                color: p.featured ? C.deep : C.forest,
                border: `1px solid ${p.featured ? C.brass : C.forest}`,
              }}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" style={{ background: C.linen, borderTop: `1px solid ${C.line}` }}>
        <div style={{ ...S.container, padding: "96px 28px", maxWidth: 820 }}>
          <span style={S.sectionLabel}>Questions</span>
          <h2 style={{ ...S.h2, marginTop: 14, marginBottom: 40 }}>What buyers ask first.</h2>
          {FAQS.map((f, i) => (
            <div key={i} style={{ borderTop: `1px solid ${C.line}`, padding: "26px 0" }}>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 600, color: C.forest, marginBottom: 10 }}>{f.q}</div>
              <p style={S.muted}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section id="contact" style={{ background: C.forest, color: C.cream }}>
        <div style={{ ...S.container, padding: "96px 28px", textAlign: "center" }}>
          <h2 style={{ ...S.h2, color: C.cream, maxWidth: 720, margin: "0 auto" }}>
            Stop answering the same questions. Start proving every answer.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(234,228,214,0.75)", margin: "18px auto 32px", maxWidth: 540 }}>
            Live in under two hours. No credit card required. Your audit trail starts on day one.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/sign-up" style={{ ...S.btnPrimary, background: C.brass, color: C.deep, border: `1px solid ${C.brass}` }}>Start Free Trial →</Link>
            <a href="mailto:yuri@portlev.com?subject=AI%20HR%20Pilot%20Demo" style={{ ...S.btnGhost, color: C.cream, border: "1px solid rgba(245,240,232,0.4)" }}>Talk to the founder</a>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ background: C.deep, color: "rgba(234,228,214,0.6)" }}>
        <div style={{ ...S.container, padding: "36px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mark size={28} />
            <span style={{ fontFamily: serif, fontSize: 16, color: C.cream }}>AI HR Pilot</span>
          </div>
          <p style={{ fontSize: 12.5, margin: 0 }}>
            © 2026 AI HR Pilot · Portfolio Leverage Co.
            {"  ·  "}
            <a href="/privacy" style={{ color: C.brassSoft }}>Privacy</a>
            {"  ·  "}
            <a href="/terms" style={{ color: C.brassSoft }}>Terms</a>
            {"  ·  "}
            <a href="mailto:yuri@portlev.com" style={{ color: C.brassSoft }}>Contact</a>
          </p>
        </div>
      </footer>

      {/* ===================== FAQ JSON-LD ===================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
