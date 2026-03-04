import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-context";
import { PipelineProvider } from "@/components/pipeline/pipeline-context";
import { createClient } from "@/utils/supabase/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Active Recall Generator",
  description:
    "Transform Markdown textbook chapters into high-quality active recall Q&A artifacts using an AI-powered Draft → Judge → Revise pipeline.",
  keywords: ["active recall", "study", "AI", "flashcards", "Q&A", "markdown"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Attempt to get the session to grab access token if needed. Wait, in layout we can't easily get the access token from just getUser. We're using cookies.
  // Actually, getUser() is sufficient for user check. But we need accessToken.
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? null;

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-background`}
        suppressHydrationWarning
      >
        <AuthProvider user={user} accessToken={accessToken}>
          <PipelineProvider>
            {children}
          </PipelineProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

