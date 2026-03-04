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

  // Group cards by book name derived from parseArtifactDisplay
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardsByBook = (rawArtifacts || []).reduce<Record<string, any[]>>((acc, artifact) => {
    const { book, source } = parseArtifactDisplay(artifact.title, artifact.source_hash);
    const key = book || 'All';
    if (!acc[key]) acc[key] = [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedCards = (artifact.cards || []).map((card: any) => ({
      id: card.id || Math.random().toString(36),
      question: card.question,
      answer: card.answer,
      source: source,
      judgeScore: card.judge_score || 0.85,
    }));
    
    acc[key].push(...mappedCards);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <StudyClient cardsByBook={cardsByBook} />
    </div>
  );
}
