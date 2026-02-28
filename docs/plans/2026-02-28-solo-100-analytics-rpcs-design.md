# Analytics Queries via Supabase RPCs - Design (SOLO-100)

## Overview
This document outlines the design for replacing mock analytics data with real queries powered by Supabase PostgreSQL stored procedures (RPCs). We will calculate weekly activity, mastery distributions, study streaks, and topic performance entirely on the database side for optimal performance.

## Database Schema Context
We have the following tables:
- `users` (id, created_at)
- `artifacts` (id, user_id, title)
- `cards` (id, artifact_id, fsrs_state, fsrs_stability, etc.)
- `study_sessions` (id, card_id, user_id, rating, reviewed_at)

## Proposed RPC Functions

We will create a specific migration file (e.g., `20260228000000_analytics_rpcs.sql`) that defines the following PL/pgSQL functions. All functions will be accessible via Supabase `rpc()` calls from the Next.js server components or server actions.

### 1. `get_user_analytics_stats(p_user_id UUID)`
Returns high-level statistics:
- **Total Cards Reviewed:** Count of all `study_sessions` for the user.
- **Cards Mastered:** Count of `cards` where `fsrs_state = 2` (Review) and `fsrs_stability >= 21` (e.g., interval is 21+ days).
- **Average Accuracy:** Percentage of `study_sessions` where `rating >= 3` (Good or Easy).

### 2. `get_user_study_streak(p_user_id UUID)`
Calculates the study streak based on `study_sessions.reviewed_at` categorized by local date.
- **Current Streak:** Consecutive days counting backward from today or yesterday where session count > 0.
- **Longest Streak:** Maximum consecutive days historical string.
- Returns `current_streak`, `longest_streak`, and a boolean `studied_today`.

### 3. `get_weekly_activity(p_user_id UUID)`
Returns a daily breakdown of study activity for the last 7 days.
- Output array: `[{ date: 'YYYY-MM-DD', cards_studied: INT, session_count: INT }]`

### 4. `get_mastery_distribution(p_user_id UUID)`
Buckets the user's cards into 4 categories:
- **Mastered:** `fsrs_state = 2` AND `fsrs_stability >= 21`
- **Reviewing:** `fsrs_state = 2` AND `fsrs_stability < 21`
- **Learning/Relearning:** `fsrs_state IN (1, 3)`
- **New:** `fsrs_state = 0`

### 5. `get_artifacts_performance(p_user_id UUID)`
Aggregates performance at the artifact level.
- **Mastery Breakdown:** Known % (Good/Easy), Unsure % (Hard), Unknown % (Again) based on the latest sessions for cards in that artifact.
- **Weak Areas:** Returns the top 2-3 questions for each artifact with the highest number of "Again" (rating = 1) results or lowest stability.

## Integration Plan
1. Apply the new migration to the local Supabase instance.
2. Generate new TypeScript types using the Supabase CLI (`supabase gen types`).
3. Update `/app/api/analytics/route.ts` and `/app/api/study/route.ts` (or convert them entirely to Server Actions) to call these RPCs via the `@supabase/ssr` client.
4. Wire the returned data directly into the Recharts components in the frontend.
