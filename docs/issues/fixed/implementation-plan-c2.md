# Implementation Plan: C2 — SECURITY DEFINER RPCs Accept Arbitrary `p_user_id`

## Issue Summary

The three analytics RPC functions (`get_user_streak`, `get_weekly_activity`, `get_mastery_distribution`) accept a `p_user_id UUID` parameter and run as `SECURITY DEFINER`. Any authenticated user can call these functions with any user's ID and view their private analytics data. This is a data-leak vulnerability.

## Technical Approach

Remove the `p_user_id` parameter from all three RPCs and use `auth.uid()` directly inside the function body. Change from `SECURITY DEFINER` to `SECURITY INVOKER` so the function runs with the caller's permissions. This eliminates the ability to pass arbitrary user IDs.

## Implementation Steps

### Step 1: Create a new migration file (30 min)

**Dependencies**: None

Create `supabase/migrations/20260301000000_fix_rpc_security.sql`:

```sql
-- Fix: Remove p_user_id parameter, use auth.uid() directly, switch to SECURITY INVOKER

CREATE OR REPLACE FUNCTION public.get_user_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_current_streak INT := 0;
    v_longest_streak INT := 0;
    v_studied_today BOOLEAN := false;
    v_recent_days jsonb;
    v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    WITH distinct_study_dates AS (
        SELECT DISTINCT (reviewed_at AT TIME ZONE 'UTC')::DATE as study_date
        FROM public.study_sessions
        WHERE user_id = v_user_id
    ),
    groups AS (
        SELECT study_date,
               study_date - (ROW_NUMBER() OVER (ORDER BY study_date ASC))::INT AS grp
        FROM distinct_study_dates
    ),
    streaks AS (
        SELECT COUNT(*) as streak_length, MAX(study_date) as end_date
        FROM groups GROUP BY grp
    )
    SELECT
        COALESCE(MAX(streak_length), 0),
        COALESCE(MAX(CASE WHEN end_date >= v_today - 1 THEN streak_length ELSE 0 END), 0)
    INTO v_longest_streak, v_current_streak
    FROM streaks;

    SELECT EXISTS (
        SELECT 1 FROM public.study_sessions
        WHERE user_id = v_user_id
        AND (reviewed_at AT TIME ZONE 'UTC')::DATE = v_today
    ) INTO v_studied_today;

    WITH last_7_days AS (
        SELECT (v_today - (generate_series(6, 0, -1) || ' days')::INTERVAL)::DATE AS d
    )
    SELECT jsonb_agg(
        jsonb_build_object('date', d.d, 'studied', EXISTS (
            SELECT 1 FROM public.study_sessions
            WHERE user_id = v_user_id
            AND (reviewed_at AT TIME ZONE 'UTC')::DATE = d.d
        )) ORDER BY d.d ASC
    ) INTO v_recent_days FROM last_7_days d;

    RETURN jsonb_build_object(
        'currentStreak', v_current_streak,
        'longestStreak', v_longest_streak,
        'studiedToday', v_studied_today,
        'recentDays', COALESCE(v_recent_days, '[]'::jsonb)
    );
END;
$$;

-- Repeat for get_weekly_activity (remove p_user_id, use auth.uid())
CREATE OR REPLACE FUNCTION public.get_weekly_activity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result jsonb;
    v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    WITH last_7_days AS (
        SELECT (v_today - (generate_series(6, 0, -1) || ' days')::INTERVAL)::DATE AS d
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', d.d,
            'cardsStudied', COALESCE(stats.cards_studied, 0),
            'sessionCount', COALESCE(stats.session_count, 0)
        ) ORDER BY d.d ASC
    ) INTO v_result
    FROM last_7_days d
    LEFT JOIN (
        SELECT (reviewed_at AT TIME ZONE 'UTC')::DATE as study_date,
               COUNT(DISTINCT card_id) as cards_studied,
               COUNT(id) as session_count
        FROM public.study_sessions
        WHERE user_id = v_user_id AND reviewed_at >= (v_today - INTERVAL '6 days')
        GROUP BY (reviewed_at AT TIME ZONE 'UTC')::DATE
    ) stats ON d.d = stats.study_date;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Repeat for get_mastery_distribution (remove p_user_id, use auth.uid())
CREATE OR REPLACE FUNCTION public.get_mastery_distribution()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result jsonb;
    v_total_cards INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    WITH card_stats AS (
        SELECT
            CASE
                WHEN fsrs_state = 0 THEN 'new'
                WHEN fsrs_state IN (1, 3) THEN 'learning'
                WHEN fsrs_state = 2 AND fsrs_stability < 21 THEN 'reviewing'
                WHEN fsrs_state = 2 AND fsrs_stability >= 21 THEN 'mastered'
                ELSE 'new'
            END as level,
            COUNT(*) as cnt
        FROM public.cards c
        JOIN public.artifacts a ON c.artifact_id = a.id
        WHERE a.user_id = v_user_id
        GROUP BY level
    ),
    levels AS (
        SELECT unnest(ARRAY['mastered', 'reviewing', 'learning', 'new']) as level
    )
    SELECT jsonb_agg(
        jsonb_build_object('level', l.level, 'count', COALESCE(cs.cnt, 0))
    ) INTO v_result
    FROM levels l LEFT JOIN card_stats cs ON l.level = cs.level;

    SELECT COUNT(*) INTO v_total_cards
    FROM public.cards c JOIN public.artifacts a ON c.artifact_id = a.id
    WHERE a.user_id = v_user_id;

    RETURN jsonb_build_object(
        'data', COALESCE(v_result, '[]'::jsonb),
        'totalCards', COALESCE(v_total_cards, 0)
    );
END;
$$;
```

### Step 2: Update API route callers (10 min)

**Dependencies**: Step 1

Update `app/api/analytics/route.ts` to call RPCs without the `p_user_id` parameter:

```diff
-supabase.rpc('get_user_streak', { p_user_id: userId }),
-supabase.rpc('get_weekly_activity', { p_user_id: userId }),
-supabase.rpc('get_mastery_distribution', { p_user_id: userId })
+supabase.rpc('get_user_streak'),
+supabase.rpc('get_weekly_activity'),
+supabase.rpc('get_mastery_distribution')
```

### Step 3: Apply migration and test (15 min)

**Dependencies**: Steps 1–2

```bash
supabase db reset    # Apply all migrations locally
pnpm dev             # Start dev server
# Navigate to /analytics, verify data loads for authenticated user
```

## Acceptance Criteria

- [ ] All three RPCs use `auth.uid()` internally, no `p_user_id` parameter
- [ ] All three RPCs use `SECURITY INVOKER`
- [ ] Unauthenticated calls raise an exception
- [ ] API route calls RPCs without parameters
- [ ] `supabase db reset` completes without errors
- [ ] Analytics dashboard shows correct data for the logged-in user

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `auth.uid()` returns NULL in non-Supabase-auth contexts | Low | Explicit NULL check at function start |
| Other callers passing `p_user_id` break | Low | Search codebase for all `.rpc('get_user_streak'` calls |

**Rollback**: Drop and recreate the functions with the old signature via a rollback migration.

## Resources Required

- **Team**: 1 backend developer
- **Time**: ~55 minutes
- **Dependencies**: Supabase CLI installed locally
