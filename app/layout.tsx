import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Observatory — Fox Analytics",
  description: "Debug and analytics dashboard for The Fox AI audio guide",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <header className="header">
            <div className="header-inner">
              <div className="logo">
                <span className="logo-icon">🔭</span>
                <span className="logo-text">The Observatory</span>
              </div>
              <nav className="nav">
                <Link href="/" className="nav-link">Sessions</Link>
                <Link href="/events" className="nav-link">Live Feed</Link>
              </nav>
            </div>
          </header>
          <main className="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
