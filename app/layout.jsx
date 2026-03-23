import { Inter } from "next/font/google";
import "./globals.css";

// ============================================================================
// ROOT LAYOUT — Server component, wraps entire app
// ============================================================================

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "PolicyPilot AI | Enterprise HR Intelligence Platform",
  description: "AI-powered HR policy & benefits chatbot with triage capability",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
