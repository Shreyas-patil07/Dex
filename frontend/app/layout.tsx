import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/nav/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dex — Your Watch History. Your Identity.",
  description:
    "A Steam-style profile platform for movie, series, and anime watchers. Track everything. Discover what's next. Own your taste.",
  openGraph: {
    title: "Dex — Your Watch History. Your Identity.",
    description:
      "Track every movie, series, and anime you've watched. Get taste-powered recommendations. Build your cinema identity.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <div className="flex min-h-screen">
          {/* Sidebar nav — desktop only */}
          <Navbar />
          {/* Main content area */}
          <main className="flex-1 ml-0 md:ml-64 transition-all duration-300">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
