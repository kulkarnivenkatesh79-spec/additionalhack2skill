import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * Global metadata for SEO.
 * Provides title and description for the entire application.
 */
export const metadata: Metadata = {
  title: "AI Legal Assist — Simplify, Compare & Understand Legal Documents",
  description:
    "AI-powered legal assistance dashboard. Summarise legal documents, compare contracts, highlight risks, and ask questions — powered by Gemini 2.5 Flash.",
  keywords: [
    "legal AI",
    "document summariser",
    "contract comparison",
    "risk analysis",
    "legal tech",
  ],
};

/**
 * Root layout component.
 *
 * Wraps all pages with semantic HTML structure, Google Font (Inter),
 * and a consistent header/footer.
 *
 * @param props - Component props.
 * @param props.children - The rendered page content.
 * @returns The root layout JSX element.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {/* Background gradient mesh */}
        <div className="bg-mesh" aria-hidden="true" />

        {/* Skip link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
          style={{
            background: "var(--color-accent)",
            color: "white",
          }}
        >
          Skip to main content
        </a>

        {/* Header */}
        <header
          role="banner"
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "rgba(10, 14, 26, 0.8)",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div
            style={{
              maxWidth: "80rem",
              margin: "0 auto",
              padding: "1rem 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, var(--color-accent), #6d28d9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.125rem",
                }}
                aria-hidden="true"
              >
                ⚖️
              </div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  margin: 0,
                  background: "linear-gradient(135deg, var(--color-text-primary), var(--color-accent-hover))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI Legal Assist
              </h1>
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-text-muted)",
                fontWeight: 500,
              }}
            >
              Powered by Gemini 2.5 Flash
            </span>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" role="main">
          {children}
        </main>

        {/* Footer */}
        <footer
          role="contentinfo"
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "1.5rem",
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "0.8125rem",
          }}
        >
          <p style={{ margin: 0 }}>
            © {new Date().getFullYear()} AI Legal Assist · Built for hackathon
            demonstration purposes only.
          </p>
        </footer>
      </body>
    </html>
  );
}
