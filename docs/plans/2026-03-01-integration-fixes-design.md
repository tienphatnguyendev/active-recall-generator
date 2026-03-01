# Frontend-Backend Integration Fixes Design

## 1. Overview
This design document outlines the technical approach for addressing the frontend-backend integration issues identified in the `frontend-backend-integration-report.md`. The primary focus is on two key areas: 
1. Connecting the Next.js frontend to the FastAPI LangGraph pipeline for artifact generation.
2. Standardizing API interactions, specifically for file exports, using a centralized API client.

## 2. Pipeline Integration (Ticket 3)

### 2.1 Architecture & Data Flow
The frontend will process Markdown documents sequentially, chunk by chunk, to ensure reliable processing and avoid triggering LLM rate limits.

1.  **Chunking:** The `handleSubmit` function in `app/page.tsx` will split the input Markdown into chunks based on `H1`/`H2` headers (using the existing regex logic).
2.  **Sequential Execution:** A `for...of` loop will iterate through the chunks.
3.  **Connection:** Inside the loop, the frontend will establish an SSE connection for each chunk by calling the `connect` function from the `usePipelineSSE` hook. 
    *   *Note:* The hook itself needs to be updated in a separate ticket (Ticket 2/5) to use `fetch` instead of native `EventSource` to support `POST` requests and `Authorization` headers.
4.  **Promise Wrapper:** To manage the asynchronous SSE stream within the sequential loop, the `connect` call will be wrapped in a Promise. This Promise will:
    *   Resolve when the backend sends a `complete` event.
    *   Reject if an `error` event is received or the connection fails.
5.  **Completion:** Once all chunks have been processed (or an unrecoverable error occurs), the overall generation process will conclude, and the UI will update to the `isDone` state.

### 2.2 State Management & UI Mapping
The `PipelineStatus` UI will map backend SSE stage events to the existing frontend visual stages.

*   **Stage Mapping:**
    *   Backend `check_database_node` -> Frontend `check`
    *   Backend `outline_draft_node` & `qa_draft_node` -> Frontend `draft`
    *   Backend `judge_node` -> Frontend `judge`
    *   Backend `revise_node` -> Frontend `revise`
    *   Backend `save_to_db_node` (or equivalent saving stage) -> Frontend `save`
*   **Status Transitions:**
    *   Backend `started` / `active` -> Frontend `active`
    *   Backend `completed` / `skipped` -> Frontend `done`
    *   Error conditions -> Frontend `failed`
*   **Live Metrics:** The frontend will extract `qa_count` from the `stage_update` payloads (specifically from stages like `qa_draft_node` or `judge_node`) to increment the total "Q&A pairs generated" counter in real-time.
*   **Chunk Tracking:** The `currentChunk` and `totalChunks` state variables will be updated as the loop progresses.

### 2.3 Error Handling
*   If a chunk fails processing (e.g., due to an LLM timeout or rate limit reported by the backend), the current active stage in the UI will transition to `failed`.
*   The sequential loop will be aborted to prevent cascading failures.
*   A clear error message will be surfaced to the user.

## 3. Export API Client Refactoring (Ticket 6 & 13)

### 3.1 API Client Extension (`lib/api-client.ts`)
To standardize file downloads (like JSON/CSV exports) and ensure they include necessary authentication headers, a new method will be added to the centralized API client.

*   **Method Signature:** `api.blob(url: string, options?: RequestInit)`
*   **Implementation:** 
    *   This method will likely utilize a specialized fetch wrapper (similar to the existing `apiFetch` but tailored for binary data).
    *   If the response is successful (`res.ok`), it will return `res.blob()`.
    *   If the response fails, it will parse the error (potentially attempting to read a JSON error message from the response body if it's not a true stream) and throw a standard `ApiError`.
    *   *Crucially*, it will automatically include the `Authorization` header managed by the API client.

### 3.2 Component Updates
The following components will be refactored to replace raw `fetch` calls with `api.blob`:
1.  `components/artifacts/export-button.tsx`
2.  `components/analytics/analytics-export-button.tsx` (Proactive technical debt cleanup).

Using `api.blob()` simplifies these components, as they no longer need to manually check `res.ok` or construct `Authorization` headers.

## 4. Verification Plan
*   **Pipeline Generation:** Manually execute the pipeline using the "Load sample" content. Verify that the UI progresses sequentially through the chunks and that the stages (Draft, Judge, Revise, Save) update in sync with the backend processing.
*   **Export Functionality:** Trigger JSON and CSV exports from the UI. Verify that the files download correctly, containing the expected data, and that the network requests include the appropriate `Authorization: Bearer <token>` header.
