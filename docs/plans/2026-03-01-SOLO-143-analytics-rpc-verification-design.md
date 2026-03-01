# SOLO-143 Verification Script Design

**Goal:** Verify that `get_user_streak`, `get_weekly_activity`, and `get_mastery_distribution` RPCs function correctly without `p_user_id` when called by an authenticated client.

**Architecture & Components:**
*   **File:** `tests/manual/verify_analytics_rpcs.js`
*   **Dependencies:** Uses `@supabase/supabase-js`.
*   **Flow:**
    1.  Load `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a test user email/password from `.env.local` or environment variables.
    2.  Initialize the Supabase client.
    3.  Sign in with the test user credentials using `supabase.auth.signInWithPassword()`.
    4.  Call the three RPCs using `supabase.rpc(...)` without any parameters.
    5.  Assert that no errors are returned and that data is successfully fetched.
    6.  Log the output to the console for visual confirmation.
