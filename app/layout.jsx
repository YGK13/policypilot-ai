import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import AppShell from "./AppShell";

// ============================================================================
// ROOT LAYOUT — Server component shell
// ClerkProvider wraps everything for auth context.
// AppShell provides app state + RBAC + sidebar/topbar chrome.
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
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
