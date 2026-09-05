// ============================================================================
// MARKETING SITE TESTS — guards the public surface against drift:
//   1. Pricing shown on the marketing pages and in llms.txt matches
//      lib/data/plans.js (which Stripe checkout resolves against).
//   2. Coverage claims are computed from the jurisdiction database, not typed.
//   3. Every blog post and every public marketing route is in the sitemap,
//      and every marketing route is public in proxy.ts.
//   4. FAQ entries are well-formed (AEO needs a question and a direct answer).
//   5. No unearned claims: llms.txt must not assert a SOC 2 certification.
// ============================================================================

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import PLANS from "@/lib/data/plans";
import JURISDICTIONS from "@/lib/data/jurisdictions";
import { POSTS } from "@/content/blog/posts";
import sitemap, { STATIC_ROUTES } from "@/app/sitemap";
import {
  PLAN_ROWS, ALL_FAQS, HOME_FAQS, COVERAGE_ROWS, STATE_NAMES, FEED_ROWS, SIXTY_SECONDS, PRICING_MATRIX,
  softwareLd, faqLd, breadcrumbLd, pageMeta, SITE_URL,
} from "@/lib/marketing/site";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

describe("pricing consistency", () => {
  it("marketing plan rows mirror lib/data/plans.js", () => {
    expect(PLAN_ROWS.map((p) => [p.id, p.price])).toEqual(PLANS.map((p) => [p.id, p.price]));
  });

  it("llms.txt states the same three prices", () => {
    const txt = read("public/llms.txt");
    for (const p of PLANS) expect(txt).toContain(`$${p.price}/month`);
  });

  it("SoftwareApplication JSON-LD carries one Offer per plan with the right price", () => {
    const ld = softwareLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.offers.map((o) => o.price)).toEqual(PLANS.map((p) => String(p.price)));
    expect(ld.offers.every((o) => o.priceCurrency === "USD")).toBe(true);
  });
});

describe("coverage proof is computed, not typed", () => {
  it("renders every jurisdiction in the database", () => {
    expect(COVERAGE_ROWS.map((r) => r.name)).toEqual(Object.keys(JURISDICTIONS));
    expect(STATE_NAMES).not.toContain("Federal");
    expect(STATE_NAMES.length).toBe(Object.keys(JURISDICTIONS).length - 1);
  });

  it("the state-coverage FAQ names the real state count", () => {
    const f = ALL_FAQS.find((x) => x.q.startsWith("Which states"));
    expect(f.a).toContain(`${STATE_NAMES.length} state`);
    for (const s of STATE_NAMES) expect(f.a).toContain(s);
  });
});

describe("sitemap + public routes", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("includes every blog post", () => {
    for (const p of POSTS) expect(urls).toContain(`${SITE_URL}/blog/${p.slug}`);
  });

  it("includes every static marketing route with a lastModified", () => {
    for (const r of STATIC_ROUTES) {
      const e = entries.find((x) => x.url === `${SITE_URL}${r.path}`);
      expect(e, r.path).toBeDefined();
      expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every static marketing route is public in proxy.ts", () => {
    const proxy = read("proxy.ts");
    const block = proxy.slice(proxy.indexOf("createRouteMatcher(["), proxy.indexOf("]);"));
    for (const r of STATIC_ROUTES) {
      const needle = r.path === "/" ? '"/"' : `"${r.path}`;
      expect(block, `${r.path} missing from proxy public routes`).toContain(needle);
    }
    for (const must of ['"/api/health"', '"/sitemap.xml"', '"/robots.txt"', '"/llms.txt"', '"/llms-full.txt"', '"/opengraph-image(.*)"']) {
      expect(block).toContain(must);
    }
  });

  it("the static robots/sitemap files were replaced by metadata routes", () => {
    expect(fs.existsSync(path.join(root, "public/sitemap.xml"))).toBe(false);
    expect(fs.existsSync(path.join(root, "public/robots.txt"))).toBe(false);
    expect(fs.existsSync(path.join(root, "app/robots.js"))).toBe(true);
  });
});

describe("FAQ + structured data", () => {
  it("every FAQ has a question and a direct answer of reasonable length", () => {
    expect(ALL_FAQS.length).toBeGreaterThanOrEqual(12);
    for (const f of ALL_FAQS) {
      expect(f.q.endsWith("?")).toBe(true);
      expect(f.a.length).toBeGreaterThan(60);
    }
    expect(new Set(ALL_FAQS.map((f) => f.q)).size).toBe(ALL_FAQS.length);
  });

  it("home FAQ is a subset of the full FAQ", () => {
    for (const f of HOME_FAQS) expect(ALL_FAQS).toContain(f);
  });

  it("FAQPage and BreadcrumbList builders produce valid shapes", () => {
    const f = faqLd(HOME_FAQS);
    expect(f.mainEntity.length).toBe(HOME_FAQS.length);
    const b = breadcrumbLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]);
    expect(b.itemListElement[1]).toMatchObject({ position: 2, item: `${SITE_URL}/pricing` });
  });

  it("pageMeta sets canonical, OG image and large Twitter card", () => {
    const m = pageMeta({ title: "T", description: "D", path: "/pricing" });
    expect(m.alternates.canonical).toBe(`${SITE_URL}/pricing`);
    expect(m.openGraph.images[0]).toMatchObject({ width: 1200, height: 630 });
    expect(m.twitter.card).toBe("summary_large_image");
  });
});

describe("no unearned claims", () => {
  it("llms.txt does not claim a SOC 2 certification for the product", () => {
    const txt = read("public/llms.txt");
    expect(txt).not.toMatch(/SOC 2 Type II certified,/);
    expect(txt).toMatch(/NOT completed its own SOC 2/);
  });

  it("no marketing page mentions a model vendor by name", () => {
    // Including the privacy policy: the subprocessor disclosure names the
    // gateway we contract with, not the model vendors behind it.
    const dir = path.join(root, "app/(marketing)");
    const files = [];
    (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dir);
    for (const f of files) {
      const s = fs.readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/Anthropic|OpenAI|Claude|GPT-4/);
    }
    const postsDir = path.join(root, "content/blog/posts");
    for (const f of fs.readdirSync(postsDir)) {
      const s = fs.readFileSync(path.join(postsDir, f), "utf8");
      expect(s, f).not.toMatch(/Anthropic|OpenAI|Claude|GPT-4/);
    }
  });

  it("no plan feature claims coverage the jurisdiction database does not have", () => {
    const states = STATE_NAMES.length;
    for (const p of PLANS) {
      for (const f of p.features) {
        const m = f.match(/(\d+)[- ]state/i);
        if (m) expect(Number(m[1]), `${p.id}: ${f}`).toBe(states);
      }
    }
  });

  it("no visible marketing copy uses an em dash", () => {
    const strings = [
      ...FEED_ROWS.flatMap((r) => [r.who, r.q, r.to || "", ...r.log]),
      ...SIXTY_SECONDS.flatMap((s) => [s.title, s.body]),
      ...PRICING_MATRIX.flatMap((r) => [r.feature, r.starter, r.professional, r.enterprise]),
      ...ALL_FAQS.flatMap((f) => [f.q, f.a]),
      ...PLANS.flatMap((p) => p.features),
      ...Object.values(JURISDICTIONS).flatMap((j) => Object.values(j)),
      ...POSTS.flatMap((p) => [p.title, p.seoTitle, p.description]),
    ].filter((v) => typeof v === "string");
    for (const s of strings) expect(s, s).not.toContain("\u2014");
  });
});


describe("metadata length budgets", () => {
  const pages = fs.readdirSync(path.join(root, "app/(marketing)"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("["))
    .map((d) => `app/(marketing)/${d.name}/page.jsx`)
    .concat(["app/(marketing)/page.jsx"])
    .filter((p) => fs.existsSync(path.join(root, p)));

  for (const rel of pages) {
    it(`${rel} keeps title <= 60 and description <= 155`, () => {
      const src = read(rel);
      const start = src.indexOf("pageMeta({");
      if (start === -1) return; // page has no metadata of its own
      const head = src.slice(start, start + 900);
      const title = head.match(/title:\s*"((?:[^"\\]|\\.)*)"/);
      const desc = head.match(/description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/);
      expect(title, rel).toBeTruthy();
      expect(desc, rel).toBeTruthy();
      // Every route but the home page inherits the " | AI HR Pilot" template.
      const suffix = rel === "app/(marketing)/page.jsx" ? 0 : " | AI HR Pilot".length;
      expect(title[1].length + suffix, `${rel} title`).toBeLessThanOrEqual(60);
      expect(desc[1].length, `${rel} description`).toBeLessThanOrEqual(155);
    });
  }

  it("every blog post has an SEO title that fits the template and a description under 155", () => {
    for (const p of POSTS) {
      expect(p.seoTitle, p.slug).toBeTruthy();
      expect(p.seoTitle.length + " | AI HR Pilot".length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(155);
    }
  });
});

describe("proxy route coverage", () => {
  it("every app/(app) route is protected, so unknown paths can 404 instead of redirecting", () => {
    const proxy = read("proxy.ts");
    const block = proxy.slice(proxy.indexOf("const isAppRoute"), proxy.indexOf("export default clerkMiddleware"));
    expect(block).toContain("/api(.*)");
    const dirs = fs.readdirSync(path.join(root, "app/(app)"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(dirs.length).toBeGreaterThan(5);
    for (const d of dirs) expect(block, `/${d} missing from proxy protected routes`).toContain(`"/${d}(.*)"`);
  });
});
