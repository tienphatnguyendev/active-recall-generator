import { Nav } from "@/components/nav";
import { createClient } from "@/utils/supabase/server";
import { StudyClient } from "./study-client";
import { parseArtifactDisplay } from "@/lib/artifact-utils";

export default async function StudyPage() {
  const supabase = await createClient();

  // Fetch all artifacts with their cards
  const { data: rawArtifacts, error } = await supabase
    .from("artifacts")
    .select("*, cards(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Failed to load study cards: {error.message}
          </div>
        </main>
      </div>
    );
  }

  // Flatten the cards from all artifacts into the format StudyClient expects
  const initialCards = (rawArtifacts || []).flatMap((artifact) =>
    (artifact.cards || []).map((card: { id: string; question: string; answer: string; source_context: string | null; judge_score: number | null }) => ({
      id: card.id || Math.random().toString(36), // fallback id just in case
      question: card.question,
      answer: card.answer,
      source: parseArtifactDisplay(artifact.title, artifact.source_hash).source,
      judgeScore: card.judge_score || 0.85,
    }))
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <StudyClient initialCards={initialCards} />
    </div>
  );
}
