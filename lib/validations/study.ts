import { z } from "zod";

export const fsrsSchema = z.object({
  state: z.number().int().nonnegative().optional(),
  due: z.string().datetime().optional(),
  stability: z.number().nonnegative().optional(),
  difficulty: z.number().nonnegative().optional(),
  elapsed_days: z.number().int().nonnegative().optional(),
  scheduled_days: z.number().int().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  lapses: z.number().int().nonnegative().optional(),
});

export const studyRatingSchema = z.union([
  z.literal("know"),
  z.literal("unsure"),
  z.literal("unknown"),
]);

export const logStudySessionSchema = z.object({
  cardId: z.string().uuid("Invalid card ID"),
  ratingStr: studyRatingSchema,
  durationMs: z.number().int().nonnegative(),
});

export const studyResultSchema = z.object({
  cardId: z.string().uuid("Invalid card ID"),
  rating: z.number().int().min(1).max(4),
  duration_ms: z.number().int().nonnegative().optional(),
  state_before: z.number().int().nonnegative().optional(),
  state_after: z.number().int().nonnegative().optional(),
  fsrs: fsrsSchema.optional(),
});

export const logBulkStudySessionSchema = z.object({
  artifactId: z.string().uuid("Invalid artifact ID"),
  mode: z.string().min(1, "Mode is required"),
  duration: z.number().int().nonnegative(),
  results: z.array(studyResultSchema).min(1, "At least one study result is required"),
});

export type LogStudySessionInput = z.infer<typeof logStudySessionSchema>;
export type LogBulkStudySessionInput = z.infer<typeof logBulkStudySessionSchema>;
export type StudyResultInput = z.infer<typeof studyResultSchema>;
