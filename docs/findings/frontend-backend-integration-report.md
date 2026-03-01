# Comprehensive Frontend-Backend Integration Report

## Summary of Overall Integration Health
The current state of the frontend-backend integration is severely degraded. The core functionality of the application—the LangGraph text processing pipeline—is completely disconnected and relying on client-side simulation. Additionally, there are fundamental architectural mismatches between the Next.js frontend and FastAPI backend regarding SSE streaming, authentication handling, database schemas, and API base URL configurations.

## Detailed Findings

### Critical
**1. Frontend Pipeline is Completely Mocked and Disconnected**
- **Location:** `app/page.tsx` (Lines 54-100)
- **Description:** The main generation page does not make any real API calls to the Python FastAPI backend (`/api/generate`). It relies entirely on a client-side `runSimulation` function to mimic processing stages. The hook (`hooks/use-pipeline-sse.ts`) is not imported or used.
- **Recommended Fix:** Remove `runSimulation` and integrate the actual backend pipeline via the `api-client` or a streaming fetch implementation.

**2. SSE Method and Endpoint Mismatch**
- **Location:** `hooks/use-pipeline-sse.ts` (Lines 51-52) vs `src/note_taker/api/generate.py` (Lines 141-146)
- **Description:** The unused frontend hook expects a `GET` request at `/api/process/pipeline/${pipelineId}/events`, but the FastAPI backend exposes a `POST /api/generate` endpoint. Native `EventSource` only supports `GET` requests and cannot send JSON bodies.
- **Recommended Fix:** Implement `@microsoft/fetch-event-source` or native `fetch` streaming to allow sending a `POST` request with the `GenerateRequest` payload and `Authorization` headers.

**3. Missing API Base URL Configuration**
- **Location:** `lib/api-client.ts`, `hooks/use-pipeline-sse.ts`
- **Description:** The frontend hardcodes relative API paths (`/api/generate`, `/api/process/pipeline/...`). The Python FastAPI backend likely runs on a different port (e.g., 8000) than Next.js (3000), but no `API_BASE_URL` is configured to route traffic properly.
- **Recommended Fix:** Add a `NEXT_PUBLIC_API_URL` environment variable and prepend it to requests destined for the FastAPI service.

### High
**4. Inconsistent Authentication Token Handling**
- **Location:** `lib/api-client.ts` vs `hooks/use-pipeline-sse.ts`
- **Description:** Two conflicting patterns exist. `api-client.ts` uses module-level `_accessToken` state, while `use-pipeline-sse.ts` calls `getAccessToken()`. There is no mechanism to actually *set* the token in the API client after Supabase login.
- **Recommended Fix:** Synchronize the Supabase session with `api-client.ts` by calling `setAccessToken()` on auth state changes.

**5. Authentication Extraction Incompatibility during SSE**
- **Location:** `hooks/use-pipeline-sse.ts` vs `src/note_taker/api/auth.py`
- **Description:** The frontend attempts to pass the JWT via a query parameter (`?token=`), but the FastAPI backend strictly enforces `HTTPBearer` which expects an `Authorization: Bearer <token>` header.
- **Recommended Fix:** Switch frontend streaming to a method that allows custom headers (e.g., fetch streaming) and pass the `Authorization` header.

**6. HTTP Methods & Request/Response Format Mismatches**
- **Location:** `components/artifacts/export-button.tsx`
- **Description:** Export buttons make raw `fetch()` calls bypassing the centralized `api-client`, error handling, and most importantly, the `Authorization` header.
- **Recommended Fix:** Refactor all raw `fetch` calls to utilize the centralized `api-client`.

**7. Data Structure Mismatches Between Frontend and Database**
- **Location:** `app/artifacts/page.tsx`, `app/api/artifacts/export/route.ts`, and Database Schema
- **Description:** The frontend and Next.js APIs expect `source_name` and `section_title` fields, which do not exist in the database (`artifacts` table only has `title` and `source_hash`). The frontend falls back to displaying the raw `source_hash` to users.
- **Recommended Fix:** Align the frontend models and database schema by adding the missing columns or mapping existing ones appropriately.

**8. RPC Function Call Parameter Mismatch**
- **Location:** `app/analytics/page.tsx` vs `supabase/migrations/20260301000000_fix_rpc_security.sql`
- **Description:** The frontend calls RPC functions without parameters, but they might have been designed to require a `p_user_id` before the migration to use `auth.uid()` internally. Ensure the frontend strictly aligns with the migrated internal UID usage.
- **Recommended Fix:** Verify all RPC calls correctly rely on `auth.uid()` rather than passing explicit parameters.

### Medium
**9. Missing CORS Configuration for Python Backend**
- **Location:** `src/note_taker/api/main.py`
- **Description:** CORS relies on an environment variable (`CORS_ORIGINS`) that might not be correctly set across all environments, potentially causing blockages from the Next.js frontend.

**10. Inconsistent Error Handling Across API Routes**
- **Location:** Various Next.js API Routes (e.g., `api/study/route.ts` vs `api/artifacts/export/route.ts`)
- **Description:** Error responses are poorly standardized. Some include details while others obscure the underlying issues.

**11. Missing Input Validation on Server Actions**
- **Location:** `app/actions/study.ts`
- **Description:** `logBulkStudySession` lacks robust validation for fields like rating values (should be 1-4), duration sizes, or UUID formats.

**12. Race Condition in Auth Context**
- **Location:** `components/auth/auth-context.tsx`
- **Description:** Auth state initializes with `initialUser` but immediately subscribes to auth changes inside `useEffect`, which could trigger unintended state updates before mount finishes.

**13. Unused API Client Module**
- **Location:** `lib/api-client.ts`
- **Description:** The centralized API client is rarely used, resulting in fragmented API interactions across components.

**14. Database Save Stage Disconnect**
- **Location:** Frontend UI vs `src/note_taker/api/generate.py`
- **Description:** The Next.js frontend relies on `revalidatePath` to refresh caches after mutations, but the FastAPI backend handles the artifact saving silently. The Next.js cache needs a mechanism to be invalidated upon successful backend artifact creation.

### Low
**15. Hardcoded Fallback Polling Mismatch**
- **Location:** `hooks/use-pipeline-sse.ts`
- **Description:** The hook implements a fallback polling mechanism targeting `/api/process/pipeline/${pipelineId}/status` which does not exist on the backend.

## Verification Checklist

**Authentication Flow:**
- [ ] User can register new account
- [ ] User receives confirmation email (if enabled)
- [ ] User can log in with valid credentials
- [ ] Invalid credentials show appropriate error
- [ ] User session persists across page refreshes
- [ ] User can log out successfully
- [ ] Protected routes redirect to login when not authenticated
- [ ] Auth token is properly attached to API requests via the API client

**Artifact Generation Flow:**
- [ ] User can paste markdown and submit to pipeline
- [ ] Pipeline progress updates appear in real-time via SSE
- [ ] Generated artifacts save to Supabase
- [ ] Artifacts appear in `/artifacts` page immediately after generation
- [ ] RLS policies prevent users from seeing other users' artifacts

**Study Flow:**
- [ ] User can view list of their cards in `/study` page
- [ ] Cards display correct question/answer content
- [ ] Rating buttons (Know/Unsure/Unknown) work correctly
- [ ] Study sessions save to database with correct `user_id`
- [ ] FSRS state updates on `cards` table after study
- [ ] Session completion shows accurate results

**Analytics Flow:**
- [ ] Analytics page loads without errors
- [ ] RPC functions return data for current user only
- [ ] Streak calculation shows correct current/longest streak
- [ ] Weekly activity chart displays last 7 days
- [ ] Mastery distribution shows correct card counts by level
- [ ] Export button generates downloadable file

**Export Flow:**
- [ ] Export dropdown menu opens/closes correctly
- [ ] JSON export downloads with valid JSON structure
- [ ] CSV export downloads with properly escaped fields
- [ ] Export includes only user's own data (RLS enforced)
- [ ] Single artifact export works (if implemented)

## Short-term Actions (Next Sprint)
1. Migrate all `fetch()` calls to use the `api-client` module.
2. Add input validation with Zod schemas for all Server Actions.
3. Implement comprehensive and standardized error handling across all routes.
4. Add environment variable validation.
5. Fix auth context race condition and ensure token sync with API client.
6. Add E2E testing for critical flows.
7. Implement request/response logging for better observability.
8. Add API rate limiting and retry logic.
9. Create shared type definitions between the Next.js frontend and FastAPI backend.