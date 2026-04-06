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
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
