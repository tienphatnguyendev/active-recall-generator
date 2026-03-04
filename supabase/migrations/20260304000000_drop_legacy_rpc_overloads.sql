-- Drop the old 1-arg SECURITY DEFINER overloads that conflict with the 0-arg versions.
-- These were created by 20260228000000_analytics_rpcs.sql and were not removed
-- by 20260301000000_fix_rpc_security.sql (CREATE OR REPLACE does not drop overloads).

DROP FUNCTION IF EXISTS public.get_user_streak(UUID);
DROP FUNCTION IF EXISTS public.get_weekly_activity(UUID);
DROP FUNCTION IF EXISTS public.get_mastery_distribution(UUID);
