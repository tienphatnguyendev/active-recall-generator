import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Active Recall Generator",
  description:
    "Transform Markdown textbook chapters into high-quality active recall Q&A artifacts using an AI-powered Draft → Judge → Revise pipeline.",
  keywords: ["active recall", "study", "AI", "flashcards", "Q&A", "markdown"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
