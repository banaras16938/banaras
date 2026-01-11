import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Game Results | Live Results & History",
  description: "View live game results, historical data, and betting schedules. Track morning and night game outcomes in real-time.",
  keywords: ["game results", "live results", "betting", "morning game", "night game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </body>
    </html>
  );
}
