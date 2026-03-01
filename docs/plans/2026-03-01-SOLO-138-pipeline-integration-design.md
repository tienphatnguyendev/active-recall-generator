# Design Doc: [Frontend][Pipeline Execution] — Integrate actual backend pipeline and remove mocks

**Issue:** SOLO-138
**Date:** 2026-03-01
**Status:** Approved

## 1. Problem Statement
The main generation page (`app/page.tsx`) currently uses a client-side `runSimulation` function that mocks the pipeline progress with `setTimeout`. It does not call the actual FastAPI backend pipeline, meaning users cannot generate real Q&A artifacts from the UI.

## 2. Proposed Solution
Replace the `runSimulation` mock with a real integration using the `usePipelineSSE` hook. The frontend will orchestrate the multi-chunk processing sequentially to ensure reliability and clear UI feedback.

## 3. Architecture & Data Flow
### Sequential Orchestration
The frontend will handle multi-chunk processing by iterating through chunks and awaiting each backend connection.

1.  **Split Content:** Use the existing regex to split Markdown into chunks based on H1/H2 headers.
2.  **Sequential Loop:** Iterate through chunks using a `for...of` loop.
3.  **Promise Wrapper:** Wrap the `usePipelineSSE` connection in a `Promise` that:
    *   Resolves on the `complete` event (pipeline finished for that chunk).
    *   Rejects on the `error` event or connection failure.
4.  **State Updates:** Update `currentChunk`, `totalChunks`, and `qaCount` in real-time based on backend events.

### Stage Mapping
The backend stages will be mapped to the existing `DEFAULT_STAGES` in the UI:
*   `check` (Backend) → **Check Database** (UI)
*   `outline_draft` & `qa_draft` (Backend) → **Draft** (UI)
*   `judge` (Backend) → **Judge** (UI)
*   `revise` (Backend) → **Revise** (UI)
*   `save` (Backend) → **Save to DB** (UI)

## 4. Components & State Changes
### `app/page.tsx`
*   Remove `runSimulation` and `sleep` functions.
*   Update `handleSubmit` to use a `for` loop that calls the backend.
*   Use `setStages` to update individual stage statuses (`active`, `done`, `failed`) based on `SSEStageEvent`.
*   Accumulate `qaCount` from the `data` field of `SSEStageEvent` (e.g., `data.qa_count`).

### `hooks/use-pipeline-sse.ts`
*   Ensure the hook correctly handles `POST` requests via `@microsoft/fetch-event-source` (verified in research).
*   Add logging for debugging connection issues.

## 5. Error Handling
*   **Connection Errors:** If the SSE connection fails, mark the active stage as `failed` and stop the loop.
*   **Backend Errors:** Display the error message from the `SSEErrorEvent` in the UI.
*   **Abort:** Use `AbortController` to cancel ongoing requests if the user resets or leaves the page.

## 6. Verification Plan
### Automated Tests
*   Update any existing frontend tests that rely on the `runSimulation` mock.
*   Ensure `usePipelineSSE` is correctly mocked in unit tests for `app/page.tsx`.

### Manual Verification
1.  **Happy Path:** Paste Markdown, run the pipeline, and observe real-time stage updates.
2.  **Cache Hit:** Verify that the "Check Database" stage shows "skipped" if the chunk has already been processed.
3.  **End-to-End:** After completion, click "Browse artifacts" and verify the generated Q&A pairs are in the database.
4.  **Error Path:** Simulate a backend failure (e.g., stop the backend server) and verify the UI shows an error state.
