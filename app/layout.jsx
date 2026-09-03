import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// ============================================================================
// ROOT LAYOUT — Minimal server component shell
// ClerkProvider wraps everything for auth context.
// AppShell is in (app)/layout.jsx — NOT here — so the marketing pages can
// render without auth, sidebar, or dashboard chrome.
// ============================================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Mono face for citations, statute refs and metadata on the marketing surface.
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

const SITE_URL = "https://aihrpilot.com";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI HR Pilot | AI HR Policy & Compliance Copilot",
    template: "%s | AI HR Pilot",
  },
  description:
    "AI HR Pilot answers employee questions from your own handbook with citations, routes ADA, FMLA, harassment and wage questions to a human, and keeps an audit trail across federal law and 11 state jurisdictions.",
  applicationName: "AI HR Pilot",
  authors: [{ name: "Yuri Kruman", url: "https://yurikruman.com" }],
  creator: "Yuri Kruman",
  publisher: "Portfolio Leverage Company",
  openGraph: {
    type: "website",
    siteName: "AI HR Pilot",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#f7f7f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    // ------------------------------------------------------------------------
    // Post-auth redirects are pinned HERE, in code, on purpose.
    // @clerk/nextjs v7 reads ONLY signIn/signUp + FORCE/FALLBACK_REDIRECT_URL
    // props/env vars. The legacy NEXT_PUBLIC_CLERK_AFTER_SIGN_*_URL env vars are
    // NOT read by v7, so relying on them (or on the Clerk Dashboard "Paths"
    // setting) silently fell back to the instance default and dumped users on
    // the marketing homepage after sign-up. Hardcoding the props makes routing
    // deterministic and immune to env/dashboard drift.
    //   - signUpForceRedirectUrl : new accounts ALWAYS land in /onboarding
    //   - signInFallbackRedirectUrl: returning users go to their intended page,
    //                                or /dashboard when there isn't one
    // ------------------------------------------------------------------------
    <ClerkProvider
      signUpForceRedirectUrl="/onboarding"
      signInFallbackRedirectUrl="/dashboard"
    >
      <html lang="en">
        <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
