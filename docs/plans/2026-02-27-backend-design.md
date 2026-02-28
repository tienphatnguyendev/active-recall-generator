# Active Recall Generator: Backend Design & Backlog

**Date:** 2026-02-27  
**Goal:** Define the backend architecture for the Active Recall Generator and establish a backlog of development tasks to implement all stubbed API functionality and data persistence.

## Architecture Decisions

Based on initial brainstorming, we will use a **Hybrid Architecture**:
1.  **FastAPI Backend:** A lightweight Python service dedicated exclusively to running the compute-heavy LangGraph AI pipeline ("Draft → Judge → Revise"). It will expose a single endpoint that accepts text and streams Server-Sent Events (SSE) back to the UI.
2.  **Supabase (Direct from Client):** The Next.js frontend will use `@supabase/supabase-js` to directly interact with a Supabase PostgreSQL database. This handles User Authentication, Artifact CRUD, Study Session logging, and fetching Analytics data.
    - We will implement Row Level Security (RLS) in Supabase to ensure users only access their own data.

This architecture minimizes backend code, delegates standard CRUD to a highly scalable managed service, and isolates the complex AI logic into a specialized Python service.

---

## Technical Stack

*   **Database & Auth:** Supabase (PostgreSQL, GoTrue Auth)
*   **Web Framework (AI Pipeline):** FastAPI (Python)
*   **AI Orchestration:** LangGraph, Groq API (or routing via LiteLLM/Custom Router)
*   **Frontend Data Fetching:** Supabase JS Client (replaces current fetch wrapper for CRUD)

---

## Development Backlog

The following tasks are broken down for creation in Linear.

### Phase 1: Database Foundation (Supabase)

#### Task 1: Initialize Supabase Project & Define Schema
*   **Description:** Create the core SQL schema in a new Supabase project. We need tables for `users` (managed by auth), `artifacts` (the Q&A sets), `cards` (individual Q&A pairs linked to an artifact), and `study_sessions` (logs of user ratings for spaced repetition).
*   **Priority:** High
*   **Complexity:** Medium
*   **Dependencies:** None
*   **Acceptance Criteria:** SQL schema script is written and documented in the repo; tables exist in Supabase.

#### Task 2: Implement Row Level Security (RLS) Policies
*   **Description:** Write RLS policies for all tables created in Task 1 to ensure that any logged-in user can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows where `user_id == auth.uid()`.
*   **Priority:** High
*   **Complexity:** Medium
*   **Dependencies:** Task 1
*   **Acceptance Criteria:** RLS policies are active; test queries confirm users cannot access other users' data.

### Phase 2: Frontend Integration (Supabase)

#### Task 3: Integrate Supabase Auth in Next.js
*   **Description:** Replace the mock `AuthContext` in the Next.js frontend with `@supabase/ssr` or `@supabase/supabase-js`. Implement real Login, Registration, and Password Reset flows against Supabase Auth.
*   **Priority:** High
*   **Complexity:** Medium
*   **Dependencies:** Task 1
*   **Acceptance Criteria:** Users can successfully register, log in, and persist their session across page reloads.

#### Task 4: Migrate Artifact CRUD to Supabase Client
*   **Description:** Replace the stubbed `/api/artifacts` fetch calls in the UI with direct Supabase client queries. Implement fetching the artifact list, getting a single artifact by ID, and deleting artifacts.
*   **Priority:** High
*   **Complexity:** Medium
*   **Dependencies:** Task 1, Task 3
*   **Acceptance Criteria:** The Artifacts browse page displays real data from Supabase; users can delete their own artifacts.

#### Task 5: Implement Study Session Logging via Server Actions
*   **Description:** Update the study mode UI to push flashcard ratings (Know/Unsure/Unknown) to a Next.js Server Action. The Server Action will handle FSRS logic (calculating `state_before` and `state_after`) and insert the row securely into the `study_sessions` table in Supabase.
*   **Priority:** Medium
*   **Complexity:** Medium
*   **Dependencies:** Task 1, Task 3
*   **Acceptance Criteria:** Clicking a rating button during study mode successfully triggers the Server Action, calculates FSRS states, and creates a row in the Supabase database.

#### Task 6: Build Analytics Queries using Supabase
*   **Description:** Replace the mock data in `/api/analytics` and `/api/study`. Write Supabase RPCs (stored procedures) or complex frontend queries to calculate: weekly activity, mastery distribution, and streak data based on the `study_sessions` table.
*   **Priority:** Medium
*   **Complexity:** Complex
*   **Dependencies:** Task 1, Task 5
*   **Acceptance Criteria:** The Analytics dashboard renders accurate stats, charts, and streak widgets based on actual user study history.

### Phase 3: AI Pipeline Integration (FastAPI)

#### Task 7: Scaffold FastAPI Application
*   **Description:** Create a new Python FastAPI application (e.g., in a `api/` or `server/` directory). Set up CORS properly to accept requests from the Next.js frontend frontend.
*   **Priority:** High
*   **Complexity:** Simple
*   **Dependencies:** None
*   **Acceptance Criteria:** A "Hello World" FastAPI endpoint is accessible from the frontend during local development.

#### Task 8: Expose LangGraph Pipeline as SSE Endpoint
*   **Description:** Create a POST endpoint `/api/generate` in FastAPI. It must take Markdown text, invoke the existing LangGraph core orchestration (`src/note_taker/pipeline/graph.py`), and stream Server-Sent Events back to the client matching the UI's expected format (e.g., Check -> Draft -> Judge -> Revise).
*   **Priority:** High
*   **Complexity:** Complex
*   **Dependencies:** Task 7
*   **Acceptance Criteria:** The frontend "Generate" button triggers the FastAPI endpoint, and the pipeline UI correctly visualizes the streaming progress.

#### Task 9: Secure FastAPI Endpoint & Save to Supabase
*   **Description:** The FastAPI endpoint must receive the user's Supabase JWT, verify it, run the pipeline, and then insert the final generated Artifact and Cards directly into the Supabase database on behalf of the user. Include error handling for rate limits or pipeline failures.
*   **Priority:** High
*   **Complexity:** Medium
*   **Dependencies:** Task 1, Task 8
*   **Acceptance Criteria:** Successfully generated artifacts appear immediately in the user's Supabase database and are viewable in the Artifacts Browser UI.
