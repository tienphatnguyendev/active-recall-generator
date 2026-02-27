# Backend API & Feature Requirements
## Active Recall Generator - Complete Backend Specification

---

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Content Processing Pipeline](#content-processing-pipeline)
3. [Artifact Management](#artifact-management)
4. [Study Sessions & Analytics](#study-sessions--analytics)
5. [Database Schema](#database-schema)
6. [Error Handling & Status Codes](#error-handling--status-codes)
7. [Performance & Caching](#performance--caching)
8. [Security Considerations](#security-considerations)

---

## Authentication & Authorization

### 1. User Registration & Account Management

**Purpose:** Enable users to create accounts, manage credentials, and maintain persistent data across sessions.

**Features:**
- User account creation with email/password
- Email verification (optional but recommended)
- Password reset via email link
- User profile management (name, bio, preferences)
- Account deletion with data cleanup

**API Endpoints:**

```
POST /api/auth/register
  Input: { email: string, password: string, name: string }
  Output: { userId: string, token: string, message: string }
  Status: 201 Created | 400 Bad Request | 409 Conflict (email exists)
  Security: Hash password with bcrypt (min 10 rounds), validate email format
  Rate limit: 5 requests per hour per IP

POST /api/auth/login
  Input: { email: string, password: string }
  Output: { userId: string, token: string, expiresIn: number }
  Status: 200 OK | 401 Unauthorized | 429 Too Many Requests
  Security: Compare bcrypt hashes, implement exponential backoff after failed attempts
  Rate limit: 10 attempts per 15 minutes per email

POST /api/auth/logout
  Headers: Authorization: Bearer {token}
  Output: { message: string }
  Status: 200 OK | 401 Unauthorized

POST /api/auth/refresh-token
  Input: { refreshToken: string }
  Output: { token: string, expiresIn: number }
  Status: 200 OK | 401 Unauthorized

POST /api/auth/forgot-password
  Input: { email: string }
  Output: { message: "Reset link sent" }
  Status: 200 OK (always return success to prevent email enumeration)

POST /api/auth/reset-password
  Input: { token: string, newPassword: string }
  Output: { message: string }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized
  Validation: Token must not be expired, password strength requirements

GET /api/users/profile
  Headers: Authorization: Bearer {token}
  Output: { userId, email, name, createdAt, subscription }
  Status: 200 OK | 401 Unauthorized

PATCH /api/users/profile
  Headers: Authorization: Bearer {token}
  Input: { name?: string, bio?: string, preferences?: object }
  Output: { userId, name, bio, preferences, updatedAt }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

**Data Structures:**
```typescript
interface User {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  bio?: string;
  preferences: {
    theme?: 'light' | 'dark';
    defaultStudySessionLength?: number;
    emailNotifications?: boolean;
  };
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
    expiresAt?: timestamp;
    status: 'active' | 'cancelled' | 'expired';
  };
  createdAt: timestamp;
  updatedAt: timestamp;
  deletedAt?: timestamp;
}

interface AuthToken {
  token: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}
```

**Considerations:**
- Use JWT tokens with 1-hour expiration for access, 7-day for refresh
- Store refresh tokens in httpOnly, secure, sameSite cookies
- Implement CSRF protection for state-changing operations
- Log authentication events for security auditing
- Support OAuth 2.0 integration (Google, GitHub) for future expansion

---

## Content Processing Pipeline

### 2. Markdown Upload & Chunking

**Purpose:** Accept markdown content from users, validate it, and prepare it for processing through the AI pipeline.

**Features:**
- Upload markdown content (text or file)
- Validate markdown syntax and structure
- Auto-detect and split content by H1/H2 headers into chunks
- Track content hash to prevent duplicate processing
- Support multiple upload formats (plain text, .md files, copy-paste)

**API Endpoints:**

```
POST /api/process/upload
  Headers: 
    Authorization: Bearer {token}
    Content-Type: multipart/form-data | application/json
  Input (multipart):
    - file: File (markdown)
    - bookName: string
    - chapterName: string
    - forceRefresh?: boolean
  Input (JSON):
    - markdown: string
    - bookName: string
    - chapterName: string
    - forceRefresh?: boolean
  Output: { 
    uploadId: string,
    totalChunks: number,
    chunks: Array<{id, hash, preview, size}>,
    estimatedProcessingTime: number
  }
  Status: 202 Accepted | 400 Bad Request | 413 Payload Too Large | 401 Unauthorized
  Size limits: 25MB per file, 10MB per chunk
  Chunking: H1 = section, H2 = subsection, max chunk size 5000 chars
  Dedup: Check content hash against user's previous uploads
  Validation: 
    - Valid markdown syntax (loose parsing)
    - Min 100 chars, max 25MB
    - At least one H1 or H2 header
  Rate limit: 50 uploads per day per user
```

**Data Structures:**
```typescript
interface ContentChunk {
  chunkId: string;
  uploadId: string;
  userId: string;
  contentHash: string;
  markdown: string;
  section: string;
  subsection?: string;
  size: number; // bytes
  processingStatus: 'pending' | 'processing' | 'complete' | 'failed';
  createdAt: timestamp;
  error?: string;
}

interface Upload {
  uploadId: string;
  userId: string;
  bookName: string;
  chapterName: string;
  totalChunks: number;
  processedChunks: number;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  createdAt: timestamp;
  completedAt?: timestamp;
}
```

**Considerations:**
- Implement async processing with background job queue (e.g., Bullmq, Celery)
- Use content hash (SHA-256) for deduplication
- Log all uploads for audit trail
- Support webhook callbacks for client-side progress updates
- Handle malformed markdown gracefully with partial processing

---

### 3. Pipeline Processing (Draft → Judge → Revise)

**Purpose:** Orchestrate the AI-driven pipeline that generates, evaluates, and refines Q&A pairs for each chunk.

**Features:**
- Draft stage: Generate outline + initial Q&A pairs via LLM
- Judge stage: Score each Q&A pair on accuracy, clarity, recall-worthiness
- Revise stage: Regenerate failing pairs (max 3 cycles)
- Real-time progress updates via Server-Sent Events (SSE) or WebSocket
- Pipeline state persistence for recovery from failures
- Caching of LLM responses to avoid redundant API calls

**API Endpoints:**

```
POST /api/process/start-pipeline
  Headers: Authorization: Bearer {token}
  Input: { uploadId: string }
  Output: { pipelineId: string, message: "Pipeline started" }
  Status: 202 Accepted | 400 Bad Request | 401 Unauthorized

GET /api/process/pipeline/{pipelineId}/stream
  Headers: Authorization: Bearer {token}
  Streaming: Server-Sent Events (text/event-stream)
  Output (events):
    - event: "chunk_started"
      data: { chunkId, number, total }
    - event: "stage_update"
      data: { stage: 'draft'|'judge'|'revise'|'save', status: 'active'|'done', detail, progress }
    - event: "pair_generated"
      data: { question, answer, sourceContext }
    - event: "pair_scored"
      data: { pairId, question, score, feedback, revised }
    - event: "pipeline_complete"
      data: { pipelineId, totalQAPairs, totalTime }
    - event: "error"
      data: { error, chunkId }
  Status: 200 OK | 401 Unauthorized | 404 Not Found
  Timeout: 30 seconds idle timeout, auto-reconnect via client retry

GET /api/process/pipeline/{pipelineId}/status
  Headers: Authorization: Bearer {token}
  Output: { 
    pipelineId, 
    status: 'queued'|'processing'|'complete'|'failed',
    progress: { currentChunk, totalChunks, percentage },
    stages: Array<{id, status, detail}>,
    artifacts: Array<{id, qaPairCount}>,
    errorLog: Array<{chunkId, error, timestamp}>
  }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

POST /api/process/pipeline/{pipelineId}/cancel
  Headers: Authorization: Bearer {token}
  Output: { message: "Pipeline cancelled" }
  Status: 200 OK | 401 Unauthorized | 404 Not Found
```

**Data Structures:**
```typescript
interface PipelineStage {
  id: 'check' | 'draft' | 'judge' | 'revise' | 'save';
  label: string;
  description: string;
  status: 'idle' | 'active' | 'done' | 'failed';
  detail?: string;
  duration?: number; // ms
  errorMessage?: string;
}

interface Pipeline {
  pipelineId: string;
  uploadId: string;
  userId: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  currentChunk: number;
  totalChunks: number;
  stages: PipelineStage[];
  artifacts: string[]; // artifact IDs
  totalQAPairs: number;
  startedAt: timestamp;
  completedAt?: timestamp;
  errorLog: Array<{chunkId, error, timestamp}>;
}

interface QAPair {
  pairId: string;
  artifactId: string;
  question: string;
  answer: string;
  sourceContext: string;
  revisionCycle: number; // 0 for original, 1+ for revisions
  draftScore?: number; // pre-judge score
  judgeScore: number; // final score (0-1)
  judgeFeedback: string;
  status: 'generated' | 'judged' | 'approved' | 'rejected' | 'revised';
  createdAt: timestamp;
}
```

**LLM Integration Details:**

```
DRAFT STAGE:
  Model: GPT-4, Claude, or equivalent
  Prompt template:
    "Given this textbook section: {chunk_text}
     Generate an outline of key concepts.
     Then generate 3-5 high-quality Q&A pairs for active recall study.
     Format: JSON with outline array and qaPairs array."
  Timeout: 30 seconds
  Retry: 3 attempts with exponential backoff
  Caching: Cache by content hash for 30 days

JUDGE STAGE:
  Model: Same or specialized smaller model
  Scoring criteria:
    - Accuracy (does answer match source?): 0-1
    - Clarity (is question unambiguous?): 0-1
    - Recall-worthiness (does it test real understanding?): 0-1
    - Combined score: average of three, threshold ≥ 0.7
  Prompt template:
    "Score this Q&A pair on accuracy, clarity, and recall-worthiness.
     Source: {sourceContext}
     Question: {question}
     Answer: {answer}
     Return JSON: {accuracy, clarity, recall_worthiness, feedback}"
  Timeout: 10 seconds
  Retry: 2 attempts

REVISE STAGE:
  Max revisions: 3 cycles per failing pair
  Trigger: Judge score < 0.7
  Prompt template:
    "The following Q&A pair scored {judgeScore}/1.0 with feedback: {judgeFeedback}
     Please revise to improve it. Source text: {sourceContext}"
  Optimization: Only revise if predicted improvement > 0.15
```

**Considerations:**
- Implement SSE for real-time progress without polling overhead
- Use exponential backoff for LLM API failures
- Cache LLM responses to reduce API calls and costs
- Store pipeline state in database for resume capability
- Implement circuit breaker for LLM service failures
- Log all LLM prompts/responses for monitoring and debugging
- Set reasonable timeout limits to prevent hanging processes

---

## Artifact Management

### 4. Artifact Storage & Retrieval

**Purpose:** Persist generated Q&A artifacts to the database with deduplication, allow users to browse, search, and manage their artifacts.

**Features:**
- Create artifacts from completed pipeline runs
- Store full outline hierarchy and Q&A pairs
- Deduplication: Merge identical or near-identical Q&A pairs from same source
- Search and filter artifacts by book, chapter, keyword
- Update artifact metadata (tags, notes, visibility)
- Soft delete artifacts with recovery option
- Archive old artifacts

**API Endpoints:**

```
POST /api/artifacts
  Headers: Authorization: Bearer {token}
  Input: { 
    pipelineId: string,
    bookName: string,
    chapterName: string,
    sectionName: string,
    outline: OutlineItem[],
    qaPairs: QAPair[],
    tags?: string[],
    isPublic?: boolean
  }
  Output: { 
    artifactId: string,
    qaPairsStored: number,
    deduplicatedCount: number,
    createdAt: timestamp
  }
  Status: 201 Created | 400 Bad Request | 401 Unauthorized
  Dedup logic: 
    - Exact match on (question, answer) → skip
    - Semantic similarity > 0.85 → merge with existing
    - Store both versions if from different sources
  Validation: Min 1 Q&A pair, valid outline structure

GET /api/artifacts
  Headers: Authorization: Bearer {token}
  Query params: 
    - page?: number (default 1)
    - limit?: number (default 20, max 100)
    - search?: string (full-text search on title, book, chapter)
    - book?: string (exact match)
    - chapter?: string (exact match)
    - tags?: string[] (comma-separated)
    - sortBy?: 'created' | 'updated' | 'qaPairCount' (default 'created')
    - order?: 'asc' | 'desc'
  Output: { 
    artifacts: Array<Artifact>,
    total: number,
    page: number,
    pages: number
  }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized
  Performance: Index on (userId, createdAt), use pagination not offset

GET /api/artifacts/{artifactId}
  Headers: Authorization: Bearer {token}
  Output: { 
    artifactId, bookName, chapterName, sectionName,
    outline, qaPairs, tags, stats: {
      totalQAPairs, avgScore, createdAt, updatedAt
    }
  }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

PATCH /api/artifacts/{artifactId}
  Headers: Authorization: Bearer {token}
  Input: { 
    tags?: string[],
    sectionName?: string,
    notes?: string,
    isPublic?: boolean
  }
  Output: { artifactId, updatedAt }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized | 404 Not Found

DELETE /api/artifacts/{artifactId}
  Headers: Authorization: Bearer {token}
  Soft delete: Mark deletedAt timestamp, hide from queries
  Hard delete available after 30 days
  Output: { message: "Artifact deleted" }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

GET /api/artifacts/{artifactId}/restore
  Headers: Authorization: Bearer {token}
  Restore: Only within 30 days of deletion
  Output: { message: "Artifact restored" }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

POST /api/artifacts/{artifactId}/export
  Headers: Authorization: Bearer {token}
  Query params: format?: 'json' | 'csv' | 'pdf' | 'anki'
  Output: 
    - json: raw JSON download
    - csv: Q&A pairs as rows (question, answer, source, score)
    - pdf: formatted report with outline and pairs
    - anki: .apkg file for Anki import
  Status: 200 OK | 400 Bad Request | 401 Unauthorized | 404 Not Found
  Rate limit: 10 exports per day per user
```

**Data Structures:**
```typescript
interface Artifact {
  artifactId: string;
  userId: string;
  uploadId?: string;
  pipelineId?: string;
  bookName: string;
  chapterName: string;
  sectionName: string;
  outline: OutlineItem[];
  qaPairs: QAPair[];
  tags: string[];
  notes?: string;
  isPublic: boolean;
  stats: {
    totalQAPairs: number;
    avgScore: number;
    scoreDistribution: {bins: Array<{range: string, count: number}>};
  };
  deduplication: {
    mergedFrom: string[]; // IDs of merged artifacts
    duplicateCount: number;
  };
  createdAt: timestamp;
  updatedAt: timestamp;
  deletedAt?: timestamp;
}

interface OutlineItem {
  id: string;
  title: string;
  level: number; // 1 for H1, 2 for H2, etc.
  items: OutlineItem[]; // nested children
}

interface QAPair {
  pairId: string;
  artifactId: string;
  question: string;
  answer: string;
  sourceContext: string;
  judgeScore: number; // 0-1
  judgeFeedback: string;
  isHighQuality: boolean; // score >= 0.85
  studyCount?: number;
  lastStudiedAt?: timestamp;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**Considerations:**
- Use semantic similarity (embedding cosine distance) for deduplication
- Implement full-text search with trigram indexing for fast queries
- Cache frequently accessed artifacts (Redis, 24h TTL)
- Support bulk export for large artifact sets
- Archive strategy: Move to cold storage after 6 months inactivity
- Provide API for third-party integration (Anki, Obsidian, etc.)

---

## Study Sessions & Analytics

### 5. Study Session Management

**Purpose:** Track user study sessions, record Q&A ratings, calculate mastery metrics, and enable spaced repetition scheduling.

**Features:**
- Create and manage study sessions
- Record user ratings (Know / Unsure / Unknown) for each Q&A
- Calculate session performance metrics
- Implement spaced repetition algorithm for optimal review scheduling
- Track long-term mastery progress per artifact
- Support timed study mode (Pomodoro, custom intervals)

**API Endpoints:**

```
POST /api/study/sessions
  Headers: Authorization: Bearer {token}
  Input: {
    artifactIds: string[],
    mode?: 'all' | 'weak' | 'random',
    timeLimit?: number, // seconds, optional
    autoAdvance?: boolean // auto-advance if true
  }
  Output: {
    sessionId: string,
    totalCards: number,
    timeLimit?: number,
    startedAt: timestamp
  }
  Status: 201 Created | 400 Bad Request | 401 Unauthorized
  Card selection logic:
    - 'all': all Q&A pairs from artifacts
    - 'weak': pairs with score < 0.7 OR lastReviewScore < 3
    - 'random': randomized subset, optional smart scheduling

POST /api/study/sessions/{sessionId}/rate
  Headers: Authorization: Bearer {token}
  Input: {
    pairId: string,
    rating: 'know' | 'unsure' | 'unknown', // 3 | 2 | 1
    timeSpentMs: number,
    confidence: number // 0-1 optional
  }
  Output: {
    pairId,
    nextReviewDate: timestamp, // calculated from spaced repetition
    nextReviewInterval: number // days
  }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized | 404 Not Found
  Rate limit: 1 request per 2 seconds per session (prevent gaming)

GET /api/study/sessions/{sessionId}/current
  Headers: Authorization: Bearer {token}
  Output: {
    sessionId,
    currentIndex: number,
    totalCards: number,
    currentCard: {pairId, question, answer, sourceContext},
    progress: {answered, remaining, timeElapsed}
  }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

POST /api/study/sessions/{sessionId}/complete
  Headers: Authorization: Bearer {token}
  Input: { endedAt?: timestamp }
  Output: {
    sessionId,
    duration: number,
    results: {
      know: number,
      unsure: number,
      unknown: number,
      accuracy: number, // percentage
      avgTimePerCard: number
    },
    mastery: Array<{pairId, masterLevel: 0-5, lastScore, nextReview}>,
    suggestions: string[] // improvement tips
  }
  Status: 200 OK | 400 Bad Request | 401 Unauthorized | 404 Not Found
  Calculation:
    - Accuracy = know / total * 100
    - Mastery levels based on cumulative correct responses (0-5 scale)
    - Suggestions based on weak areas (low accuracy topics)

GET /api/study/sessions
  Headers: Authorization: Bearer {token}
  Query params:
    - limit?: number (default 20)
    - artifactId?: string (filter by artifact)
  Output: {
    sessions: Array<{
      sessionId, startedAt, endedAt, duration,
      results: {know, unsure, unknown, accuracy},
      cardsStudied: number
    }>,
    total: number
  }
  Status: 200 OK | 401 Unauthorized

GET /api/study/review-schedule
  Headers: Authorization: Bearer {token}
  Query params: artifactId?: string
  Output: {
    dueToday: number,
    dueThisWeek: number,
    upcomingReviews: Array<{
      pairId, artifactId, question, dueAt, interval, masterLevel
    }>
  }
  Status: 200 OK | 401 Unauthorized
```

**Spaced Repetition Algorithm:**

```
SM-2 Algorithm (with customization):

After each study session:
  1. Calculate interval based on rating:
     - 'unknown' (1): interval = 1 day, factor = 1.3 (subtract from factor)
     - 'unsure' (2): interval = 3 days, factor = 1.0 (neutral)
     - 'know' (3): interval = max(previous_interval * factor, previous_interval + 1)
       where factor increases with consistency (starts at 2.5)

  2. Track mastery level (0-5):
     - 0: never studied
     - 1: studied once, struggling
     - 2: studied 2-3x, still weak
     - 3: studied multiple times, decent
     - 4: studied many times, strong
     - 5: mastered, rare review

  3. Next review date = today + interval

Example progression:
  First study: rating='unknown' → 1 day, level 1
  After 1 day: rating='unsure' → 3 days, level 2
  After 3 days: rating='know' → 7 days (factor 2.5), level 3
  After 7 days: rating='know' → 18 days (factor 2.6), level 4
  After 18 days: rating='know' → 47 days (factor 2.7), level 5
```

**Data Structures:**
```typescript
interface StudySession {
  sessionId: string;
  userId: string;
  artifactIds: string[];
  cards: Array<{pairId: string, artifactId: string}>;
  mode: 'all' | 'weak' | 'random';
  status: 'active' | 'completed' | 'abandoned';
  timeLimit?: number;
  startedAt: timestamp;
  endedAt?: timestamp;
}

interface StudyResult {
  resultId: string;
  sessionId: string;
  userId: string;
  pairId: string;
  rating: 'know' | 'unsure' | 'unknown';
  confidence?: number; // 0-1
  timeSpentMs: number;
  answeredAt: timestamp;
}

interface MasteryRecord {
  masteryId: string;
  userId: string;
  pairId: string;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
  easinessFactor: number; // 2.5 to 5.0 in SM-2
  currentInterval: number; // days
  nextReviewDate: timestamp;
  reviewCount: number;
  lastReviewedAt?: timestamp;
  lastReviewScore: 'know' | 'unsure' | 'unknown';
  correctConsecutive: number;
  updatedAt: timestamp;
}

interface SessionStats {
  sessionId: string;
  duration: number; // seconds
  cardsStudied: number;
  know: number;
  unsure: number;
  unknown: number;
  accuracy: number; // percentage
  avgTimePerCard: number; // seconds
  topicPerformance: Array<{topic: string, accuracy: number}>;
  timeOfDay: string; // time study happened
  environment?: string; // where they studied (optional)
}
```

**Considerations:**
- Implement SM-2 or similar spaced repetition algorithm for effectiveness
- Track confidence scores for adaptive difficulty
- Provide analytics dashboard (progress, weak areas, trends)
- Support dark mode study mode for eye comfort
- Implement offline-first capability with sync on reconnect
- Log all study data for learning analytics

---

### 6. User Analytics & Progress

**Purpose:** Provide users with insights into their learning progress, identify weak areas, and suggest study strategies.

**Features:**
- Aggregate learning metrics across all artifacts
- Calculate mastery distribution and progress trends
- Identify frequently missed topics
- Generate personalized study recommendations
- Track study streaks and motivation metrics

**API Endpoints:**

```
GET /api/analytics/dashboard
  Headers: Authorization: Bearer {token}
  Query params: period?: '7d' | '30d' | '90d' | 'all'
  Output: {
    stats: {
      totalSessionsStudied: number,
      totalCardsStudied: number,
      totalTimeSpent: number, // minutes
      currentStreak: number, // days
      longestStreak: number,
      masteredCards: number,
      weakCards: number
    },
    masteryByArtifact: Array<{
      artifactId, bookName, chapterName,
      cardsStudied, masteryLevel, accuracy, trend
    }>,
    weeklyActivity: Array<{date, sessionsCount, cardsStudied}>,
    performanceByTopic: Array<{topic, accuracy, trend}>,
    recommendations: string[]
  }
  Status: 200 OK | 401 Unauthorized
  Cache: 1 hour per user

GET /api/analytics/artifact/{artifactId}/progress
  Headers: Authorization: Bearer {token}
  Output: {
    artifactId, bookName, chapterName,
    stats: {
      totalQAPairs, studiedCount, masteredCount,
      avgScore, lowestScore, highestScore
    },
    questionProgress: Array<{
      pairId, question, masteryLevel, lastStudied, nextReview, score
    }>,
    timeline: Array<{date, studyCount, accuracy}>,
    weakAreas: Array<{topic, accuracy}>,
    nextSessionSuggestion: {date, cardCount, reason}
  }
  Status: 200 OK | 401 Unauthorized | 404 Not Found

GET /api/analytics/export
  Headers: Authorization: Bearer {token}
  Query params: format?: 'json' | 'csv'
  Output: Complete study history export
  Status: 200 OK | 401 Unauthorized
```

**Data Structures:**
```typescript
interface AnalyticsDashboard {
  userId: string;
  period: string;
  generatedAt: timestamp;
  stats: {
    totalSessionsStudied: number;
    totalCardsStudied: number;
    totalTimeSpent: number;
    currentStreak: number;
    longestStreak: number;
    masteredCards: number;
    weakCards: number;
  };
  trends: {
    weeklyActivity: Array<{date: string, value: number}>;
    accuracyTrend: Array<{date: string, accuracy: number}>;
  };
}

interface WeakArea {
  topic: string;
  accuracy: number;
  pairsCount: number;
  artifacts: string[];
}
```

**Considerations:**
- Cache analytics for better performance (1-hour TTL)
- Calculate trends using moving averages for smoothing
- Implement background job to calculate daily analytics
- Provide actionable recommendations based on learning science
- Support export to third-party analytics tools

---

## Database Schema

### 7. Core Database Tables

**Purpose:** Define the relational structure for storing all user data, artifacts, sessions, and analytics.

```sql
-- Users Table
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  subscription_tier ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_email,
  INDEX idx_created_at
);

-- Uploads Table (tracks markdown submissions)
CREATE TABLE uploads (
  upload_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  book_name VARCHAR(255) NOT NULL,
  chapter_name VARCHAR(255) NOT NULL,
  total_chunks INT NOT NULL,
  processed_chunks INT DEFAULT 0,
  status ENUM('queued', 'processing', 'complete', 'failed') DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_status
);

-- Content Chunks Table (individual markdown sections)
CREATE TABLE content_chunks (
  chunk_id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES uploads(upload_id),
  user_id UUID NOT NULL REFERENCES users(user_id),
  content_hash VARCHAR(64) NOT NULL, -- SHA-256
  markdown TEXT NOT NULL,
  section VARCHAR(255),
  subsection VARCHAR(255),
  size INT,
  processing_status ENUM('pending', 'processing', 'complete', 'failed') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_content_hash,
  INDEX idx_processing_status,
  UNIQUE(upload_id, chunk_id)
);

-- Pipelines Table (AI processing runs)
CREATE TABLE pipelines (
  pipeline_id UUID PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES uploads(upload_id),
  user_id UUID NOT NULL REFERENCES users(user_id),
  status ENUM('queued', 'processing', 'complete', 'failed') DEFAULT 'queued',
  current_chunk INT DEFAULT 0,
  total_chunks INT NOT NULL,
  total_qa_pairs INT DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_log JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_status
);

-- Artifacts Table (final Q&A collections)
CREATE TABLE artifacts (
  artifact_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  upload_id UUID REFERENCES uploads(upload_id),
  pipeline_id UUID REFERENCES pipelines(pipeline_id),
  book_name VARCHAR(255) NOT NULL,
  chapter_name VARCHAR(255) NOT NULL,
  section_name VARCHAR(255),
  outline JSONB NOT NULL, -- Nested outline structure
  tags TEXT[],
  notes TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  stats JSONB DEFAULT '{"totalQAPairs": 0, "avgScore": 0}',
  deduplication_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_created_at,
  INDEX idx_book_name,
  INDEX idx_is_public
);

-- QA Pairs Table (individual questions and answers)
CREATE TABLE qa_pairs (
  pair_id UUID PRIMARY KEY,
  artifact_id UUID NOT NULL REFERENCES artifacts(artifact_id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_context TEXT,
  revision_cycle INT DEFAULT 0,
  draft_score FLOAT,
  judge_score FLOAT NOT NULL, -- 0-1
  judge_feedback TEXT,
  status ENUM('generated', 'judged', 'approved', 'rejected', 'revised') DEFAULT 'generated',
  is_high_quality BOOLEAN GENERATED ALWAYS AS (judge_score >= 0.85) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_artifact_id,
  INDEX idx_judge_score,
  INDEX idx_is_high_quality,
  CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id) ON DELETE CASCADE
);

-- Study Sessions Table
CREATE TABLE study_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  artifact_ids UUID[] NOT NULL,
  mode ENUM('all', 'weak', 'random') DEFAULT 'all',
  status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
  time_limit INT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_status
);

-- Study Results Table (individual card ratings)
CREATE TABLE study_results (
  result_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES study_sessions(session_id),
  user_id UUID NOT NULL REFERENCES users(user_id),
  pair_id UUID NOT NULL REFERENCES qa_pairs(pair_id),
  rating ENUM('know', 'unsure', 'unknown') NOT NULL,
  confidence FLOAT,
  time_spent_ms INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id,
  INDEX idx_pair_id,
  INDEX idx_user_id,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES study_sessions(session_id) ON DELETE CASCADE
);

-- Mastery Records Table (spaced repetition tracking)
CREATE TABLE mastery_records (
  mastery_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  pair_id UUID NOT NULL REFERENCES qa_pairs(pair_id),
  mastery_level INT CHECK (mastery_level >= 0 AND mastery_level <= 5) DEFAULT 0,
  easiness_factor FLOAT DEFAULT 2.5,
  current_interval INT DEFAULT 1, -- days
  next_review_date DATE NOT NULL,
  review_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMP,
  last_review_score ENUM('know', 'unsure', 'unknown'),
  correct_consecutive INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id,
  INDEX idx_next_review_date,
  UNIQUE(user_id, pair_id),
  CONSTRAINT fk_pair FOREIGN KEY (pair_id) REFERENCES qa_pairs(pair_id) ON DELETE CASCADE
);

-- Session Statistics Table (aggregated data)
CREATE TABLE session_statistics (
  stats_id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES study_sessions(session_id),
  duration_seconds INT,
  cards_studied INT,
  know_count INT,
  unsure_count INT,
  unknown_count INT,
  accuracy_percentage FLOAT,
  avg_time_per_card_ms FLOAT,
  topic_performance JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES study_sessions(session_id) ON DELETE CASCADE
);

-- Analytics Cache Table (for dashboard performance)
CREATE TABLE analytics_cache (
  cache_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  metric_type VARCHAR(50), -- 'daily_stats', 'weekly_trend', etc.
  period VARCHAR(10), -- '7d', '30d', '90d', 'all'
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 hour',
  UNIQUE(user_id, metric_type, period),
  INDEX idx_user_id
);
```

**Indexes & Performance:**
- All foreign keys should have indexes
- Composite index on (user_id, created_at) for most user queries
- Full-text search index on artifact titles/descriptions
- Partitioning: Study results by month for large tables
- Archive strategy: Move study results > 2 years old to cold storage

---

## Error Handling & Status Codes

### 8. API Error Responses

**Purpose:** Provide consistent, informative error responses for debugging and user feedback.

```typescript
// Standard error response format
interface ErrorResponse {
  error: {
    code: string; // e.g., 'INVALID_INPUT', 'UNAUTHORIZED', 'RATE_LIMITED'
    message: string;
    details?: string; // More context
    timestamp: timestamp;
    requestId: string; // For support tracking
  };
}

// HTTP Status Codes
200 OK - Successful request
201 Created - Resource created successfully
202 Accepted - Async request accepted (long-running)
204 No Content - Success with no response body

400 Bad Request
  code: 'INVALID_INPUT' | 'VALIDATION_ERROR' | 'MALFORMED_REQUEST'
  message: "Email is not valid" / "Markdown exceeds size limit"

401 Unauthorized
  code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'NO_TOKEN'
  message: "Invalid or expired token"

403 Forbidden
  code: 'INSUFFICIENT_PERMISSIONS' | 'RESOURCE_FORBIDDEN'
  message: "You do not have permission to access this resource"

404 Not Found
  code: 'RESOURCE_NOT_FOUND' | 'ENDPOINT_NOT_FOUND'
  message: "Artifact with ID {id} not found"

409 Conflict
  code: 'DUPLICATE_RESOURCE' | 'STATE_CONFLICT'
  message: "User with email already exists"

413 Payload Too Large
  code: 'FILE_TOO_LARGE'
  message: "Upload size exceeds 25MB limit"

429 Too Many Requests
  code: 'RATE_LIMIT_EXCEEDED'
  message: "Rate limit exceeded. Retry after 60 seconds"
  headers: Retry-After: 60

500 Internal Server Error
  code: 'INTERNAL_ERROR' | 'DATABASE_ERROR' | 'SERVICE_UNAVAILABLE'
  message: "An unexpected error occurred"
  requestId: "req_12345" (for support investigation)

503 Service Unavailable
  code: 'SERVICE_MAINTENANCE' | 'DEPENDENCY_FAILURE'
  message: "LLM service temporarily unavailable"
  Retry-After: 300 (seconds)
```

**Error Handling Guidelines:**
- Never expose internal implementation details (SQL, file paths)
- Log all errors with request ID for traceability
- Implement retry-friendly headers (Retry-After for 429, 503)
- Provide actionable error messages to users
- Use structured logging (JSON format with request context)

---

## Performance & Caching

### 9. Caching Strategy

**Purpose:** Reduce database load, LLM API costs, and improve response times.

```
Layer 1: Client-Side Caching
  - Service Worker for offline artifacts
  - Cache API for static assets
  - 24-hour TTL for artifact listings
  - Invalidate on create/update/delete

Layer 2: CDN (Cloudflare, AWS CloudFront)
  - Cache GET endpoints (10 min - 1 hour)
  - Don't cache POST/PATCH/DELETE
  - Purge on content updates
  - GZip compression enabled

Layer 3: Application Cache (Redis/Memcached)
  - User artifacts (24h TTL)
  - Analytics dashboard (1h TTL)
  - LLM responses (30d, keyed by content hash)
  - Session data (duration of session + 24h)
  Cache key patterns:
    - artifacts:{userId}:{page}
    - artifact:{artifactId}
    - lLM_response:{contentHash}
    - analytics:{userId}:{period}

Layer 4: Database Query Optimization
  - Connection pooling (min 10, max 100)
  - Prepared statements for all queries
  - Indexes on (user_id, created_at, status)
  - Read replicas for analytics queries
  - Denormalized artifact stats for fast retrieval
```

**Query Performance Targets:**
- GET /artifacts: < 200ms for 20 results
- GET /study/sessions: < 300ms for user's full history
- GET /analytics/dashboard: < 500ms (cache after first load)
- POST /artifacts: < 1s (includes dedup similarity check)
- Pipeline processing: < 1 second per chunk (depending on LLM)

---

## Security Considerations

### 10. Security Requirements

```
Authentication & Authorization
  - JWT with RS256 (asymmetric) for tokens
  - 1-hour access token expiry, 7-day refresh token
  - httpOnly, secure, sameSite=Strict cookies for refresh tokens
  - CSRF tokens for state-changing operations
  - Rate limiting: 5 login attempts per 15 min per email
  - Multi-factor authentication (MFA) support in v2

Data Protection
  - AES-256 encryption for sensitive fields at rest (optional)
  - TLS 1.3 for all transport
  - Parameterized queries to prevent SQL injection
  - CORS: Strict origin allowlist
  - No sensitive data in logs/error messages

Input Validation
  - Email: RFC 5322 compliant
  - Password: min 12 chars, complexity requirements
  - Markdown: Max 25MB, HTML sanitization
  - All user inputs validated and sanitized
  - Rate limit on resource uploads

Output Sanitization
  - XSS prevention: Escape all user-generated content
  - HTML sanitization for markdown rendering
  - No execution of user scripts
  - Content Security Policy (CSP) headers

Privacy & Compliance
  - GDPR: User data export, right to deletion, privacy policy
  - CCPA: Opt-out mechanisms, privacy notice
  - HIPAA-friendly (if handling medical text): Optional
  - Data retention: User data retained per subscription, deleted after 30-day grace period
  - Audit logging: All sensitive operations logged with timestamps and user context
  - Encryption keys: Stored separately from data (AWS KMS, HashiCorp Vault)

API Security
  - API rate limiting: 100 requests/minute per user, 1000/minute global
  - API versioning: /api/v1/, backward compatibility
  - Deprecation headers for old endpoints
  - API key rotation for service accounts
  - Webhook signature verification (HMAC-SHA256)
```

---

## Implementation Priorities

### MVP (Minimum Viable Product)

**Phase 1: Core Features (Weeks 1-2)**
1. User authentication (register, login, JWT)
2. Markdown upload & chunking API
3. Mock pipeline (simulate Draft → Judge → Revise with delays)
4. Artifact creation & storage
5. Basic listing of artifacts

**Phase 2: Study & Analytics (Weeks 3-4)**
6. Study session API with simple card flipping
7. Session results storage
8. Basic mastery tracking (no spaced rep yet)
9. Simple analytics dashboard

**Phase 3: Production Hardening (Week 5)**
10. LLM integration (actual OpenAI/Claude calls)
11. Error handling & logging
12. Database optimization
13. Caching layer
14. Testing & bug fixes

### Post-MVP Enhancements

- Spaced repetition algorithm
- Advanced analytics (trends, weak areas)
- Collaborative study groups
- Sharing artifacts
- Mobile app
- Browser extension for inline highlighting
- Anki/Quizlet import/export

---

## Summary Table

| Feature | Endpoint Count | Complexity | Dependencies |
|---------|----------------|-----------|--------------|
| Authentication | 6 | Medium | Bcrypt, JWT, Email service |
| Content Upload | 2 | Low | File storage (S3/GCS) |
| Pipeline Processing | 3 | High | LLM API, job queue, SSE |
| Artifact Management | 6 | Medium | Database, search index |
| Study Sessions | 5 | High | Analytics DB, caching |
| Analytics | 3 | High | Time-series DB, aggregation |
| **Total** | **25** | - | - |

This specification provides a complete roadmap for building a production-ready backend for the Active Recall Generator. Prioritize MVP features first, then expand based on user feedback and usage patterns.
