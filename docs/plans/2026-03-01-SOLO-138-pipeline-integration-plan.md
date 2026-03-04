# [Frontend][Pipeline Execution] — Integrate actual backend pipeline and remove mocks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the client-side `runSimulation` mock in `app/page.tsx` with a real backend integration using `usePipelineSSE`.

**Architecture:** 
- Orchestrate multi-chunk processing sequentially using a `for...of` loop in the frontend.
- Wrap the `usePipelineSSE` connection in a Promise to await each chunk's completion.
- Map backend SSE events (`stage_update`, `complete`, `error`) to UI state.

**Tech Stack:** Next.js (App Router), React, @microsoft/fetch-event-source, FastAPI (Backend)

---

### Task 1: Refactor `app/page.tsx` to use `usePipelineSSE`

**Files:**
- Modify: `app/page.tsx`

**Step 1: Import the hook and necessary types**

Add the import for `usePipelineSSE` and update the local `Stage` type if needed to align with `DEFAULT_STAGES`.

**Step 2: Initialize the hook**

Inside `GeneratePage`, initialize `usePipelineSSE`.

**Step 3: Implement the Promise-based chunk processor**

Replace `runSimulation` with a new function `processChunk` that returns a Promise.

```typescript
const processChunk = (chunkMarkdown: string, chunkIndex: number, total: number) => {
  return new Promise<void>((resolve, reject) => {
    connect({
      markdown: chunkMarkdown,
      title: `${bookName}:${chapterName}`,
      force_refresh: forceRefresh,
    });
    // The onEvent handler passed to usePipelineSSE will handle stage updates
    // We need a way to resolve/reject this promise based on events.
  });
};
```

*Note: Since the hook is initialized once, we might need to handle the Promise resolution inside the `onEvent` callback or refactor the hook/usage slightly.*

**Step 4: Update `handleSubmit` to iterate sequentially**

```typescript
const handleSubmit = async () => {
  // ... chunking logic ...
  setIsRunning(true);
  for (let i = 0; i < chunks.length; i++) {
    setCurrentChunk(i + 1);
    await processChunk(chunks[i], i + 1, chunks.length);
  }
  setIsRunning(false);
  setIsDone(true);
};
```

**Step 5: Verify the mapping of stages**

Ensure `stage_update` events from the backend correctly update the `stages` state in the UI.
Mapping:
- `check` -> `check`
- `outline_draft` -> `draft`
- `qa_draft` -> `draft` (append status)
- `judge` -> `judge`
- `revise` -> `revise`
- `save` -> `save`

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat(solo-138): integrate real backend pipeline and remove mocks"
```

### Task 2: Manual Verification

**Step 1: Start the backend server**

Run: `uv run uvicorn note_taker.api.main:app --reload --port 8000`

**Step 2: Start the frontend dev server**

Run: `pnpm dev`

**Step 3: Run the pipeline with sample data**

- Navigate to http://localhost:3000
- Click "Load sample"
- Click "Run Pipeline"
- Observe the "Pipeline" widget. Verify stages transition from `idle` -> `active` -> `done`.

**Step 4: Verify "Draft" stage multi-step updates**

Since `outline_draft` and `qa_draft` both map to "Draft", verify that the detail text updates correctly for each step.

**Step 5: Verify Artifact Persistence**

- After completion, click "Browse artifacts".
- Verify the new entry exists and contains the correct Q&A pairs.
