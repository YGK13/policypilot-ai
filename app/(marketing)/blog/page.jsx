import Link from "next/link";
import Breadcrumbs from "@/components/marketing/Breadcrumbs";
import { getAllPostsSorted } from "@/content/blog/posts";
import { pageMeta } from "@/lib/marketing/site";

// ============================================================================
// BLOG INDEX — /blog. Lists all posts newest first. Public route.
// ============================================================================

export const metadata = pageMeta({
  title: "Blog | HR compliance, AI in HR, buyer's guides",
  description: "Practical writing from a 3x CHRO on AI in HR, compliance changes, employee questions and honest comparisons of HR chatbots for 50-2,000 person companies.",
  path: "/blog",
});

export default function BlogIndex() {
  const posts = getAllPostsSorted();
  return (
    <>
      <Breadcrumbs items={[{ name: "Blog", path: "/blog" }]} />
      <section className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-container" style={{ maxWidth: 880 }}>
          <div className="mk-sectionhead">
            <span className="mk-eyebrow">Blog</span>
            <h1 className="mk-h1">Notes from a CHRO who builds.</h1>
            <p className="mk-lead">Buyer&apos;s guides, comparisons and the questions employees actually ask. Written for HR leaders at 50 to 2,000 person companies.</p>
          </div>
          <div className="mk-grid">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mk-post">
                <div className="mk-post__meta">
                  <span>{p.category}</span>
                  <span>·</span>
                  <span>{p.readingTime}</span>
                  <span>·</span>
                  <time dateTime={p.date}>{new Date(p.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>
                </div>
                <h2 className="mk-post__title">{p.title}</h2>
                <p className="mk-body">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
