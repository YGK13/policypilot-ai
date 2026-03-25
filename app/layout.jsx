import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "./AppShell";

// ============================================================================
// ROOT LAYOUT — Server component shell + client AppShell for persistent state
// AppShell wraps all pages so shared state (tickets, audit log, settings,
// employee context) persists across Next.js client-side navigations.
// ============================================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "HRPilot AI | Enterprise HR Intelligence Platform",
  description: "AI-powered HR policy & benefits chatbot with triage capability",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
