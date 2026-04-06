import Link from "next/link";

// ============================================================================
// PUBLIC LANDING PAGE — Marketing homepage for AI HR Pilot
// Server component. No auth required. No AppShell.
// This replaces the login wall as the first thing visitors see.
// Authenticated users see the "Go to Dashboard" button instead of "Start Free Trial"
// ============================================================================

export const metadata = {
  title: "AI HR Pilot | AI-Powered HR Chatbot for Teams of 50-500",
  description:
    "AI-powered HR chatbot that answers employee questions in seconds with policy citations. Built by a 3x CHRO. Deploys in 2 hours. Starts at $99/month.",
  keywords:
    "hr chatbot, ai hr assistant, employee self service chatbot, hr policy chatbot, hr automation",
  openGraph: {
    title: "AI HR Pilot | Your HR Team's AI Co-Pilot",
    description:
      "Answers employee questions in seconds, not days. Built by a 3x CHRO with a law degree.",
    url: "https://aihrpilot.com",
    type: "website",
  },
};

// ============================================================================
// DATA — Features, pricing, testimonials, FAQ defined as arrays
// ============================================================================

const FEATURES = [
  {
    icon: "📋",
    title: "Policy Intelligence",
    desc: "Answers from YOUR handbook, not generic AI. Every response cites the specific policy section.",
  },
  {
    icon: "🔀",
    title: "Smart Triage",
    desc: "Classifies tickets by urgency, topic, and compliance sensitivity. Routes to the right person.",
  },
  {
    icon: "🛡️",
    title: "Compliance Guardrails",
    desc: "Built by a CHRO with a law degree. Flags legally sensitive topics before they become problems.",
  },
  {
    icon: "💬",
    title: "Multi-Channel",
    desc: "Slack, Teams, email, or embedded widget. Meets employees where they are.",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "See what employees ask most. Identify policy gaps. Measure resolution time.",
  },
  {
    icon: "🚀",
    title: "Onboarding Accelerator",
    desc: "New hires get instant answers from Day 1. Reduces HR onboarding load by 40%.",
  },
];

const PRICING = [
  {
    tier: "Starter",
    price: "$99",
    period: "/month",
    employees: "Up to 100",
    features: [
      "10 policy documents",
      "Web widget channel",
      "Basic triage routing",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    tier: "Professional",
    price: "$349",
    period: "/month",
    employees: "Up to 500",
    features: [
      "50 policy documents",
      "Slack + Teams + web widget",
      "Advanced triage routing",
      "Full analytics + reports",
      "FMLA, ADA compliance flags",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    tier: "Enterprise",
    price: "$999",
    period: "/month",
    employees: "Unlimited",
    features: [
      "Unlimited documents",
      "All channels + email + API",
      "Custom triage workflows",
      "Custom reports + exports",
      "Custom compliance rules",
      "Dedicated CSM",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote:
      "We went from 200+ Slack DMs per week to under 30. AI HR Pilot handles the rest with better accuracy than our wiki ever did.",
    author: "HR Director",
    company: "250-person SaaS company",
  },
  {
    quote:
      "The compliance flagging alone is worth the price. It caught a potential ADA issue we would have missed.",
    author: "VP People",
    company: "Healthcare startup",
  },
  {
    quote:
      "I manage HR for 3 portfolio companies. AI HR Pilot is deployed across all of them. Best $1K/month I spend.",
    author: "Fractional CHRO",
    company: "3 portfolio companies",
  },
];

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Most teams are live in under 2 hours. Upload your handbook, configure your channels, done.",
  },
  {
    q: "Is my data secure?",
    a: "SOC 2 Type II certified. 256-bit AES encryption. Your data never trains our models.",
  },
  {
    q: "What if the AI gives a wrong answer?",
    a: "Every response includes a confidence score and policy citation. Low-confidence answers auto-escalate to a human.",
  },
  {
    q: "Can I customize the responses?",
    a: "Yes. You set the tone, approved language, and escalation rules. The AI follows your playbook.",
  },
  {
    q: "What about sensitive topics?",
    a: "Built-in compliance guardrails flag harassment, discrimination, ADA, FMLA, and other legally sensitive topics before responding.",
  },
];

// ============================================================================
// STYLES — Inline styles object for the landing page
// Dark theme with blue accent matching AI HR Pilot brand
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
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
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
  navLinks: {
    listStyle: "none", display: "flex", gap: 28, padding: 0, margin: 0,
  },
  navLink: { color: "#8b8fa3", fontSize: 14, fontWeight: 500, textDecoration: "none" },
  container: { maxWidth: 1100, margin: "0 auto", padding: "0 24px" },
  section: { padding: "100px 0" },
  sectionAlt: { padding: "100px 0", background: "#111113" },
  label: {
    display: "inline-block", fontSize: 13, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: 2, color: "#3b82f6", marginBottom: 16,
  },
  h1: {
    fontSize: "clamp(36px, 5.5vw, 56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 24,
  },
  h2: {
    fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20,
  },
  gradient: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #60a5fa 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
  },
  subhead: {
    fontSize: 18, color: "#8b8fa3", maxWidth: 640, margin: "0 auto 36px", lineHeight: 1.7,
  },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "16px 32px", borderRadius: 8, fontWeight: 600, fontSize: 16,
    textDecoration: "none", cursor: "pointer", border: "none",
  },
  btnPrimary: { background: "#3b82f6", color: "#fff" },
  btnSecondary: { background: "transparent", color: "#e4e4e7", border: "1px solid #27272a" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24,
  },
  card: {
    background: "#09090b", border: "1px solid #27272a", borderRadius: 12, padding: 32,
  },
  cardHover: {
    background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 32,
  },
  muted: { color: "#8b8fa3", fontSize: 15 },
  badge: {
    background: "#111113", border: "1px solid #27272a", borderRadius: 8,
    padding: "8px 16px", fontSize: 13, fontWeight: 500,
  },
  // Pricing
  pricingCard: {
    background: "#09090b", border: "1px solid #27272a", borderRadius: 16, padding: 36,
  },
  pricingFeatured: {
    background: "#09090b", border: "2px solid #3b82f6", borderRadius: 16, padding: 36,
    position: "relative",
  },
  pricingPrice: { fontFamily: "monospace", fontSize: 42, fontWeight: 700 },
  // Testimonial
  testimonialCard: {
    background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 32,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function LandingPage() {
  return (
    <div style={S.page}>
      {/* ============ NAVIGATION ============ */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <a href="#" style={S.brand}>
            <span style={S.brandIcon}>⚡</span>
            AI HR Pilot
          </a>
          <ul style={S.navLinks}>
            <li><a href="#problem" style={S.navLink}>Problem</a></li>
            <li><a href="#solution" style={S.navLink}>How It Works</a></li>
            <li><a href="#features" style={S.navLink}>Features</a></li>
            <li><a href="#pricing" style={S.navLink}>Pricing</a></li>
            <li><a href="#faq" style={S.navLink}>FAQ</a></li>
          </ul>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="/sign-in" style={{ ...S.btn, ...S.btnSecondary, padding: "10px 20px", fontSize: 14 }}>
              Log In
            </Link>
            <a href="#final-cta" style={{ ...S.btn, ...S.btnPrimary, padding: "10px 20px", fontSize: 14 }}>
              Start Free Trial
            </a>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section style={{ ...S.section, paddingTop: 140, textAlign: "center", position: "relative" }}>
        <div style={S.container}>
          <span style={S.label}>Enterprise HR Intelligence Platform</span>
          <h1 style={S.h1}>
            Your HR Team&apos;s AI Co-Pilot.
            <br />
            <span style={S.gradient}>Answers Employee Questions in Seconds, Not Days.</span>
          </h1>
          <p style={S.subhead}>
            AI-powered HR chatbot that knows your policies, routes complex issues to
            the right team, and keeps you compliant. Built by a 3x CHRO, not just engineers.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
            <Link href="/sign-up" style={{ ...S.btn, ...S.btnPrimary }}>
              Start Free Trial →
            </Link>
            <a href="#solution" style={{ ...S.btn, ...S.btnSecondary }}>
              See How It Works
            </a>
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <span style={S.badge}>🔒 SOC 2 Type II</span>
            <span style={S.badge}>🔐 256-bit AES Encryption</span>
            <span style={S.badge}>🌍 GDPR Compliant</span>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section id="problem" style={S.sectionAlt}>
        <div style={S.container}>
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 60px" }}>
            <span style={S.label}>The Problem</span>
            <h2 style={S.h2}>
              Your HR team spends 60% of their time answering the{" "}
              <span style={S.gradient}>same questions.</span>
            </h2>
            <p style={S.muted}>
              The average HR department handles 1,200+ employee inquiries per month.
              73% are repetitive questions with documented answers. (SHRM, 2026)
            </p>
          </div>
          <div style={S.grid}>
            {[
              { icon: "📥", title: "Tier 1 tickets consume your best people", desc: "PTO balances, benefits questions, policy lookups — your senior HR talent shouldn't be a human search engine." },
              { icon: "⚠️", title: "Compliance risk grows with every verbal answer", desc: "Inconsistent responses across your team create legal exposure. One wrong answer on ADA or FMLA can cost six figures." },
              { icon: "⏳", title: "New hires wait days for answers that should take seconds", desc: "Onboarding bottlenecks kill engagement. 20% of new hire turnover happens in the first 45 days." },
            ].map((p, i) => (
              <div key={i} style={S.card}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{p.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{p.title}</h3>
                <p style={S.muted}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="solution" style={S.section}>
        <div style={{ ...S.container, textAlign: "center" }}>
          <span style={S.label}>How It Works</span>
          <h2 style={S.h2}>
            Three steps to <span style={S.gradient}>silence the Slack DMs.</span>
          </h2>
          <div style={{ ...S.grid, marginTop: 60 }}>
            {[
              { num: "1", title: "Upload Your Policies", desc: "Upload your handbook, benefits docs, and compliance materials. AI indexes everything in minutes." },
              { num: "2", title: "Deploy Your AI HR Agent", desc: "Employees ask questions via chat. AI provides instant, policy-accurate answers with citations." },
              { num: "3", title: "Route What Needs a Human", desc: "Complex issues (harassment, ADA, FMLA) auto-escalate to the right HR team member with full context." },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: 32 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(59,130,246,0.15)", border: "2px solid #3b82f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: "#3b82f6",
                  margin: "0 auto 20px",
                }}>{s.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{s.title}</h3>
                <p style={S.muted}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" style={S.sectionAlt}>
        <div style={S.container}>
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 60px" }}>
            <span style={S.label}>Features</span>
            <h2 style={S.h2}>
              Built by a CHRO. <span style={S.gradient}>Not just engineers.</span>
            </h2>
          </div>
          <div style={S.grid}>
            {FEATURES.map((f, i) => (
              <div key={i} style={S.cardHover}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ ...S.muted, fontSize: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section style={S.section}>
        <div style={{ ...S.container, textAlign: "center" }}>
          <span style={S.label}>What HR Leaders Say</span>
          <h2 style={S.h2}>
            Trusted by <span style={S.gradient}>growing teams.</span>
          </h2>
          <div style={{ ...S.grid, marginTop: 60 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={S.testimonialCard}>
                <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 20, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.author}</div>
                <div style={{ fontSize: 13, color: "#8b8fa3" }}>{t.company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={S.sectionAlt}>
        <div style={{ ...S.container, textAlign: "center" }}>
          <span style={S.label}>Pricing</span>
          <h2 style={S.h2}>
            Less than the cost of <span style={S.gradient}>one HR coordinator&apos;s week.</span>
          </h2>
          <p style={{ ...S.muted, marginTop: 8 }}>All plans include 7-day free trial. No credit card required.</p>
          <div style={{ ...S.grid, marginTop: 60 }}>
            {PRICING.map((p, i) => (
              <div key={i} style={p.featured ? S.pricingFeatured : S.pricingCard}>
                {p.featured && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, padding: "4px 16px", borderRadius: 20,
                  }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#3b82f6", marginBottom: 8 }}>
                  {p.tier}
                </div>
                <div style={S.pricingPrice}>{p.price}</div>
                <div style={{ fontSize: 14, color: "#8b8fa3", marginBottom: 4 }}>{p.period}</div>
                <div style={{ fontSize: 13, color: "#8b8fa3", marginBottom: 24 }}>{p.employees} employees</div>
                <ul style={{ listStyle: "none", padding: 0, marginBottom: 32, textAlign: "left" }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ padding: "8px 0", fontSize: 14, color: "#8b8fa3", display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.tier === "Enterprise" ? "#final-cta" : "/sign-up"}
                  style={{
                    ...S.btn,
                    ...(p.featured ? S.btnPrimary : S.btnSecondary),
                    display: "block", width: "100%", textAlign: "center",
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BUILDER CREDIBILITY ============ */}
      <section style={S.section}>
        <div style={S.container}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <span style={S.label}>Why AI HR Pilot</span>
              <h2 style={S.h2}>
                Built by a CHRO,<br /><span style={S.gradient}>not just engineers.</span>
              </h2>
              <p style={{ ...S.muted, fontSize: 16, lineHeight: 1.7, marginTop: 16 }}>
                Every HR chatbot on the market was built by engineers who&apos;ve never sat in
                an employee relations meeting. AI HR Pilot was built by someone who&apos;s
                conducted thousands of them.
              </p>
              <p style={{ ...S.muted, fontSize: 16, lineHeight: 1.7, marginTop: 12 }}>
                The compliance guardrails aren&apos;t an afterthought — they&apos;re the
                architecture. Because when an employee asks about harassment, the last thing
                you want is an AI making up an answer.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                "3x CHRO", "JD, Cardozo Law", "BA, UPenn",
                "AI Trainer: Meta, Microsoft, OpenAI",
                "2,300+ Executives Coached",
                "Top 5 Global HR Thought Leader",
                "Featured: Forbes, HBR, Fast Company",
              ].map((c, i) => (
                <span key={i} style={S.badge}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={S.sectionAlt}>
        <div style={{ ...S.container, textAlign: "center" }}>
          <span style={S.label}>FAQ</span>
          <h2 style={S.h2}>Common questions.</h2>
          <div style={{ maxWidth: 700, margin: "48px auto 0", textAlign: "left" }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ borderBottom: "1px solid #27272a", padding: "24px 0" }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{f.q}</div>
                <p style={{ ...S.muted, lineHeight: 1.7 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section id="final-cta" style={{ textAlign: "center", padding: "100px 0" }}>
        <div style={S.container}>
          <h2 style={S.h2}>
            Stop Drowning in Tier 1 Tickets.
            <br />
            <span style={S.gradient}>Start Your Free Trial.</span>
          </h2>
          <p style={{ ...S.muted, fontSize: 17, marginBottom: 32 }}>
            No credit card required. Live in under 2 hours.
          </p>
          <Link href="/sign-up" style={{ ...S.btn, ...S.btnPrimary }}>
            Get Started Free →
          </Link>
          <p style={{ fontSize: 13, color: "#8b8fa3", marginTop: 16 }}>
            Join growing teams who answer employee questions with AI, not Slack DMs.
          </p>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid #27272a", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#8b8fa3" }}>
          &copy; 2026 AI HR Pilot by Portfolio Leverage Co. All rights reserved.
          {" | "}
          <a href="mailto:yuri.kruman@gmail.com" style={{ color: "#3b82f6" }}>Contact</a>
          {" | "}
          <a href="https://portlev.com" style={{ color: "#3b82f6" }}>PortLev.com</a>
        </p>
      </footer>

      {/* ============ FAQ STRUCTURED DATA (JSON-LD) ============ */}
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
