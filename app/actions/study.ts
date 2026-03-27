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

  // Map to new study_sessions schema
  const { error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      cards_studied: 1,
      duration_seconds: Math.floor(durationMs / 1000),
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

  // Insert summary study session record
  const { error: insertError } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      cards_studied: validated.results.length,
      duration_seconds: validated.duration || 0,
    });

  if (insertError) {
    console.error("Error inserting study session summary:", insertError);
    throw new Error(`Failed to log study session: ${insertError.message}`);
  }

  // Update FSRS state on cards (mapping to new unprefixed columns)
  for (const r of validated.results) {
    if (r.cardId && r.fsrs) {
      const { error: updateError } = await supabase
        .from("cards")
        .update({
          fsrs_state: r.fsrs.state ?? r.state_after ?? 0,
          due: r.fsrs.due ?? new Date().toISOString(),
          stability: r.fsrs.stability ?? 0,
          difficulty: r.fsrs.difficulty ?? 0,
          elapsed_days: r.fsrs.elapsed_days ?? 0,
          scheduled_days: r.fsrs.scheduled_days ?? 0,
          reps: r.fsrs.reps ?? 0,
          lapses: r.fsrs.lapses ?? 0,
          last_review: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.cardId);

      if (updateError) {
        console.error(`Failed to update FSRS for card ${r.cardId}:`, updateError);
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