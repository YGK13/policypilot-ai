import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import { POSTS, getPost } from "@/content/blog/posts";

// ============================================================================
// DYNAMIC BLOG ARTICLE PAGE — /blog/[slug]
// Reads markdown body from /content/blog/posts/[slug].md at build time,
// renders as styled HTML with FAQ schema for AEO and Article schema for SEO.
// ============================================================================

// ── Tell Next.js which slugs exist so it can statically generate them ──
export async function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

// ── Generate metadata per-article for SEO ──
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} | AI HR Pilot Blog`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://aihrpilot.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

// ============================================================================
// MINIMAL MARKDOWN RENDERER
// A dependency-free parser for the markdown dialect we actually use:
// headers, paragraphs, bold, italic, inline code, code fences, links, lists, tables, blockquotes, HR.
// Not a full CommonMark implementation — just enough to render our articles correctly.
// ============================================================================

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(s) {
  // Escape first, then apply inline transformations
  let out = escapeHtml(s);
  // Inline code — `code`
  out = out.replace(/`([^`]+)`/g, '<code style="background:#27272a;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>');
  // Bold — **text**
  out = out.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  // Italic — *text* (but not ** boundaries)
  out = out.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  // Links — [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" style="color:#60a5fa;text-decoration:underline">$1</a>');
  return out;
}

function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Code fence ```lang ... ``` ──
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      let code = "";
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      i++; // skip closing fence
      html += `<pre style="background:#111113;border:1px solid #27272a;border-radius:8px;padding:16px;overflow-x:auto;margin:24px 0;font-family:monospace;font-size:14px;line-height:1.6"><code>${escapeHtml(code)}</code></pre>`;
      continue;
    }

    // ── Horizontal rule ──
    if (/^---+\s*$/.test(line)) {
      html += '<hr style="border:0;border-top:1px solid #27272a;margin:40px 0" />';
      i++;
      continue;
    }

    // ── Headers ──
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = { 1: 36, 2: 28, 3: 22, 4: 18, 5: 16, 6: 15 };
      const margins = { 1: "48px 0 24px", 2: "40px 0 20px", 3: "32px 0 16px", 4: "24px 0 12px", 5: "20px 0 10px", 6: "18px 0 10px" };
      html += `<h${level} style="font-size:${sizes[level]}px;font-weight:${level <= 2 ? 800 : 700};line-height:1.3;margin:${margins[level]}">${renderInline(h[2])}</h${level}>`;
      i++;
      continue;
    }

    // ── Blockquote ──
    if (line.startsWith("> ")) {
      let quote = "";
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote += lines[i].slice(2) + "\n";
        i++;
      }
      html += `<blockquote style="border-left:3px solid #3b82f6;padding:8px 20px;margin:24px 0;color:#8b8fa3;font-style:italic">${renderInline(quote.trim())}</blockquote>`;
      continue;
    }

    // ── Table (GFM-style) ──
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      const headerCells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
      i += 2; // skip header and separator
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        const cells = lines[i].split("|").map((c) => c.trim()).filter((c) => c.length > 0);
        rows.push(cells);
        i++;
      }
      html += `<div style="overflow-x:auto;margin:24px 0"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>${headerCells.map((c) => `<th style="border:1px solid #27272a;padding:10px 14px;text-align:left;background:#111113;font-weight:600">${renderInline(c)}</th>`).join("")}</tr></thead><tbody>`;
      for (const row of rows) {
        html += `<tr>${row.map((c) => `<td style="border:1px solid #27272a;padding:10px 14px">${renderInline(c)}</td>`).join("")}</tr>`;
      }
      html += `</tbody></table></div>`;
      continue;
    }

    // ── Unordered list ──
    if (/^\s*[-*+]\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items += `<li style="margin-bottom:8px">${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`;
        i++;
      }
      html += `<ul style="margin:16px 0;padding-left:24px;color:#e4e4e7">${items}</ul>`;
      continue;
    }

    // ── Ordered list ──
    if (/^\s*\d+\.\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items += `<li style="margin-bottom:8px">${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`;
        i++;
      }
      html += `<ol style="margin:16px 0;padding-left:24px;color:#e4e4e7">${items}</ol>`;
      continue;
    }

    // ── Empty line ──
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Paragraph (accumulate adjacent non-special lines) ──
    let para = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para += " " + lines[i];
      i++;
    }
    html += `<p style="margin:0 0 18px;font-size:17px;line-height:1.75;color:#d4d4d8">${renderInline(para)}</p>`;
  }

  return html;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Read the article body from disk at build time
  const filePath = path.join(process.cwd(), "content", "blog", "posts", `${slug}.md`);
  let body = "";
  try {
    body = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    body = "# Article not found";
  }

  const html = renderMarkdown(body);

  // Article schema for SEO (JSON-LD)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Person", name: "Yuri Kruman", url: "https://www.linkedin.com/in/yurikruman" },
    datePublished: post.date,
    publisher: {
      "@type": "Organization",
      name: "AI HR Pilot",
      url: "https://aihrpilot.com",
    },
  };

  return (
    <div
      style={{
        background: "#09090b",
        color: "#e4e4e7",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ============ NAV ============ */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(9,9,11,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 700,
              fontSize: 18,
              color: "#e4e4e7",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                background: "#3b82f6",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              ⚡
            </span>
            AI HR Pilot
          </Link>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link href="/" style={{ color: "#8b8fa3", fontSize: 14, textDecoration: "none" }}>Home</Link>
            <Link href="/blog" style={{ color: "#8b8fa3", fontSize: 14, textDecoration: "none" }}>Blog</Link>
            <Link href="/sign-up" style={{ background: "#3b82f6", color: "#fff", padding: "10px 20px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ ARTICLE ============ */}
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 100px" }}>
        {/* ── Back link ── */}
        <Link href="/blog" style={{ color: "#60a5fa", fontSize: 14, textDecoration: "none", marginBottom: 24, display: "inline-block" }}>
          ← All articles
        </Link>

        {/* ── Meta ── */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, marginBottom: 24, fontSize: 13, color: "#8b8fa3" }}>
          <span style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", padding: "3px 10px", borderRadius: 4, fontWeight: 600 }}>
            {post.category}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{post.readingTime}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>

        {/* ── Rendered markdown ── */}
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ fontSize: 17, lineHeight: 1.75 }}
        />

        {/* ── CTA at end ── */}
        <div
          style={{
            background: "#111113",
            border: "1px solid #27272a",
            borderRadius: 12,
            padding: 32,
            marginTop: 48,
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Ready to stop drowning in employee questions?
          </h3>
          <p style={{ color: "#8b8fa3", marginBottom: 20, lineHeight: 1.6 }}>
            Deploy AI HR Pilot in under 2 hours. Free 7-day trial. No credit card required.
          </p>
          <Link
            href="/sign-up"
            style={{
              background: "#3b82f6",
              color: "#fff",
              padding: "14px 32px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Start Free Trial →
          </Link>
        </div>
      </article>

      {/* ============ FOOTER ============ */}
      <footer style={{ padding: "40px 0", borderTop: "1px solid #27272a", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#8b8fa3" }}>
          &copy; 2026 AI HR Pilot by Portfolio Leverage Co. &middot;{" "}
          <Link href="/" style={{ color: "#3b82f6" }}>Home</Link>{" "}&middot;{" "}
          <Link href="/blog" style={{ color: "#3b82f6" }}>Blog</Link>
        </p>
      </footer>

      {/* ============ JSON-LD SCHEMA ============ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </div>
  );
}
