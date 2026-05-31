import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

// ============================================================================
// ROOT LAYOUT — Minimal server component shell
// ClerkProvider wraps everything for auth context.
// AppShell is now in (app)/layout.jsx — NOT here — so the marketing landing
// page can render without auth, sidebar, or dashboard chrome.
// ============================================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "AI HR Pilot | Enterprise HR Intelligence Platform",
  description: "AI-powered HR policy & benefits chatbot with triage capability",
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
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
