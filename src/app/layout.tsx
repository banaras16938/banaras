import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SEARCH_ENGINE_INDEXING_ENABLED } from "@/config/public-site";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Game Results | Live Results & History",
  description: "View live game results, historical data, and betting schedules. Track morning and night game outcomes in real-time.",
  keywords: ["game results", "live results", "betting", "morning game", "night game"],
  // Keep every page of the website out of search engines:
  // renders <meta name="robots" content="noindex, nofollow">. See src/config/public-site.ts
  robots: {
    index: SEARCH_ENGINE_INDEXING_ENABLED,
    follow: SEARCH_ENGINE_INDEXING_ENABLED,
  },
  // No site icon. The default Vercel/Next.js favicon was removed; this empty icon
  // stops browsers from requesting /favicon.ico and replaces any cached copy of it.
  icons: {
    icon: "data:,",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-white`}>
        {children}
        <Toaster
          theme="light"
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
