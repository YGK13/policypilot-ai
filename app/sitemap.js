import { POSTS } from "@/content/blog/posts";
import { SITE_URL, LAST_UPDATED } from "@/lib/marketing/site";

// ============================================================================
// SITEMAP — metadata route (/sitemap.xml). Public in proxy.ts.
// Static marketing routes carry the rebuild date; blog posts carry their own.
// ============================================================================

export const STATIC_ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/features", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/compare", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/security", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap() {
  const statics = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: LAST_UPDATED,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const posts = POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...statics, ...posts];
}
