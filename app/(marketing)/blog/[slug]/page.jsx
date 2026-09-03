import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import { POSTS, getPost } from "@/content/blog/posts";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import JsonLd from "@/components/marketing/JsonLd";
import { pageMeta, SITE_URL, PRIMARY_CTA, TRIAL_TERMS } from "@/lib/marketing/site";

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
  const meta = pageMeta({ title: post.title, description: post.description, path: `/blog/${post.slug}`, type: "article" });
  meta.keywords = post.keywords;
  meta.openGraph.publishedTime = post.date;
  meta.openGraph.authors = ["https://yurikruman.com"];
  return meta;
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
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold — **text**
  out = out.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  // Italic — *text* (but not ** boundaries)
  out = out.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
  // Links — [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
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
      html += `<pre><code>${escapeHtml(code)}</code></pre>`;
      continue;
    }

    // ── Horizontal rule ──
    if (/^---+\s*$/.test(line)) {
      html += '<hr />';
      i++;
      continue;
    }

    // ── Headers ──
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const sizes = { 1: 36, 2: 28, 3: 22, 4: 18, 5: 16, 6: 15 };
      const margins = { 1: "48px 0 24px", 2: "40px 0 20px", 3: "32px 0 16px", 4: "24px 0 12px", 5: "20px 0 10px", 6: "18px 0 10px" };
      html += `<h${level}>${renderInline(h[2])}</h${level}>`;
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
      html += `<blockquote>${renderInline(quote.trim())}</blockquote>`;
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
      html += `<div class="tablewrap"><table><thead><tr>${headerCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead><tbody>`;
      for (const row of rows) {
        html += `<tr>${row.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`;
      }
      html += `</tbody></table></div>`;
      continue;
    }

    // ── Unordered list ──
    if (/^\s*[-*+]\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items += `<li>${renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`;
        i++;
      }
      html += `<ul>${items}</ul>`;
      continue;
    }

    // ── Ordered list ──
    if (/^\s*\d+\.\s+/.test(line)) {
      let items = "";
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items += `<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`;
        i++;
      }
      html += `<ol>${items}</ol>`;
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
    html += `<p>${renderInline(para)}</p>`;
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

  // Strip YAML frontmatter (title/meta/author block) so it never renders as prose.
  body = body.replace(/^---[\s\S]*?\n---\n?/, "");
  const html = renderMarkdown(body);

  // Article schema for SEO (JSON-LD)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    author: { "@type": "Person", "@id": "https://yurikruman.com/#person", name: "Yuri Kruman", url: "https://www.linkedin.com/in/yurikruman/" },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}/opengraph-image`,
    publisher: { "@type": "Organization", "@id": "https://portlev.com/#organization", name: "Portfolio Leverage Company", url: "https://portlev.com" },
  };

  return (
    <>
      <Breadcrumbs items={[{ name: "Blog", path: "/blog" }, { name: post.category, path: `/blog/${post.slug}` }]} />
      <article className="mk-article">
        <div className="mk-post__meta">
          <span>{post.category}</span>
          <span>·</span>
          <span>{post.readingTime}</span>
          <span>·</span>
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
          <span>·</span>
          <span>By Yuri Kruman, 3x CHRO, JD</span>
        </div>

        <div className="mk-article__body" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mk-card mk-card--ink mk-mt-40">
          <h2 className="mk-h3">Answer with citations. Route the risky ones. Keep the record.</h2>
          <p className="mk-body mk-mt-8">{TRIAL_TERMS} Upload your handbook and ask it the questions in this article.</p>
          <div className="mk-ctarow mk-mt-16">
            <Link href={PRIMARY_CTA.href} className="mk-btn mk-btn--signal" data-cta="article-trial">{PRIMARY_CTA.label}</Link>
            <Link href="/compare" className="mk-btn mk-btn--ghost" style={{ color: "#f7f7f5", borderColor: "#3a3b3f" }} data-cta="article-compare">Compare alternatives</Link>
          </div>
        </div>
      </article>
      <JsonLd data={articleSchema} />
    </>
  );
}
