"use server";

import { createClient } from "@/utils/supabase/server";
import {
  logStudySessionSchema,
  logBulkStudySessionSchema,
  type StudyResultInput,
} from "@/lib/validations/study";

// Simple single-card study log (existing interface, kept for backward compat)
export async function logStudySession(
  cardId: string,
  ratingStr: "know" | "unsure" | "unknown",
  durationMs: number
) {
  // Validate input
  logStudySessionSchema.parse({ cardId, ratingStr, durationMs });

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

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
      state_before: 0,
      state_after: 0,
    });

  if (error) {
    console.error("Failed to insert study session:", error);
    throw new Error(`Failed to log study session: ${error.message}`);
  }
}

// Bulk study session logger with FSRS support
export async function logBulkStudySession(
  artifactId: string,
  mode: string,
  duration: number,
  results: StudyResultInput[]
) {
  // Validate input
  const validated = logBulkStudySessionSchema.parse({
    artifactId,
    mode,
    duration,
    results,
  });

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

  // Bulk insert study session records
  const sessionRecords = validated.results.map((r) => ({
    user_id: user.id,
    card_id: r.cardId,
    rating: r.rating,
    duration_ms: r.duration_ms || validated.duration || 0,
    state_before: r.state_before || 0,
    state_after: r.state_after || 0,
    reviewed_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("study_sessions")
    .insert(sessionRecords);

  if (insertError) {
    console.error("Error inserting study sessions:", insertError);
    throw new Error(`Failed to log study sessions: ${insertError.message}`);
  }

  // Update FSRS state on cards (only for results that have FSRS data)
  for (const r of validated.results) {
    if (r.cardId && r.fsrs) {
      const { error: updateError } = await supabase
        .from("cards")
        .update({
          fsrs_state: r.fsrs.state ?? r.state_after ?? 0,
          fsrs_due: r.fsrs.due ?? new Date().toISOString(),
          fsrs_stability: r.fsrs.stability ?? 0,
          fsrs_difficulty: r.fsrs.difficulty ?? 0,
          fsrs_elapsed_days: r.fsrs.elapsed_days ?? 0,
          fsrs_scheduled_days: r.fsrs.scheduled_days ?? 0,
          fsrs_reps: r.fsrs.reps ?? 0,
          fsrs_lapses: r.fsrs.lapses ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.cardId);

      if (updateError) {
        console.error(`Failed to update FSRS for card ${r.cardId}:`, updateError);
        // Don't throw — log the error but continue with other cards
      }
    }
  }

  return {
    artifactId: validated.artifactId,
    mode: validated.mode,
    duration: validated.duration,
    resultsProcessed: validated.results.length,
    completedAt: new Date().toISOString(),
  };
}