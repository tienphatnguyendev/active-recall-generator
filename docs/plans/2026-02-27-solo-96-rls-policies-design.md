# Design: Implement Row Level Security (RLS) Policies

## Overview
This document outlines the design for implementing explicit, granular Row Level Security (RLS) policies for the Supabase tables in the `note-taker` application. This is for the Linear issue `SOLO-96`.

## Approach
We will use **Explicit Granular Policies** (Approach 1) over consolidated `ALL` policies. This involves creating separate policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on each table to ensure strict permissioning and safer operations.

## Policies Design

### 1. `public.users` Table
- **Read:** `SELECT` policy where `id = auth.uid()`
- **Write:** Managed purely by auth triggers (no `INSERT`/`UPDATE`/`DELETE` policies needed)

### 2. `public.artifacts` Table
- **Read:** `SELECT` policy where `user_id = auth.uid()`
- **Insert:** `INSERT` policy with `WITH CHECK (user_id = auth.uid())`
- **Update:** `UPDATE` policy where `user_id = auth.uid()` AND `WITH CHECK (user_id = auth.uid())`
- **Delete:** `DELETE` policy where `user_id = auth.uid()`

### 3. `public.cards` Table
*Cards belong to artifacts, not directly to users. We must verify ownership through the artifact.*
- **Read:** `SELECT` policy using a subquery to check if the card's `artifact_id` belongs to an artifact owned by `auth.uid()`
- **Insert:** `INSERT` policy using a subquery `WITH CHECK` to ensure the target `artifact_id` is owned by `auth.uid()`
- **Update:** `UPDATE` policy using a subquery `USING` and `WITH CHECK` to verify the target `artifact_id` belongs to `auth.uid()`
- **Delete:** `DELETE` policy using a subquery `USING` to verify the card's `artifact_id` belongs to an artifact owned by `auth.uid()`

### 4. `public.study_sessions` Table
- **Read:** `SELECT` policy where `user_id = auth.uid()`
- **Insert:** `INSERT` policy with `WITH CHECK (user_id = auth.uid())`
- **Update:** `UPDATE` policy where `user_id = auth.uid()` AND `WITH CHECK (user_id = auth.uid())`
- **Delete:** `DELETE` policy where `user_id = auth.uid()`

## Testing Strategy
- Create mock user sessions using Supabase Edge Functions or Local DB `set_config('request.jwt.claims', ...)`.
- Verify that User A cannot read, update, or delete User B's artifacts, cards, or study sessions.
- Verify that User A can only insert artifacts/study sessions for themselves, and cards into their own artifacts.
