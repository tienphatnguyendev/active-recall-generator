# Backend API & Configuration Reference

## Active Recall Generator -- Complete Backend Specification

> **Audience:** Developers implementing or troubleshooting the backend integration.
> This document maps every API route the frontend expects, describes the request/response contracts, lists authentication requirements, documents environment variables, and explains the frontend routing structure.

---

## Table of Contents

1. [Frontend Route Map](#1-frontend-route-map)
2. [API Client Architecture](#2-api-client-architecture)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Artifact Endpoints](#4-artifact-endpoints)
5. [Study Session Endpoints](#5-study-session-endpoints)
6. [Analytics Endpoints](#6-analytics-endpoints)
7. [Content Processing Pipeline Endpoints](#7-content-processing-pipeline-endpoints)
8. [Database Schema](#8-database-schema)
9. [Environment Variables](#9-environment-variables)
10. [Error Handling Contract](#10-error-handling-contract)
11. [Known Integration Gaps & Debugging Guide](#11-known-integration-gaps--debugging-guide)
12. [Security & Performance](#12-security--performance)
13. [Implementation Priorities](#13-implementation-priorities)

---

## 1. Frontend Route Map

The Next.js App Router defines the following page routes. All pages are client components (`"use client"`) rendered inside a root `<AuthProvider>` wrapper.

| Path                 | File                          | Auth Required | Description                               |
| -------------------- | ----------------------------- | ------------- | ----------------------------------------- |
| `/`                  | `app/page.tsx`                | No            | Generate page -- Markdown upload & pipeline simulation |
| `/artifacts`         | `app/artifacts/page.tsx`      | Yes           | Browse, search, and manage Q&A artifacts  |
| `/study`             | `app/study/page.tsx`          | Yes           | Flashcard study mode with spaced repetition |
| `/analytics`         | `app/analytics/page.tsx`      | No (dev)      | Learning analytics dashboard              |
| `/login`             | `app/login/page.tsx`          | No            | Sign-in form                              |
| `/register`          | `app/register/page.tsx`       | No            | Account creation form                     |
| `/forgot-password`   | `app/forgot-password/page.tsx`| No            | Password reset request form               |
| `/reset-password`    | `app/reset-password/page.tsx` | No            | Password reset form (requires `?token=`)  |

### Navigation

The `<Nav>` component (`components/nav.tsx`) renders a persistent header with links to `/`, `/artifacts`, `/study`, and `/analytics`. Mobile navigation uses a hamburger menu. Navigation uses Next.js `<Link>` components with `usePathname()` for active state.

---

## 2. API Client Architecture

**File:** `lib/api-client.ts`

All authenticated API calls from the frontend go through a centralized `api` client that:

1. Auto-attaches `Authorization: Bearer <token>` from an in-memory access token.
2. Sets `Content-Type: application/json` by default (stripped for `FormData`).
3. Handles **401 responses** by calling a configurable `refreshFn` once, then retrying.
4. Throws a typed `ApiError(status, message, data)` for non-2xx responses.
5. Returns `undefined` for 204 No Content responses.

```typescript
// Usage pattern
import { api } from "@/lib/api-client";
const data = await api.get<ResponseType>("/api/artifacts");
const created = await api.post<ResponseType>("/api/artifacts", body);
const updated = await api.patch<ResponseType>("/api/artifacts/123", body);
await api.delete("/api/artifacts/123");
```

### Token Lifecycle

| Event             | Action                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| App bootstrap     | `AuthProvider` calls `POST /api/auth/refresh` to restore session        |
| Login             | `POST /api/auth/login` returns `{ accessToken, user }`                  |
| Register          | `POST /api/auth/register` returns `{ accessToken, user }`              |
| 401 on any call   | `api-client` calls `refreshFn` -> `POST /api/auth/refresh`             |
| Logout            | `POST /api/auth/logout`, clears in-memory token                        |

**Critical:** The `AuthContext` reads `res.accessToken` from login and register responses. Backend routes **must** return the token under the field name `accessToken`, not `token`.

---

## 3. Authentication Endpoints

All auth routes live under `app/api/auth/`.

### POST `/api/auth/register`

Create a new user account.

| Field     | Location | Type     | Required | Constraints              |
| --------- | -------- | -------- | -------- | ------------------------ |
| `name`    | body     | `string` | Yes      | Non-empty                |
| `email`   | body     | `string` | Yes      | Valid email, unique       |
| `password`| body     | `string` | Yes      | Min 8 characters          |

**Success Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Smith"
  },
  "accessToken": "jwt_string"
}
```

**Error Responses:**
- `400` -- Missing required fields or password too short.
- `409` -- Email already registered.
- `500` -- Internal server error.

**Implementation Notes:**
- Hash password with bcrypt (min 10 rounds).
- Generate JWT with user ID claim; set 1-hour expiry.
- Issue httpOnly refresh token cookie (7-day expiry).
- Rate limit: 5 requests/hour per IP.

---

### POST `/api/auth/login`

Authenticate an existing user.

| Field     | Location | Type     | Required |
| --------- | -------- | -------- | -------- |
| `email`   | body     | `string` | Yes      |
| `password`| body     | `string` | Yes      |

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "accessToken": "jwt_string"
}
```

**Error Responses:**
- `400` -- Missing email or password.
- `401` -- Invalid credentials.
- `429` -- Too many failed attempts.

**Implementation Notes:**
- Compare bcrypt hash; do not reveal whether email exists.
- Rate limit: 10 attempts per 15 minutes per email.
- Set refresh token as httpOnly cookie.

---

### POST `/api/auth/refresh`

Silent token refresh. Called on app bootstrap and on 401 retry.

| Field         | Location | Type     | Required |
| ------------- | -------- | -------- | -------- |
| Refresh token | cookie   | `string` | Yes      |

**Success Response (200):**
```json
{
  "accessToken": "new_jwt_string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Error Response:** `401` -- Invalid or expired refresh token.

**Route file needed:** `app/api/auth/refresh/route.ts` (currently **missing**).

---

### POST `/api/auth/logout`

Invalidate the current session.

| Field           | Location | Type     | Required |
| --------------- | -------- | -------- | -------- |
| `Authorization` | header   | `Bearer` | Yes      |

**Success Response (200):**
```json
{ "message": "Logged out" }
```

**Implementation Notes:**
- Clear the refresh token cookie.
- Optionally blacklist the access token in a short-lived cache.

**Route file needed:** `app/api/auth/logout/route.ts` (currently **missing**).

---

### POST `/api/auth/forgot-password`

Request a password reset email.

| Field   | Location | Type     | Required |
| ------- | -------- | -------- | -------- |
| `email` | body     | `string` | Yes      |

**Success Response (200):**
```json
{ "message": "Reset link sent" }
```

Always return 200 to prevent email enumeration.

**Route file needed:** `app/api/auth/forgot-password/route.ts` (currently **missing**).

---

### POST `/api/auth/reset-password`

Set a new password using a reset token.

| Field      | Location | Type     | Required |
| ---------- | -------- | -------- | -------- |
| `token`    | body     | `string` | Yes      |
| `password` | body     | `string` | Yes      |

**Success Response (200):**
```json
{ "message": "Password updated" }
```

**Error Responses:**
- `400` -- Token expired or password too weak.
- `401` -- Invalid token.

**Route file needed:** `app/api/auth/reset-password/route.ts` (currently **missing**).

---

### GET `/api/auth/user`

Fetch the authenticated user's profile.

| Field           | Location | Type     | Required |
| --------------- | -------- | -------- | -------- |
| `Authorization` | header   | `Bearer` | Yes      |

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

---

### PUT `/api/auth/user`

Update user profile fields.

| Field   | Location | Type     | Required |
| ------- | -------- | -------- | -------- |
| `name`  | body     | `string` | No       |
| `email` | body     | `string` | No       |

**Success Response (200):**
```json
{
  "user": { "id": "uuid", "email": "new@email.com", "name": "New Name" }
}
```

---

## 4. Artifact Endpoints

All artifact routes require `Authorization: Bearer <token>`.

### GET `/api/artifacts`

Fetch paginated list of the authenticated user's artifacts.

| Param    | Location | Type     | Default  | Description                          |
| -------- | -------- | -------- | -------- | ------------------------------------ |
| `page`   | query    | `number` | `1`      | Page number                          |
| `limit`  | query    | `number` | `10`     | Items per page (max 100)             |
| `sort`   | query    | `string` | `created`| Sort field: `created`, `updated`, `qaPairCount` |
| `filter` | query    | `string` | `all`    | Filter: `all`, `mastered`, `inProgress`, `notStarted` |
| `search` | query    | `string` | --       | Full-text search across title, book, chapter |
| `tags`   | query    | `string` | --       | Comma-separated tag filter           |

**Success Response (200):**
```json
{
  "artifacts": [
    {
      "id": "uuid",
      "title": "string",
      "source": "BookName:Chapter",
      "content": "string",
      "tags": ["string"],
      "notes": "string",
      "mastery": 0,
      "qaPairs": [
        {
          "id": "uuid",
          "question": "string",
          "answer": "string",
          "judgeScore": 0.85
        }
      ],
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Frontend consumption note:** The artifacts page and study page both normalise this response -- they check whether the response is a raw array or a `{ artifacts: [...] }` wrapper. Always return the wrapper format shown above.

---

### POST `/api/artifacts`

Create a new artifact.

| Field     | Location | Type       | Required |
| --------- | -------- | ---------- | -------- |
| `title`   | body     | `string`   | Yes      |
| `content` | body     | `string`   | Yes      |
| `tags`    | body     | `string[]` | No       |
| `notes`   | body     | `string`   | No       |

**Success Response (201):**
```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "tags": [],
  "notes": "",
  "createdAt": "ISO 8601",
  "mastery": 0
}
```

---

### GET `/api/artifacts/[id]`

Fetch a single artifact by ID.

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "tags": [],
  "notes": "",
  "mastery": 0,
  "createdAt": "ISO 8601"
}
```

**Error:** `404` if not found or not owned by user.

---

### PUT `/api/artifacts/[id]`

Update an existing artifact.

| Field     | Location | Type       | Required |
| --------- | -------- | ---------- | -------- |
| `title`   | body     | `string`   | No       |
| `content` | body     | `string`   | No       |
| `tags`    | body     | `string[]` | No       |
| `notes`   | body     | `string`   | No       |

**Success Response (200):**
```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "tags": [],
  "notes": "",
  "mastery": 0,
  "updatedAt": "ISO 8601"
}
```

---

### DELETE `/api/artifacts/[id]`

Soft-delete an artifact (set `deletedAt` timestamp).

**Success Response (200):**
```json
{ "success": true, "message": "Artifact deleted successfully" }
```

---

### GET `/api/artifacts/export`

Bulk export all user artifacts.

| Param    | Location | Type     | Default | Allowed            |
| -------- | -------- | -------- | ------- | ------------------ |
| `format` | query    | `string` | `json`  | `json`, `csv`, `pdf`, `anki` |

**Success Response (200):** Binary download with `Content-Disposition: attachment` header. Content-Type varies by format.

---

### GET `/api/artifacts/[id]/export`

Export a single artifact.

Same query parameters and response format as the bulk export above, scoped to one artifact. Returns `404` if artifact not found.

---

## 5. Study Session Endpoints

### GET `/api/study`

Fetch study sessions for the authenticated user.

| Param        | Location | Type     | Default |
| ------------ | -------- | -------- | ------- |
| `artifactId` | query    | `string` | --      |
| `limit`      | query    | `number` | `10`    |

**Success Response (200):**
```json
{
  "sessions": [],
  "total": 0
}
```

---

### POST `/api/study`

Create a new study session.

| Field        | Location | Type     | Required |
| ------------ | -------- | -------- | -------- |
| `artifactId` | body     | `string` | Yes      |
| `mode`       | body     | `string` | Yes      |
| `duration`   | body     | `number` | No       |
| `results`    | body     | `object` | No       |

**Success Response (201):**
```json
{
  "id": "session_uuid",
  "artifactId": "uuid",
  "mode": "all",
  "duration": 300,
  "results": {},
  "completedAt": "ISO 8601"
}
```

---

## 6. Analytics Endpoints

### GET `/api/analytics`

Fetch the analytics dashboard data.

**Current behavior:** Returns mock data without requiring authentication (for development). Production should require `Authorization: Bearer <token>`.

**Success Response (200):**
```json
{
  "stats": [
    { "label": "string", "value": "string|number", "subValue": "string", "trend": "up|down|neutral", "trendValue": "string" }
  ],
  "streak": {
    "currentStreak": 5,
    "longestStreak": 12,
    "studiedToday": true,
    "recentDays": [{ "date": "2026-02-27", "studied": true }]
  },
  "weeklyActivity": [
    { "date": "2026-02-27", "cardsStudied": 15, "sessionCount": 2 }
  ],
  "masteryDistribution": {
    "data": [{ "level": "mastered", "count": 10 }],
    "totalCards": 50
  },
  "performanceByTopic": [
    { "topic": "string", "source": "string", "totalCards": 10, "knownPct": 80, "unsurePct": 15, "unknownPct": 5 }
  ],
  "artifacts": [
    {
      "artifactId": "uuid",
      "section": "string",
      "source": "string",
      "mastery": "mastered|proficient|learning|beginner|notStarted",
      "studyTimeline": [{ "date": "2026-02-27", "rating": "know" }],
      "weakAreas": [{ "question": "string", "timesUnknown": 3, "lastAttempted": "ISO 8601" }],
      "nextSessionSuggestion": "string"
    }
  ]
}
```

---

### GET `/api/analytics/export`

Export analytics data.

| Param    | Location | Type     | Default | Allowed        |
| -------- | -------- | -------- | ------- | -------------- |
| `format` | query    | `string` | `json`  | `json`, `csv`  |

**Route file needed:** `app/api/analytics/export/route.ts` (currently **missing**).

---

## 7. Content Processing Pipeline Endpoints

The frontend's `usePipelineSSE` hook and `PipelineCancelButton` component reference the following endpoints that are **not yet implemented** as route files:

### POST `/api/process/upload`

Upload markdown content for processing.

| Field          | Location | Type      | Required |
| -------------- | -------- | --------- | -------- |
| `markdown`     | body     | `string`  | Yes (if no file) |
| `file`         | body     | `File`    | Yes (if no markdown) |
| `bookName`     | body     | `string`  | Yes      |
| `chapterName`  | body     | `string`  | Yes      |
| `forceRefresh` | body     | `boolean` | No       |

**Success Response (202):**
```json
{
  "uploadId": "uuid",
  "totalChunks": 3,
  "chunks": [{ "id": "uuid", "hash": "sha256", "preview": "text...", "size": 1200 }],
  "estimatedProcessingTime": 15
}
```

---

### POST `/api/process/start-pipeline`

Start the AI processing pipeline for an upload.

| Field      | Location | Type     | Required |
| ---------- | -------- | -------- | -------- |
| `uploadId` | body     | `string` | Yes      |

**Success Response (202):**
```json
{ "pipelineId": "uuid", "message": "Pipeline started" }
```

---

### GET `/api/process/pipeline/[pipelineId]/events`

Server-Sent Events stream for real-time pipeline progress.

| Param   | Location | Type     | Required | Description              |
| ------- | -------- | -------- | -------- | ------------------------ |
| `token` | query    | `string` | Yes      | Access token (SSE cannot set headers) |

**Event types:**
```
event: message
data: {"type":"stage","stageId":"draft","status":"active","detail":"Generating Q&A..."}

event: message
data: {"type":"chunk","current":2,"total":5}

event: message
data: {"type":"complete","qaCount":15}

event: message
data: {"type":"error","message":"LLM timeout"}
```

---

### GET `/api/process/pipeline/[pipelineId]/status`

Polling fallback for pipeline progress (used when SSE fails).

**Success Response (200):**
```json
{
  "status": "processing",
  "stage": { "id": "judge", "status": "active", "detail": "Scoring pair 2/3" },
  "chunk": 2,
  "total": 5,
  "qaCount": 6
}
```

---

### POST `/api/process/pipeline/[pipelineId]/cancel`

Cancel a running pipeline.

**Success Response (200):**
```json
{ "message": "Pipeline cancelled" }
```

---

## 8. Database Schema

The application requires the following core tables. Use PostgreSQL (Neon, Supabase, or equivalent).

```sql
-- Users
CREATE TABLE users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  bio           TEXT,
  preferences   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- Uploads (markdown submissions)
CREATE TABLE uploads (
  upload_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(user_id),
  book_name        VARCHAR(255) NOT NULL,
  chapter_name     VARCHAR(255) NOT NULL,
  total_chunks     INT NOT NULL,
  processed_chunks INT DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'queued',
  created_at       TIMESTAMPTZ DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

-- Content Chunks
CREATE TABLE content_chunks (
  chunk_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id         UUID NOT NULL REFERENCES uploads(upload_id),
  user_id           UUID NOT NULL REFERENCES users(user_id),
  content_hash      VARCHAR(64) NOT NULL,
  markdown          TEXT NOT NULL,
  section           VARCHAR(255),
  subsection        VARCHAR(255),
  size              INT,
  processing_status VARCHAR(20) DEFAULT 'pending',
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chunks_hash ON content_chunks(content_hash);

-- Pipelines (AI processing runs)
CREATE TABLE pipelines (
  pipeline_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id     UUID NOT NULL REFERENCES uploads(upload_id),
  user_id       UUID NOT NULL REFERENCES users(user_id),
  status        VARCHAR(20) DEFAULT 'queued',
  current_chunk INT DEFAULT 0,
  total_chunks  INT NOT NULL,
  total_qa_pairs INT DEFAULT 0,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error_log     JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Artifacts (Q&A collections)
CREATE TABLE artifacts (
  artifact_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id),
  upload_id    UUID REFERENCES uploads(upload_id),
  pipeline_id  UUID REFERENCES pipelines(pipeline_id),
  book_name    VARCHAR(255) NOT NULL,
  chapter_name VARCHAR(255) NOT NULL,
  section_name VARCHAR(255),
  outline      JSONB NOT NULL,
  tags         TEXT[],
  notes        TEXT,
  is_public    BOOLEAN DEFAULT FALSE,
  stats        JSONB DEFAULT '{"totalQAPairs":0,"avgScore":0}',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);
CREATE INDEX idx_artifacts_user ON artifacts(user_id, created_at DESC);

-- QA Pairs
CREATE TABLE qa_pairs (
  pair_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id    UUID NOT NULL REFERENCES artifacts(artifact_id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  answer         TEXT NOT NULL,
  source_context TEXT,
  revision_cycle INT DEFAULT 0,
  judge_score    FLOAT NOT NULL,
  judge_feedback TEXT,
  status         VARCHAR(20) DEFAULT 'generated',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_qa_artifact ON qa_pairs(artifact_id);

-- Study Sessions
CREATE TABLE study_sessions (
  session_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id),
  artifact_ids UUID[] NOT NULL,
  mode         VARCHAR(20) DEFAULT 'all',
  status       VARCHAR(20) DEFAULT 'active',
  time_limit   INT,
  started_at   TIMESTAMPTZ DEFAULT now(),
  ended_at     TIMESTAMPTZ
);

-- Study Results (per-card ratings)
CREATE TABLE study_results (
  result_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES study_sessions(session_id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(user_id),
  pair_id       UUID NOT NULL REFERENCES qa_pairs(pair_id),
  rating        VARCHAR(10) NOT NULL,
  confidence    FLOAT,
  time_spent_ms INT,
  answered_at   TIMESTAMPTZ DEFAULT now()
);

-- Mastery Records (spaced repetition)
CREATE TABLE mastery_records (
  mastery_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(user_id),
  pair_id             UUID NOT NULL REFERENCES qa_pairs(pair_id) ON DELETE CASCADE,
  mastery_level       INT CHECK (mastery_level BETWEEN 0 AND 5) DEFAULT 0,
  easiness_factor     FLOAT DEFAULT 2.5,
  current_interval    INT DEFAULT 1,
  next_review_date    DATE NOT NULL,
  review_count        INT DEFAULT 0,
  last_reviewed_at    TIMESTAMPTZ,
  correct_consecutive INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pair_id)
);
CREATE INDEX idx_mastery_review ON mastery_records(user_id, next_review_date);
```

---

## 9. Environment Variables

The following environment variables are required for a production deployment:

| Variable              | Required | Description                                            |
| --------------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string (e.g., Neon, Supabase)    |
| `JWT_SECRET`          | Yes      | Secret key for signing JWT access tokens (min 256-bit) |
| `JWT_REFRESH_SECRET`  | Yes      | Separate secret for refresh tokens                     |
| `OPENAI_API_KEY`      | Yes*     | API key for GPT-4 / OpenAI (Draft & Judge stages)      |
| `ANTHROPIC_API_KEY`   | No       | Alternative LLM provider for Claude                    |
| `SMTP_HOST`           | Yes*     | SMTP server for password reset emails                  |
| `SMTP_PORT`           | Yes*     | SMTP port (typically 587 for TLS)                      |
| `SMTP_USER`           | Yes*     | SMTP username                                          |
| `SMTP_PASS`           | Yes*     | SMTP password                                          |
| `SMTP_FROM`           | Yes*     | "From" address for outgoing emails                     |
| `APP_URL`             | Yes      | Public application URL (for email links)               |
| `REDIS_URL`           | No       | Redis connection for caching & rate limiting            |
| `NEXT_PUBLIC_APP_URL` | No       | Client-side accessible app URL                         |

> *Marked with `*` = required for full functionality but can be deferred for MVP.

---

## 10. Error Handling Contract

All API routes must return errors in a consistent shape consumed by the frontend `ApiError` class:

```json
{
  "error": "Human-readable error message"
}
```

Or the more detailed form:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is not valid",
    "details": "RFC 5322 validation failed",
    "requestId": "req_abc123"
  }
}
```

### Status Code Reference

| Code | Meaning              | When to Use                                 |
| ---- | -------------------- | ------------------------------------------- |
| 200  | OK                   | Successful read/update/delete               |
| 201  | Created              | Resource created (register, create artifact) |
| 202  | Accepted             | Async operation started (pipeline)           |
| 204  | No Content           | Success with empty body                      |
| 400  | Bad Request          | Validation error, missing fields             |
| 401  | Unauthorized         | Missing or invalid token                     |
| 403  | Forbidden            | Token valid but insufficient permissions     |
| 404  | Not Found            | Resource not found or no matching route      |
| 409  | Conflict             | Duplicate email on register                  |
| 413  | Payload Too Large    | Markdown exceeds 25MB limit                  |
| 429  | Too Many Requests    | Rate limit exceeded (include `Retry-After`)  |
| 500  | Internal Server Error| Unhandled exception                          |
| 503  | Service Unavailable  | LLM or database temporarily down             |

The frontend `api-client` specifically handles:
- **401:** Triggers token refresh + retry once.
- **429:** Throws `ApiError(429, "Too many requests. Please slow down.")`.
- **All others:** Parses `message` from response body or falls back to `res.statusText`.

---

## 11. Known Integration Gaps & Debugging Guide

### Missing Route Files

The frontend references the following endpoints that do **not** have corresponding `route.ts` files. Requests to these will return a Next.js 404:

| Endpoint                                | Referenced By                          |
| --------------------------------------- | -------------------------------------- |
| `POST /api/auth/refresh`               | `AuthContext` bootstrap + token refresh |
| `POST /api/auth/logout`                | `AuthContext.logout()`                  |
| `POST /api/auth/forgot-password`       | `forgot-password/page.tsx`              |
| `POST /api/auth/reset-password`        | `reset-password/page.tsx`               |
| `PATCH /api/auth/profile`              | `AuthContext.updateProfile()`           |
| `POST /api/process/upload`             | Pipeline upload (future)                |
| `POST /api/process/start-pipeline`     | Pipeline start (future)                 |
| `GET /api/process/pipeline/[id]/events`| `usePipelineSSE` hook                   |
| `GET /api/process/pipeline/[id]/status`| `usePipelineSSE` polling fallback       |
| `POST /api/process/pipeline/[id]/cancel`| `PipelineCancelButton`                |
| `GET /api/analytics/export`            | `AnalyticsExportButton`                 |

### Common 404 Causes & Debugging Steps

1. **Route file does not exist:** Verify a `route.ts` file exists at the correct path under `app/api/`. Next.js App Router maps file paths to URL segments.

2. **Dynamic segment mismatch:** Dynamic segments use `[param]` folder naming. Verify `app/api/artifacts/[id]/route.ts` exists for `/api/artifacts/:id`.

3. **Static vs dynamic route priority:** Next.js resolves static segments (`/export`) before dynamic ones (`/[id]`). Place `app/api/artifacts/export/route.ts` alongside (not inside) `app/api/artifacts/[id]/`.

4. **Missing HTTP method export:** Each route file must `export async function GET|POST|PUT|PATCH|DELETE`. If the exported function name does not match the HTTP method, the route returns 405.

5. **Token field name mismatch:** The `AuthContext` reads `res.accessToken`. If a route returns `{ token: "..." }` instead of `{ accessToken: "..." }`, the in-memory token is set to `undefined` and all subsequent authenticated requests fail with 401.

6. **Missing Authorization header:** Pages or components that call `fetch()` directly (instead of `api.get()`) do not auto-attach the Bearer token. All authenticated calls should use the `api` client from `lib/api-client.ts`.

7. **Response shape mismatch:** The artifacts page expects `{ artifacts: [...], total, page, limit, totalPages }`. Returning a plain array causes the `.length` guard to fail silently.

### Verification Checklist

```bash
# 1. Confirm route file exists for every endpoint
ls app/api/auth/*/route.ts
ls app/api/artifacts/route.ts
ls app/api/artifacts/\[id\]/route.ts
ls app/api/artifacts/export/route.ts
ls app/api/artifacts/\[id\]/export/route.ts
ls app/api/study/route.ts
ls app/api/analytics/route.ts

# 2. Verify JWT secret is set
echo $JWT_SECRET

# 3. Test an authenticated endpoint
TOKEN="your_jwt_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/artifacts

# 4. Check for 404 vs 401 vs 500
curl -v http://localhost:3000/api/artifacts  # Expect 401 (no token)
curl -v http://localhost:3000/api/nonexistent # Expect 404

# 5. Test login returns correct field name
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  | jq '.accessToken'  # Should NOT be null
```

---

## 12. Security & Performance

### Authentication Security

- **JWT:** Use RS256 (asymmetric) or HS256 with a strong secret (min 256-bit).
- **Access tokens:** 1-hour expiry. Stored in-memory only (not localStorage).
- **Refresh tokens:** 7-day expiry. Stored in `httpOnly`, `secure`, `sameSite=strict` cookies.
- **Password hashing:** bcrypt with min 10 salt rounds.
- **CSRF:** Implement CSRF tokens for state-changing cookie-authenticated requests.
- **Rate limiting:** Per-endpoint limits as documented above.

### Caching Strategy

| Layer       | Target                       | TTL     | Invalidation              |
| ----------- | ---------------------------- | ------- | ------------------------- |
| Client      | Artifact listings (SWR)      | 24h     | On create/update/delete   |
| Application | Analytics dashboard (Redis)  | 1h      | On new study session      |
| Application | LLM responses (Redis)        | 30d     | Content hash key          |
| Database    | Composite indexes on user_id | --      | Automatic                 |

### Performance Targets

| Endpoint                | Target Latency |
| ----------------------- | -------------- |
| `GET /api/artifacts`    | < 200ms        |
| `GET /api/study`        | < 300ms        |
| `GET /api/analytics`    | < 500ms        |
| `POST /api/artifacts`   | < 1s           |
| Pipeline per chunk      | < 30s          |

---

## 13. Implementation Priorities

### Phase 1: Authentication (MVP)

1. Implement `POST /api/auth/register` with bcrypt + JWT.
2. Implement `POST /api/auth/login` with `accessToken` field name.
3. Create `POST /api/auth/refresh` route with httpOnly cookie.
4. Create `POST /api/auth/logout` route.
5. Set up `JWT_SECRET` and `DATABASE_URL` environment variables.

### Phase 2: Core Data (MVP)

6. Connect `GET /api/artifacts` to real database queries with pagination.
7. Connect `POST /api/artifacts` to database insertion.
8. Connect `GET/PUT/DELETE /api/artifacts/[id]` to database.
9. Implement `POST /api/study` and `GET /api/study` with database.

### Phase 3: Pipeline Integration

10. Implement `POST /api/process/upload` with markdown chunking.
11. Implement `POST /api/process/start-pipeline` with LLM integration.
12. Implement SSE stream at `GET /api/process/pipeline/[id]/events`.
13. Implement polling fallback and cancel endpoints.

### Phase 4: Analytics & Export

14. Connect `GET /api/analytics` to real aggregated data.
15. Implement `GET /api/analytics/export`.
16. Implement password reset flow (`forgot-password`, `reset-password`).
17. Add Redis caching layer.

---

## Summary Table

| Category              | Endpoint Count | Existing Routes | Missing Routes | Complexity |
| --------------------- | -------------- | --------------- | -------------- | ---------- |
| Authentication        | 7              | 3               | 4              | Medium     |
| Artifacts             | 6              | 4               | 0              | Medium     |
| Study Sessions        | 2              | 1               | 0              | Medium     |
| Analytics             | 2              | 1               | 1              | High       |
| Pipeline Processing   | 5              | 0               | 5              | High       |
| **Total**             | **22**         | **9**           | **10**         | --         |

This specification provides the complete contract between the frontend and backend, enabling developers to implement, test, and troubleshoot every integration point in the Active Recall Generator.
