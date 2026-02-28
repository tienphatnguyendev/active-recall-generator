-- public.get_user_streak
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_streak INT := 0;
    v_longest_streak INT := 0;
    v_studied_today BOOLEAN := false;
    v_recent_days jsonb;
    v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
    -- 1. Find Longest Streak and Current Streak
    WITH distinct_study_dates AS (
        SELECT DISTINCT (reviewed_at AT TIME ZONE 'UTC')::DATE as study_date
        FROM public.study_sessions
        WHERE user_id = p_user_id
    ),
    groups AS (
        SELECT
            study_date,
            study_date - (ROW_NUMBER() OVER (ORDER BY study_date ASC))::INT AS grp
        FROM distinct_study_dates
    ),
    streaks AS (
        SELECT
            COUNT(*) as streak_length,
            MAX(study_date) as end_date
        FROM groups
        GROUP BY grp
    )
    SELECT 
        COALESCE(MAX(streak_length), 0),
        COALESCE(MAX(CASE WHEN end_date >= v_today - 1 THEN streak_length ELSE 0 END), 0)
    INTO v_longest_streak, v_current_streak
    FROM streaks;

    -- 2. Studied Today?
    SELECT EXISTS (
        SELECT 1 FROM public.study_sessions 
        WHERE user_id = p_user_id 
        AND (reviewed_at AT TIME ZONE 'UTC')::DATE = v_today
    ) INTO v_studied_today;

    -- 3. Recent Days (Last 7 days)
    WITH last_7_days AS (
        SELECT (v_today - (generate_series(6, 0, -1) || ' days')::INTERVAL)::DATE AS d
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', d.d,
            'studied', EXISTS (
                SELECT 1 FROM public.study_sessions 
                WHERE user_id = p_user_id 
                AND (reviewed_at AT TIME ZONE 'UTC')::DATE = d.d
            )
        ) ORDER BY d.d ASC
    ) INTO v_recent_days
    FROM last_7_days d;

    RETURN jsonb_build_object(
        'currentStreak', v_current_streak,
        'longestStreak', v_longest_streak,
        'studiedToday', v_studied_today,
        'recentDays', COALESCE(v_recent_days, '[]'::jsonb)
    );
END;
$$;

-- public.get_weekly_activity
CREATE OR REPLACE FUNCTION public.get_weekly_activity(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
BEGIN
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
        SELECT 
            (reviewed_at AT TIME ZONE 'UTC')::DATE as study_date,
            COUNT(DISTINCT card_id) as cards_studied,
            COUNT(id) as session_count
        FROM public.study_sessions
        WHERE user_id = p_user_id
          AND reviewed_at >= (v_today - INTERVAL '6 days')
        GROUP BY (reviewed_at AT TIME ZONE 'UTC')::DATE
    ) stats ON d.d = stats.study_date;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- public.get_mastery_distribution
CREATE OR REPLACE FUNCTION public.get_mastery_distribution(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_cards INT;
BEGIN
    -- fsrs_state: 0=New, 1=Learning, 2=Review, 3=Relearning
    -- We can map:
    -- 'new': 0
    -- 'learning': 1, 3
    -- 'reviewing': 2 (stability < 21)
    -- 'mastered': 2 (stability >= 21)
    
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
        WHERE a.user_id = p_user_id
        GROUP BY level
    ),
    levels AS (
        SELECT unnest(ARRAY['mastered', 'reviewing', 'learning', 'new']) as level
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'level', l.level,
            'count', COALESCE(cs.cnt, 0)
        )
    ) INTO v_result
    FROM levels l
    LEFT JOIN card_stats cs ON l.level = cs.level;

    SELECT COUNT(*) INTO v_total_cards 
    FROM public.cards c 
    JOIN public.artifacts a ON c.artifact_id = a.id 
    WHERE a.user_id = p_user_id;

    RETURN jsonb_build_object(
        'data', COALESCE(v_result, '[]'::jsonb),
        'totalCards', COALESCE(v_total_cards, 0)
    );
END;
$$;
