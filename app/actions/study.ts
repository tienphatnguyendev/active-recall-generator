"use server";

import { createClient } from "@/utils/supabase/server";

// Simple single-card study log (existing interface, kept for backward compat)
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

// Typed result interface for bulk study sessions
interface StudyResult {
  cardId: string;
  rating: number;
  duration_ms?: number;
  state_before?: number;
  state_after?: number;
  fsrs?: {
    state?: number;
    due?: string;
    stability?: number;
    difficulty?: number;
    elapsed_days?: number;
    scheduled_days?: number;
    reps?: number;
    lapses?: number;
  };
}

// Bulk study session logger with FSRS support
export async function logBulkStudySession(
  artifactId: string,
  mode: string,
  duration: number,
  results: StudyResult[]
) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be logged in to log study sessions");
  }

  if (!artifactId || !mode) {
    throw new Error("Artifact ID and mode are required");
  }

  if (!results || results.length === 0) {
    throw new Error("At least one study result is required");
  }

  // Bulk insert study session records
  const sessionRecords = results.map((r) => ({
    user_id: user.id,
    card_id: r.cardId,
    rating: r.rating || 3,
    duration_ms: r.duration_ms || duration || 0,
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
  for (const r of results) {
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
    artifactId,
    mode,
    duration,
    resultsProcessed: results.length,
    completedAt: new Date().toISOString(),
  };
}