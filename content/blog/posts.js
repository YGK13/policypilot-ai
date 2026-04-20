// ============================================================================
// BLOG POSTS REGISTRY — AI HR Pilot
// ============================================================================
// Each post has: slug, title, description, keywords, date, readingTime, body (MDX-like markdown)
// The body is stored inline as a template literal to keep this self-contained.
// When we eventually move to a real CMS (Sanity, MDX files, etc.) this stays backward compatible.
// ============================================================================

export const POSTS = [
  {
    slug: "20-most-common-employee-questions-hr-teams-answer",
    title: "The 20 Most Common Employee Questions Your HR Team Answers Every Week (And How AI Handles Them Better)",
    description:
      "HR teams answer 1,200+ employee inquiries monthly. 73% are repetitive. Here are the top 20 questions and how AI handles them with policy-accurate citations.",
    keywords: "employee questions hr handles, hr chatbot, reduce hr tickets, hr automation",
    date: "2026-04-10",
    readingTime: "12 min read",
    category: "HR Operations",
  },
  {
    slug: "hr-chatbots-2026-complete-buyers-guide",
    title: "HR Chatbots in 2026: The Complete Buyer's Guide for Teams of 50-500",
    description:
      "Compare the top HR chatbots for SMB and mid-market teams. Pricing from $99-$200K+/year. Feature comparison, decision framework, and what to look for.",
    keywords: "best hr chatbot 2026, hr chatbot pricing, workativ alternative, leena ai alternative",
    date: "2026-04-12",
    readingTime: "14 min read",
    category: "Buyer's Guide",
  },
  {
    slug: "how-to-automate-hr-without-losing-human-touch",
    title: "How to Automate HR Without Losing the Human Touch: A CHRO's Framework",
    description:
      "A 3x CHRO's framework for automating HR operations — which tasks to automate, which to keep human, and how to implement in 4 weeks.",
    keywords: "how to automate hr tasks, hr automation, hr ai tools 2026, automate employee questions",
    date: "2026-04-14",
    readingTime: "11 min read",
    category: "HR Strategy",
  },
  {
    slug: "hr-onboarding-automation-guide",
    title: "The HR Leader's Guide to Onboarding Automation: Cut New Hire Time-to-Productivity by 40%",
    description:
      "Step-by-step onboarding automation guide for HR teams. 5 bottlenecks AI eliminates, 4-week implementation plan, ROI calculator.",
    keywords: "onboarding automation, ai onboarding, new hire automation, hr onboarding tools 2026",
    date: "2026-04-16",
    readingTime: "10 min read",
    category: "Onboarding",
  },
  {
    slug: "ai-hr-pilot-vs-workativ",
    title: "AI HR Pilot vs Workativ: Which HR Chatbot Is Right for Your Team?",
    description:
      "Side-by-side comparison of AI HR Pilot ($99-999/mo) vs Workativ ($349/mo). Features, pricing, compliance handling, and which is better for teams of 50-500.",
    keywords: "workativ alternative, ai hr pilot vs workativ, best hr chatbot for small business",
    date: "2026-04-18",
    readingTime: "9 min read",
    category: "Comparison",
  },
  {
    slug: "ai-hr-pilot-vs-leena-ai",
    title: "AI HR Pilot vs Leena AI: Enterprise HR Chatbot vs SMB Alternative",
    description:
      "Leena AI costs $50K-200K+/year and serves 5,000+ employee enterprises. AI HR Pilot starts at $99/mo for teams of 50-500. Full comparison inside.",
    keywords: "leena ai alternative, leena ai pricing, hr chatbot for small companies",
    date: "2026-04-19",
    readingTime: "9 min read",
    category: "Comparison",
  },
  {
    slug: "ai-hr-pilot-vs-moveworks",
    title: "AI HR Pilot vs Moveworks: Do You Really Need a $1M HR Chatbot?",
    description:
      "Moveworks costs $200K-1M+/year for enterprise AI. AI HR Pilot delivers 80% of the value at $99-999/month. Honest comparison from a 3x CHRO.",
    keywords: "moveworks alternative, moveworks pricing, enterprise hr chatbot alternative",
    date: "2026-04-20",
    readingTime: "10 min read",
    category: "Comparison",
  },
];

// Look up a single post by slug
export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug);
}

// Get posts sorted newest first
export function getAllPostsSorted() {
  return [...POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));
}
