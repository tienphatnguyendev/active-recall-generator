# Objective
Address all frontend-backend integration issues identified in the `frontend-backend-integration-report.md` by executing a structured set of Linear tickets across parallel agents.

# Key Files & Context
- `docs/findings/frontend-backend-integration-report.md` (Source of truth)
- Frontend: `app/page.tsx`, `hooks/use-pipeline-sse.ts`, `lib/api-client.ts`, `components/artifacts/export-button.tsx`, `components/auth/auth-context.tsx`
- Backend: `src/note_taker/api/generate.py`, `src/note_taker/api/auth.py`, `src/note_taker/api/main.py`
- Shared/Infra: Environment variables, Database Schema

# Implementation Steps

## 1. Findings Summary Table

| ID | Finding | Category | Severity | Layer | Estimate | Agent |
|---|---|---|---|---|---|---|
| 1 | Frontend Pipeline is Completely Mocked | 🔴 BUG | critical | frontend | 5 | agent-frontend |
| 2 | SSE Method and Endpoint Mismatch | 🟡 MISMATCH | critical | shared | 3 | agent-shared |
| 3 | Missing API Base URL Configuration | 🟠 MISSING | critical | infra | 2 | agent-infra |
| 4 | Inconsistent Authentication Token Handling | 🔴 BUG | high | frontend | 3 | agent-frontend |
| 5 | Auth Extraction Incompatibility during SSE | 🟡 MISMATCH | high | shared | 3 | agent-shared |
| 6 | HTTP Methods & Format Mismatches | 🔴 BUG | high | frontend | 3 | agent-frontend |
| 7 | Data Structure Mismatches | 🟡 MISMATCH | high | shared | 3 | agent-shared |
| 8 | RPC Function Call Parameter Mismatch | 🟡 MISMATCH | high | frontend | 2 | agent-frontend |
| 9 | Missing CORS Configuration | 🟠 MISSING | medium | infra | 1 | agent-infra |
| 10 | Inconsistent Error Handling | 🔵 IMPROVEMENT | medium | backend | 3 | agent-backend |
| 11 | Missing Input Validation on Server Actions | 🟠 MISSING | medium | backend | 2 | agent-backend |
| 12 | Race Condition in Auth Context | 🔴 BUG | medium | frontend | 2 | agent-frontend |
| 13 | Unused API Client Module | ⚪ DEBT | medium | frontend | 3 | agent-frontend |
| 14 | Database Save Stage Disconnect | 🔴 BUG | medium | frontend | 2 | agent-frontend |
| 15 | Hardcoded Fallback Polling Mismatch | ⚪ DEBT | low | frontend | 1 | agent-frontend |

## 2. Linear Tickets

### Ticket 1
Title: [Infra][API Client] — Configure API Base URL environment variables
Label: missing
Priority: urgent
Status: Todo
Estimate: 2
Assignee: agent-infra
Description:
**Problem**
The frontend hardcodes relative API paths (`/api/generate`). The Python FastAPI backend runs on a different port, but no `API_BASE_URL` is configured to route traffic properly. Blocks frontend API integration.
**Root Cause**
Missing environment variable configuration for cross-service communication.
**Acceptance Criteria**
- `NEXT_PUBLIC_API_URL` is defined in `.env.example` and local `.env`.
- `lib/api-client.ts` uses `NEXT_PUBLIC_API_URL` as the base URL for requests.
**Implementation Notes**
Update `.env.example`, `.env` (if applicable/instructed), and `lib/api-client.ts` to prepend the base URL to all API calls. Test by logging the constructed URL.
**Blocked By**
none

### Ticket 2
Title: [Shared][Pipeline SSE] — Align SSE method and endpoint contracts
Label: mismatch
Priority: urgent
Status: Todo
Estimate: 3
Assignee: agent-shared
Description:
**Problem**
Frontend unused hook expects `GET /api/process/pipeline/${pipelineId}/events`, but backend exposes `POST /api/generate`. `EventSource` only supports `GET`.
**Root Cause**
Architectural mismatch between frontend SSE implementation and backend endpoint design.
**Acceptance Criteria**
- Shared understanding/contract is established for the SSE endpoint.
- OpenAPI spec or shared types reflect the correct endpoint (`POST /api/generate`) and payload (`GenerateRequest`).
**Implementation Notes**
Update shared types/contracts. Ensure backend `POST /api/generate` is documented as the streaming endpoint. Frontend will need to use `@microsoft/fetch-event-source` (implemented in another ticket).
**Blocked By**
none

### Ticket 3
Title: [Frontend][Pipeline Execution] — Integrate actual backend pipeline and remove mocks
Label: bug
Priority: urgent
Status: Todo
Estimate: 5
Assignee: agent-frontend
Description:
**Problem**
The main generation page (`app/page.tsx`) relies entirely on a client-side `runSimulation` function and does not call the real backend.
**Root Cause**
Incomplete integration; mock was left in place.
**Acceptance Criteria**
- `runSimulation` is removed.
- `app/page.tsx` calls the real backend pipeline via `hooks/use-pipeline-sse.ts`.
- Pipeline progress updates accurately reflect backend state.
**Implementation Notes**
Modify `app/page.tsx` to use the pipeline hook. Update the hook to use `@microsoft/fetch-event-source` for `POST` requests.
**Blocked By**
Ticket 1, Ticket 2

### Ticket 4
Title: [Frontend][Auth] — Synchronize authentication token handling
Label: bug
Priority: high
Status: Todo
Estimate: 3
Assignee: agent-frontend
Description:
**Problem**
`api-client.ts` uses module-level state for tokens, but there's no mechanism to set it after Supabase login. `use-pipeline-sse.ts` uses a different method.
**Root Cause**
Fragmented auth state management.
**Acceptance Criteria**
- `setAccessToken()` is called on Supabase auth state changes.
- `api-client.ts` reliably has the current user token.
**Implementation Notes**
Update `components/auth/auth-context.tsx` or wherever Supabase `onAuthStateChange` is handled to call `setAccessToken` from `lib/api-client.ts`.
**Blocked By**
none

### Ticket 5
Title: [Shared][Pipeline SSE Auth] — Standardize SSE authentication extraction
Label: mismatch
Priority: high
Status: Todo
Estimate: 3
Assignee: agent-shared
Description:
**Problem**
Frontend passes JWT via query parameter `?token=` for SSE, but FastAPI backend enforces `HTTPBearer` (`Authorization: Bearer <token>`).
**Root Cause**
Limitations of native `EventSource` led to query param usage, conflicting with backend security policies.
**Acceptance Criteria**
- Contract established that SSE requests must use `Authorization` header.
- Backend `HTTPBearer` enforcement remains intact.
**Implementation Notes**
No backend changes needed if `HTTPBearer` is kept. Document that frontend must use fetch-based SSE to pass headers.
**Blocked By**
Ticket 4

### Ticket 6
Title: [Frontend][Export API] — Refactor export buttons to use centralized API client
Label: bug
Priority: high
Status: Todo
Estimate: 3
Assignee: agent-frontend
Description:
**Problem**
Export buttons make raw `fetch()` calls, bypassing the `api-client`, error handling, and `Authorization` headers.
**Root Cause**
Inconsistent API calling patterns.
**Acceptance Criteria**
- `components/artifacts/export-button.tsx` uses `api-client.ts`.
- Exports successfully authenticate and download.
**Implementation Notes**
Refactor `export-button.tsx` to use `apiClient.get` or `apiClient.post` as appropriate, ensuring the response can be handled as a Blob for downloading.
**Blocked By**
Ticket 1

### Ticket 7
Title: [Shared][Artifacts] — Align frontend models with database schema
Label: mismatch
Priority: high
Status: Todo
Estimate: 3
Assignee: agent-shared
Description:
**Problem**
Frontend expects `source_name` and `section_title`, but database only has `title` and `source_hash`. Frontend falls back to raw `source_hash`.
**Root Cause**
Schema evolution mismatch between frontend expectations and backend/DB reality.
**Acceptance Criteria**
- Shared types correctly reflect the database schema (`title`, `source_hash`).
- UI designs updated/mapped to use available fields gracefully.
**Implementation Notes**
Update frontend types to match DB. Modify `app/artifacts/page.tsx` and related components to use `title` or format `source_hash` nicely if `title` is absent.
**Blocked By**
none

### Ticket 8
Title: [Frontend][Analytics] — Fix RPC function calls to omit explicit UID parameters
Label: mismatch
Priority: high
Status: Todo
Estimate: 2
Assignee: agent-frontend
Description:
**Problem**
Frontend might be calling RPC functions incorrectly based on a recent migration (`20260301000000_fix_rpc_security.sql`) that uses `auth.uid()` internally.
**Root Cause**
Frontend code not updated after database migration.
**Acceptance Criteria**
- Analytics RPC calls in `app/analytics/page.tsx` (via Supabase client) do not pass `p_user_id` if the RPC uses `auth.uid()`.
- Analytics load successfully for the logged-in user.
**Implementation Notes**
Review `app/analytics/page.tsx` and Supabase queries. Remove explicit user ID params for the updated RPCs.
**Blocked By**
none

### Ticket 9
Title: [Infra][Backend API] — Configure CORS for Python Backend
Label: missing
Priority: medium
Status: Todo
Estimate: 1
Assignee: agent-infra
Description:
**Problem**
CORS relies on `CORS_ORIGINS` which might not be set, potentially blocking the Next.js frontend.
**Root Cause**
Missing environment configuration.
**Acceptance Criteria**
- `CORS_ORIGINS` is documented and properly set in local development to allow `http://localhost:3000`.
**Implementation Notes**
Update backend `.env.example` and ensure `src/note_taker/api/main.py` correctly parses and applies the origins.
**Blocked By**
none

### Ticket 10
Title: [Backend][API Routes] — Standardize error handling across Next.js API Routes
Label: improvement
Priority: medium
Status: Todo
Estimate: 3
Assignee: agent-backend
Description:
**Problem**
Error responses across Next.js API Routes (`api/study/route.ts`, `api/artifacts/export/route.ts`) are poorly standardized.
**Root Cause**
Lack of centralized error handling middleware or utility.
**Acceptance Criteria**
- A standard error response format is defined (e.g., `{ error: string, details?: any }`).
- All Next.js API routes use this format.
**Implementation Notes**
Create an error utility function in `lib/api-client.ts` or `lib/utils.ts` and apply it across the `app/api/` directories.
**Blocked By**
none

### Ticket 11
Title: [Backend][Study Actions] — Add input validation to Server Actions
Label: missing
Priority: medium
Status: Todo
Estimate: 2
Assignee: agent-backend
Description:
**Problem**
`logBulkStudySession` in `app/actions/study.ts` lacks validation for fields like rating values (1-4) or UUIDs.
**Root Cause**
Missing Zod schemas for server actions.
**Acceptance Criteria**
- `logBulkStudySession` uses Zod to validate input payload.
- Invalid inputs throw clear, handled errors.
**Implementation Notes**
Create Zod schemas in `lib/validations/` and apply them inside `app/actions/study.ts`.
**Blocked By**
none

### Ticket 12
Title: [Frontend][Auth Context] — Fix race condition in Auth Context initialization
Label: bug
Priority: medium
Status: Todo
Estimate: 2
Assignee: agent-frontend
Description:
**Problem**
Auth state initializes with `initialUser` but subscribes to auth changes in `useEffect`, potentially triggering updates before mount finishes.
**Root Cause**
React lifecycle mismatch with async Supabase subscriptions.
**Acceptance Criteria**
- Auth context initializes cleanly without race conditions.
- No flashing of logged-out state for logged-in users.
**Implementation Notes**
Refactor `components/auth/auth-context.tsx` to handle the initial session load and subscription synchronously or manage a `isLoading` state.
**Blocked By**
none

### Ticket 13
Title: [Frontend][API Client] — Utilize centralized API client module
Label: debt
Priority: medium
Status: Todo
Estimate: 3
Assignee: agent-frontend
Description:
**Problem**
The centralized `api-client.ts` is rarely used, leading to fragmented API calls.
**Root Cause**
Accumulated technical debt.
**Acceptance Criteria**
- Replace scattered `fetch` calls with `apiClient` methods.
**Implementation Notes**
Audit the codebase for raw `fetch` calls and replace them.
**Blocked By**
Ticket 1

### Ticket 14
Title: [Frontend][Cache Invalidation] — Implement cache invalidation on backend artifact save
Label: bug
Priority: medium
Status: Todo
Estimate: 2
Assignee: agent-frontend
Description:
**Problem**
Next.js frontend relies on `revalidatePath`, but FastAPI backend handles saving silently. Next.js cache doesn't know when to refresh.
**Root Cause**
Disconnected state mutations between frontend cache and backend DB.
**Acceptance Criteria**
- Artifact list refreshes automatically after a successful pipeline generation.
**Implementation Notes**
Trigger a Next.js API route or Server Action from the frontend after the SSE stream completes successfully to call `revalidatePath('/artifacts')`.
**Blocked By**
Ticket 3

### Ticket 15
Title: [Frontend][Pipeline SSE] — Remove hardcoded fallback polling
Label: debt
Priority: low
Status: Todo
Estimate: 1
Assignee: agent-frontend
Description:
**Problem**
`use-pipeline-sse.ts` implements fallback polling to a non-existent endpoint (`/api/process/pipeline/${pipelineId}/status`).
**Root Cause**
Leftover code from previous iteration.
**Acceptance Criteria**
- Fallback polling code is removed from the hook.
**Implementation Notes**
Delete the polling logic from `hooks/use-pipeline-sse.ts`.
**Blocked By**
none

## 3. Parallel Execution Wave Plan

| Wave | Agent | Tickets | Focus |
|---|---|---|---|
| Wave 1 (Foundations) | agent-infra | Ticket 1, Ticket 9 | Establish base URLs and CORS. |
| Wave 1 (Contracts) | agent-shared | Ticket 2, Ticket 7 | Align endpoints, types, and DB schema. |
| Wave 2 (Auth Sync) | agent-frontend | Ticket 4, Ticket 12 | Fix auth state and token propagation. |
| Wave 3 (SSE & API) | agent-shared | Ticket 5 | Standardize Auth extraction for SSE. |
| Wave 3 (Backend) | agent-backend | Ticket 10, Ticket 11 | Improve validation and error handling. |
| Wave 4 (Core Feature) | agent-frontend | Ticket 3, Ticket 6, Ticket 8 | Replace mocks, fix exports, fix RPCs. |
| Wave 5 (Cleanup) | agent-frontend | Ticket 13, Ticket 14, Ticket 15 | Consolidate API clients, fix cache, remove dead code. |

## 4. Risk Flags
- **Auth Token Synchronization (Tickets 4 & 5):** If the frontend fails to reliably pass the `Authorization` header during the SSE connection, the pipeline will remain disconnected, completely blocking the core user journey.
- **SSE Method Mismatch (Ticket 2 & 3):** Native `EventSource` does not support `POST` or custom headers. The transition to `@microsoft/fetch-event-source` or native fetch streaming is critical and could introduce new browser compatibility or stream parsing bugs if mishandled.
- **Database Schema Assumptions (Ticket 7):** If frontend types are simply suppressed instead of correctly mapped, users might lose context (e.g., missing titles for generated artifacts).

# Verification & Testing
- Ensure all environment variables are properly set locally.
- Run frontend and backend servers.
- Verify end-to-end artifact generation using real markdown.
- Confirm network requests are routed to the backend correctly with the `Authorization` header.
- Execute unit and E2E tests for the frontend authentication flows and SSE hook.