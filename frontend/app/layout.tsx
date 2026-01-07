import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/store/provider";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatsApp Dashboard",
  description: "WhatsApp Multi-Device Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 
          CRITICAL: Theme Script - Runs BEFORE React Hydration
          
          This blocking script:
          1. Executes synchronously before first paint
          2. Reads theme from localStorage (client-side only)
          3. Applies data-theme attribute to <html> element
          4. Prevents Flash of Unstyled Content (FOUC)
          
          Why this is hydration-safe:
          - suppressHydrationWarning on <html> tag prevents React warning
          - Script runs client-side only (browser executes it)
          - By the time React hydrates, data-theme is already set
          - No mismatch between server HTML and client HTML
          
          Redux Integration:
          - This script sets data-theme BEFORE Redux initializes
          - themeSlice reads from data-theme attribute (not localStorage)
          - Redux becomes the source of truth after initial load
          - No conflict between hydration script and Redux state
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  // Fallback to dark if localStorage is not available
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Redux Provider wraps the entire app */}
        <ReduxProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
