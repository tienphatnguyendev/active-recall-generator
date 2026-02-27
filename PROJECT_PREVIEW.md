# Active Recall Generator — Project Preview

**Status**: Full-stack application with Python backend and Next.js frontend
**Last Updated**: February 27, 2026

---

## 📋 Project Overview

**Active Recall Generator** is a full-stack learning platform that transforms Markdown textbook chapters into high-quality active recall Q&A artifacts using an AI-powered **Draft → Judge → Revise** pipeline.

The system combines:
- **Backend**: Python LangGraph state machine with Groq LLM integration for intelligent content processing
- **Frontend**: Next.js 15 web application with authentication, analytics, and study tools
- **Database**: SQLite for artifact storage, with session-based user authentication

---

## 🗺️ Application Routes

### Public Pages (Unauthenticated)

#### `/` — Landing / Home Page
- **Component**: `app/page.tsx`
- **Purpose**: Main application landing page
- **Features**: Pipeline visualization, sample Markdown processing, welcome message
- **Status**: Content generation simulation with mock data

#### `/login` — User Login
- **Component**: `app/login/page.tsx`
- **Purpose**: Authentication entry point
- **Features**:
  - Email and password input
  - Form validation and error handling
  - Link to "Forgot password" and registration
  - Post-login redirect to homepage
- **API**: `POST /api/auth/login`

#### `/register` — User Registration
- **Component**: `app/register/page.tsx`
- **Purpose**: New user account creation
- **Features**:
  - Email and password input with confirmation
  - User creation flow
  - Post-registration redirect to login
- **API**: `POST /api/auth/register`

#### `/forgot-password` — Password Recovery
- **Component**: `app/forgot-password/page.tsx`
- **Purpose**: Initiate password reset flow
- **Features**: Email input for password reset request

#### `/reset-password` — Reset Password
- **Component**: `app/reset-password/page.tsx`
- **Purpose**: Complete password reset with token
- **Features**: New password input with confirmation

---

### Protected Pages (Authenticated Users Only)

#### `/artifacts` — Artifact Browser
- **Component**: `app/artifacts/page.tsx`
- **Purpose**: Browse all generated Q&A artifacts with full details
- **Key Features**:
  - Sidebar list of all artifacts (with filtering by source, date)
  - Main panel showing artifact details:
    - Structured outline (H1/H2 hierarchy)
    - Q&A pairs with expandable answer cards
    - Judge scores for each question (color-coded: green ≥0.9, yellow ≥0.7, red <0.7)
    - Source context and judge feedback for each pair
  - Search within Q&A pairs (question/answer)
  - Pagination or infinite scroll for large datasets
- **API**: `GET /api/artifacts`, `GET /api/artifacts/[id]`
- **Mock Data**: 2 example artifacts (Biology, CS) with 3+ Q&A pairs each

#### `/study` — Study Mode
- **Component**: `app/study/page.tsx`
- **Purpose**: Active recall flashcard study session
- **Key Features**:
  - Pre-session view: Card count by source, session start button
  - Spaced repetition-style card flipping:
    - Question card with source attribution
    - Click to reveal answer
    - Three rating buttons: "Know it", "Unsure", "Didn't know"
  - Progress bar showing cards completed
  - Session results dashboard:
    - Summary counts (Know / Unsure / Unknown)
    - Per-card breakdown with rating
    - Button to restart or browse artifacts
- **API**: `GET /api/artifacts` (fetches all cards for session)
- **Mock Data**: 5 Q&A pairs from 2 sources, randomized rating outcomes

#### `/analytics` — Learning Analytics Dashboard
- **Component**: `app/analytics/page.tsx`
- **Purpose**: Visualize learning progress and identify weak areas
- **Key Components**:
  - **StatsOverview**: Key metrics (cards studied, avg mastery, sessions, etc.)
  - **StreakWidget**: Current/longest streak with recent day history
  - **WeeklyActivityChart**: Cards studied and session count by date (line/bar chart)
  - **MasteryDistributionChart**: Pie/donut chart showing mastery levels (Expert/Proficient/Learning/New)
  - **PerformanceByTopic**: Table/chart showing % know/unsure/unknown by source
  - **ArtifactProgressDetail**: Per-artifact cards showing:
    - Mastery level badge
    - Study timeline (when each Q&A was rated)
    - Weak areas (questions with repeated "unknown" ratings)
    - Next session suggestion (recommend weak areas to restudy)
  - **AnalyticsExportButton**: Export analytics data as JSON/CSV
- **API**: `GET /api/analytics`
- **Mock Data**: Dynamically generated from study session data

---

## 🔌 API Routes

### Authentication Endpoints

#### `POST /api/auth/login`
- **Payload**: `{ email: string, password: string }`
- **Response**: User object with auth token/session
- **Error Handling**: 401 for invalid credentials, 400 for validation errors

#### `POST /api/auth/register`
- **Payload**: `{ email: string, password: string, name?: string }`
- **Response**: User object with auth token/session
- **Error Handling**: 409 for duplicate email, 400 for validation errors

#### `GET /api/auth/user`
- **Purpose**: Fetch current authenticated user
- **Response**: User object or 401 if not authenticated

#### `POST /api/auth/logout`
- **Purpose**: Clear session/token
- **Response**: 200 success

### Artifact Endpoints

#### `GET /api/artifacts`
- **Purpose**: Fetch all artifacts for current user
- **Query Params**: 
  - `search`: Filter by source/section
  - `sort`: Sort by date, name, mastery
  - `page`: Pagination (optional)
- **Response**: Array of artifacts with outline and Q&A pairs
- **Data Model**:
  ```json
  {
    "id": "string",
    "source": "BookName:ChapterX",
    "book": "string",
    "chapter": "string",
    "section": "string",
    "createdAt": "ISO 8601",
    "outline": [{ "title": "string", "level": 1-3, "items": [...] }],
    "qaPairs": [
      {
        "question": "string",
        "answer": "string",
        "sourceContext": "string",
        "judgeScore": 0.0-1.0,
        "judgeFeedback": "string"
      }
    ]
  }
  ```

#### `GET /api/artifacts/[id]`
- **Purpose**: Fetch single artifact with details
- **Response**: Full artifact object

#### `DELETE /api/artifacts/[id]`
- **Purpose**: Delete an artifact
- **Response**: 204 no content

### Analytics Endpoint

#### `GET /api/analytics`
- **Purpose**: Fetch aggregated learning analytics
- **Query Params**:
  - `timeRange`: "week" | "month" | "all" (default: "month")
- **Response**:
  ```json
  {
    "stats": [
      { "label": "Cards studied", "value": 42, "trend": "up", "trendValue": "+5%" },
      ...
    ],
    "streak": {
      "currentStreak": 7,
      "longestStreak": 21,
      "studiedToday": true,
      "recentDays": [
        { "date": "2026-02-27", "studied": true },
        ...
      ]
    },
    "weeklyActivity": [
      { "date": "2026-02-21", "cardsStudied": 12, "sessionCount": 2 }
    ],
    "masteryDistribution": {
      "data": [
        { "level": "expert", "count": 5 },
        ...
      ],
      "totalCards": 42
    },
    "performanceByTopic": [
      {
        "topic": "Biology101:Chapter5",
        "source": "Biology 101 - Chapter 5",
        "totalCards": 3,
        "knownPct": 100,
        "unsurePct": 0,
        "unknownPct": 0
      }
    ],
    "artifacts": [
      {
        "artifactId": "biology-101-chapter5-water-cycle",
        "section": "The Water Cycle",
        "source": "Biology101:Chapter5",
        "mastery": "expert",
        "studyTimeline": [
          { "date": "2026-02-25", "rating": "know" }
        ],
        "weakAreas": [
          { "question": "What...", "timesUnknown": 2, "lastAttempted": "2026-02-26" }
        ],
        "nextSessionSuggestion": "Review precipitation forms"
      }
    ]
  }
  ```

### Study Session Endpoint

#### `POST /api/study`
- **Purpose**: Record study session results (optional: for future analytics)
- **Payload**: 
  ```json
  {
    "artifactId": "string",
    "results": [
      { "questionId": "string", "rating": "know" | "unsure" | "unknown" }
    ],
    "sessionDuration": 300
  }
  ```
- **Response**: Session record with ID and timestamp

---

## 🗂️ Project Structure

```
app/
├── layout.tsx                     # Root layout with AuthProvider
├── page.tsx                       # Home / Landing page
├── globals.css                    # Tailwind base styles + design tokens
├── login/page.tsx                 # Login form
├── register/page.tsx              # Registration form
├── forgot-password/page.tsx       # Password reset request
├── reset-password/page.tsx        # Password reset confirmation
├── artifacts/page.tsx             # Artifact browser
├── study/page.tsx                 # Study mode flashcards
├── analytics/page.tsx             # Analytics dashboard
└── api/
    ├── auth/
    │   ├── login/route.ts         # POST login
    │   ├── register/route.ts       # POST register
    │   └── user/route.ts           # GET current user
    ├── artifacts/
    │   ├── route.ts                # GET all, POST new artifacts
    │   └── [id]/route.ts           # GET, DELETE individual artifact
    ├── analytics/route.ts          # GET analytics aggregates
    └── study/route.ts              # POST study session results

components/
├── auth/
│   ├── auth-context.tsx           # useAuth() hook & AuthProvider
│   ├── logout-button.tsx          # Logout button component
│   └── user-profile-modal.tsx     # User profile modal
├── nav.tsx                        # Main navigation bar
├── pipeline-status.tsx            # Pipeline stage visualizer
├── pipeline/
│   ├── file-upload.tsx            # File upload input
│   ├── pipeline-cancel-button.tsx # Cancel button
│   └── (other pipeline components)
├── artifacts/
│   ├── empty-state.tsx            # Empty state when no artifacts
│   ├── export-button.tsx          # Export artifacts
│   ├── notes-editor.tsx           # Edit artifact notes
│   ├── delete-artifact-button.tsx # Delete artifact
│   ├── restore-artifacts.tsx      # Restore deleted artifacts
│   ├── sort-filter-controls.tsx   # Sort/filter UI
│   ├── tag-manager.tsx            # Tag management
│   └── pagination.tsx             # Pagination controls
├── study/
│   ├── artifact-selector.tsx      # Select artifacts to study
│   ├── mastery-badge.tsx          # Mastery level badge
│   ├── session-history.tsx        # Past session records
│   ├── session-timer.tsx          # Study session timer
│   ├── spaced-repetition-schedule.tsx  # Spaced repetition scheduler
│   └── study-mode-picker.tsx      # Mode selection (card flip vs other)
├── analytics/
│   ├── stats-overview.tsx         # Key metrics cards
│   ├── streak-widget.tsx          # Streak display
│   ├── weekly-activity-chart.tsx  # Activity by week
│   ├── mastery-distribution-chart.tsx # Mastery pie chart
│   ├── performance-by-topic.tsx   # Performance table
│   ├── artifact-progress-detail.tsx # Artifact progress
│   └── analytics-export-button.tsx # Export data
└── ui/
    ├── error-boundary.tsx         # Error boundary wrapper
    ├── offline-indicator.tsx      # Offline mode indicator
    ├── rate-limit-banner.tsx      # Rate limit warning
    ├── skeletons.tsx              # Loading skeleton components
    └── toast.tsx                  # Toast notification component

lib/
├── api-client.ts                  # Fetch wrapper with error handling
├── analytics-test-scenarios.ts    # Mock analytics data generator
├── mock-analytics-data.ts         # Mock data for testing
└── utils.ts                       # Utility functions (cn, etc.)

hooks/
├── use-pipeline-sse.ts            # Server-sent events for pipeline

styles/ (or globals.css)
├── Design tokens: primary, secondary, accent, destructive, muted, etc.
├── Tailwind config with semantic color variables
└── Custom animations (fade-in, slide-up, etc.)

docs/
├── needed-backend.md              # Backend integration requirements
└── plans/                         # Design and architecture documents
```

---

## 🔐 Authentication Flow

1. **Unauthenticated User** → `/login` → Email + Password
2. **POST /api/auth/login** → Store session/token (HTTP-only cookie or localStorage)
3. **Authenticated User** → Access protected routes (`/artifacts`, `/study`, `/analytics`)
4. **Auth Check**: `GET /api/auth/user` verifies session on app mount
5. **Logout** → Clear session, redirect to `/login`

### Auth Context Hook
```typescript
const { user, login, logout, isAuthenticated } = useAuth();
```

---

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#2563eb)
- **Secondary**: Purple (#7c3aed)
- **Accent**: Amber/Yellow (#f59e0b)
- **Destructive**: Red (#ef4444)
- **Muted**: Gray (#6b7280)
- **Background**: White/Light (#ffffff)
- **Card**: Light gray (#f9fafb)

### Typography
- **Headings**: Inter (400, 500, 600, 700 weights)
- **Body**: Inter (400, 500)
- **Monospace**: JetBrains Mono (400, 500)

### Component Library
- shadcn/ui components for UI consistency
- Custom components for domain-specific features (artifact cards, study cards, analytics charts)

---

## 📊 Key Features by Page

### Home Page (`/`)
- Hero section with value proposition
- Sample Markdown input with load button
- Book/Chapter name inputs
- Force refresh checkbox
- Pipeline visualization (stages: Check → Draft → Judge → Revise → Save)
- Real-time progress (chunks processed, Q&A count)
- Stats panel on the right

### Artifacts Page (`/artifacts`)
- **Left Sidebar**: Filterable list of all artifacts
  - Sort by: date, name, mastery
  - Search by source/section
- **Main Panel**: Full artifact detail
  - Metadata: source, book, chapter, date
  - Outline tree (recursive with indentation)
  - Q&A pairs with expandable cards
  - Judge scores (color-coded)
  - Source context highlighted
- **Actions**: Export, delete, restore, tag

### Study Page (`/study`)
- **Pre-session**: Artifact selection and session overview
- **During session**: Flashcard flip with question → reveal answer
- **Rating**: Know it / Unsure / Didn't know buttons (only shown after flip)
- **Progress**: Progress bar at top
- **Results**: Session summary with per-card breakdown

### Analytics Page (`/analytics`)
- **Stats Row**: Key metrics with trend indicators
- **Streak Row**: Current streak, calendar heatmap of study days
- **Activity Chart**: Weekly cards studied and session count
- **Mastery Distribution**: Pie chart of expert/proficient/learning/new
- **Performance by Topic**: Table showing % know/unsure/unknown by source
- **Artifact Progress**: Detailed per-artifact progress with weak areas
- **Export**: Download analytics as JSON/CSV

---

## 🔄 Data Flow

### Artifact Processing (Backend Python → Frontend)
1. User uploads Markdown or pastes content
2. Frontend sends to backend (or simulates pipeline)
3. Backend: Chunk → Draft → Judge → Revise → Save to SQLite
4. Each artifact stored with `source_hash` to skip re-processing
5. Frontend fetches artifacts from `/api/artifacts`

### Study Session
1. User selects study mode and starts session
2. Frontend fetches all Q&A pairs via `/api/artifacts`
3. User rates each card (know/unsure/unknown)
4. On completion, POST to `/api/study` to record results
5. Results aggregated in analytics dashboard

### Analytics Generation
1. Fetch all study sessions via `/api/analytics`
2. Aggregate: streak, weekly activity, mastery distribution
3. Calculate: weak areas, performance by topic
4. Generate: next session suggestions

---

## 📝 Mock Data

The application includes comprehensive mock data for development/demo:
- **2 Sample Artifacts**: Biology (Water Cycle), CS (Algorithm Complexity)
- **3+ Q&A Pairs per Artifact** with judge scores
- **Mock Study Sessions** with varying outcomes
- **Mock Analytics** with 4-week history and streak data

To use real data, integrate with backend API endpoints.

---

## 🚀 Development Notes

### Key Dependencies
- **Frontend**: Next.js 15, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Python 3.10+, LangGraph, Groq, sqlite-utils, Pydantic
- **Authentication**: Session-based (custom implementation)

### Environment Variables Required
```
NEXT_PUBLIC_API_URL=http://localhost:8000 (or production backend)
GROQ_API_KEY=xxxx (for backend processing)
```

### Running the App
```bash
# Frontend
npm run dev  # http://localhost:3000

# Backend (if separate)
python main.py "BookName:ChapterX" path/to/chapter.md
```

### Testing
- Mock data is embedded in components for quick testing
- Replace with real API calls by integrating backend endpoints
- Study session simulation in `/study` page for demo purposes

---

## ✅ Completion Checklist

- [x] Authentication system (login, register, logout)
- [x] Artifact browser with full Q&A details
- [x] Study mode with flashcard flipping
- [x] Analytics dashboard with charts
- [x] Design system and UI components
- [ ] Backend API integration (currently mocked)
- [ ] Database persistence (SQLite integration)
- [ ] File upload for Markdown processing
- [ ] Spaced repetition scheduler
- [ ] Notifications and toast system

---

## 🔗 Related Documentation

- **SPEC.md** — Technical specification and architecture
- **README.md** — Project overview and setup instructions
- **ARCHITECTURE.md** — Detailed system architecture
- **docs/needed-backend.md** — Backend integration requirements
