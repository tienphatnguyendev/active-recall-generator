"use server";

import { createClient } from "@/lib/supabase/server";

export async function logStudySession(
  cardId: string,
  ratingStr: "know" | "unsure" | "unknown",
  durationMs: number
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

  // Map string rating to FSRS integer values for future compatibility
  // 1=Again(Unknown), 2=Hard(Unsure), 3=Good(Know)
  let rating = 1;
  if (ratingStr === "unsure") rating = 2;
  if (ratingStr === "know") rating = 3;

  const { error } = await supabase
    .from("study_sessions")
    .insert({
      card_id: cardId,
      user_id: user.id,
      rating: rating,
      duration_ms: durationMs,
      state_before: 0, // Placeholder for FSRS
      state_after: 0   // Placeholder for FSRS
    });

  if (error) {
    console.error("Failed to insert study session:", error);
    throw new Error(`Failed to log study session: ${error.message}`);
  }
}
