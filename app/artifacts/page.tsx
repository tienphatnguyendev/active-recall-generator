import { Nav } from "@/components/nav";
import { createClient } from "@/utils/supabase/server";
import { ArtifactsClient } from "./artifacts-client";

export default async function ArtifactsPage() {
  const supabase = await createClient();

  // Fetch artifacts and their related cards (qaPairs)
  const { data: rawArtifacts, error } = await supabase
    .from("artifacts")
    .select("*, cards(*)")
    .order("created_at", { ascending: false });

  // Map the Supabase snake_case data to the camelCase props expected by the Client Component
  const artifacts = (rawArtifacts || []).map((artifact) => ({
    id: artifact.id,
    source: artifact.source_hash ? artifact.source_hash.substring(0, 8) + "..." : "Unknown Source",
    book: artifact.title?.split(" - ")[0] || "Unknown Book",
    chapter: artifact.title?.split(" - ")[1] || "Unknown Chapter",
    section: artifact.title || (artifact.source_hash ? `Document (${artifact.source_hash.substring(0, 8)})` : "Document"),
    createdAt: artifact.created_at,
    outline: artifact.outline || [],
    qaPairs: (artifact.cards || []).map((card: { question: string; answer: string; source_context: string | null; judge_score: number | null; judge_feedback: string | null }) => ({
      question: card.question,
      answer: card.answer,
      sourceContext: card.source_context,
      judgeScore: card.judge_score,
      judgeFeedback: card.judge_feedback,
    })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Artifacts
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Processed chapters
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse your generated Q&A artifacts and outlines stored in Supabase.
          </p>
        </div>

        {error ? (
          <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load artifacts: {error.message}
          </div>
        ) : (
          <ArtifactsClient artifacts={artifacts} />
        )}
      </main>
    </div>
  );
}
