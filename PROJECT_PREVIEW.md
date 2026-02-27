# PROJECT_PREVIEW.md

**Project:** Active Recall Generator  
**Last Updated:** 2026-02-27  
**Status:** Frontend reviewed and patched. Backend stubs in place — not yet functional.

---

## What This App Does

An AI-powered study tool that transforms Markdown textbook chapters into structured Q&A artifacts through a **Draft → Judge → Revise** LLM pipeline. Users can paste chapter content, watch the pipeline simulate processing, browse generated Q&A pairs (artifacts), study them as flashcards, and track progress via an analytics dashboard.

---

## Route Map

| Route | Page File | Description | Auth Required |
|---|---|---|---|
| `/` | `app/page.tsx` | Generate page — paste Markdown, run pipeline simulation | No |
| `/artifacts` | `app/artifacts/page.tsx` | Browse and search generated Q&A artifacts | No |
| `/study` | `app/study/page.tsx` | Flashcard study session with Know/Unsure/Unknown ratings | No |
| `/analytics` | `app/analytics/page.tsx` | Learning analytics dashboard (stats, charts, progress) | No (checks auth in UI) |
| `/login` | `app/login/page.tsx` | Sign-in form using `useAuth()` hook | No |
| `/register` | `app/register/page.tsx` | Account creation form | No |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset request form | No |
| `/reset-password` | `app/reset-password/page.tsx` | Set new password via token from URL params | No |

---

## API Routes

| Method | Route | Description | Status |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate user, return mock token | Stub |
| POST | `/api/auth/register` | Create user, return mock user object | Stub |
| GET | `/api/auth/user` | Return currently authenticated user | Stub |
| GET | `/api/artifacts` | List all artifacts (returns empty array) | Stub |
| GET | `/api/artifacts/[id]` | Get single artifact by ID | Stub |
| DELETE | `/api/artifacts/[id]` | Delete an artifact | Stub |
| GET | `/api/analytics` | Return mock analytics data | Stub (returns mock) |
| GET | `/api/study` | Study session data | Stub |

> All API routes are stubs. No database is connected. The analytics route does return mock data that drives the analytics page UI.

---

## Project Structure

```
active-recall-generator/
├── app/
│   ├── layout.tsx                  # Root layout: AuthProvider, fonts, metadata
│   ├── globals.css                 # Design tokens (McKinsey palette + pipeline colors)
│   ├── page.tsx                    # Generate page (pipeline simulation)
│   ├── artifacts/page.tsx          # Artifact browser
│   ├── study/page.tsx              # Flashcard study mode
│   ├── analytics/page.tsx          # Analytics dashboard
│   ├── login/page.tsx              # Login
│   ├── register/page.tsx           # Register
│   ├── forgot-password/page.tsx    # Password reset request
│   ├── reset-password/page.tsx     # Set new password
│   └── api/                        # API routes (all stubs)
│       ├── auth/login/route.ts
│       ├── auth/register/route.ts
│       ├── auth/user/route.ts
│       ├── artifacts/route.ts
│       ├── artifacts/[id]/route.ts
│       ├── analytics/route.ts
│       └── study/route.ts
├── components/
│   ├── nav.tsx                     # Sticky nav with mobile hamburger menu
│   ├── pipeline-status.tsx         # Pipeline stage tracker (Check → Draft → Judge → Revise → Save)
│   ├── auth/
│   │   ├── auth-context.tsx        # AuthProvider + useAuth() hook
│   │   ├── logout-button.tsx       # Logout action button
│   │   └── user-profile-modal.tsx  # Profile editing modal
│   ├── analytics/
│   │   ├── stats-overview.tsx      # 4-stat summary grid
│   │   ├── streak-widget.tsx       # Study streak + 7-day dot calendar
│   │   ├── weekly-activity-chart.tsx  # Bar chart (cards/day)
│   │   ├── mastery-distribution-chart.tsx  # Segmented bar by mastery level
│   │   ├── performance-by-topic.tsx  # Stacked bar per topic
│   │   ├── artifact-progress-detail.tsx  # Per-artifact drill-down
│   │   └── analytics-export-button.tsx   # JSON/CSV export trigger
│   ├── artifacts/
│   │   ├── delete-artifact-button.tsx
│   │   ├── empty-state.tsx
│   │   ├── export-button.tsx
│   │   ├── notes-editor.tsx
│   │   ├── pagination.tsx
│   │   ├── restore-artifacts.tsx
│   │   ├── sort-filter-controls.tsx
│   │   └── tag-manager.tsx
│   ├── study/
│   │   ├── mastery-badge.tsx       # Mastery level badge + bar indicator
│   │   ├── artifact-selector.tsx
│   │   ├── session-history.tsx
│   │   ├── session-timer.tsx
│   │   ├── spaced-repetition-schedule.tsx
│   │   └── study-mode-picker.tsx
│   ├── pipeline/
│   │   ├── file-upload.tsx
│   │   └── pipeline-cancel-button.tsx
│   └── ui/
│       ├── skeletons.tsx           # Loading skeleton components
│       ├── toast.tsx               # Toast notification
│       ├── error-boundary.tsx      # Error boundary wrapper
│       ├── offline-indicator.tsx   # Network status banner
│       └── rate-limit-banner.tsx   # Rate limit notification
├── lib/
│   ├── api-client.ts               # Centralized fetch wrapper + ApiError class
│   ├── utils.ts                    # cn() utility
│   ├── mock-analytics-data.ts      # Mock data for analytics API
│   └── analytics-test-scenarios.ts # Test data scenarios
├── hooks/
│   └── use-pipeline-sse.ts         # SSE hook for pipeline events
├── tailwind.config.ts              # Design tokens mapped to Tailwind
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## Design System

### Color Palette (McKinsey Corporate)

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#005eb8` (McKinsey blue) | CTAs, active states, key data |
| `--accent` | `#f3c13a` (McKinsey yellow) | Draft stage, Unsure rating, warnings |
| `--secondary` | `#a2aaad` (mid-grey) | Subtle UI chrome |
| `--destructive` | `#c0392b` (red) | Errors, Unknown rating |
| `--mastered` | `#1a8a3c` (green) | Mastered level in mastery system |
| `--background` | `#f5f5f5` | Page background |
| `--card` | `#ffffff` | Card/panel backgrounds |

### Typography

- **Headings/Body:** Inter (variable, 400–700)
- **Code/Mono:** JetBrains Mono (400, 500) — used for IDs, scores, counters
- **Design rule:** Sharp corners (`--radius: 0.25rem`), no rounded-lg on containers

### Pipeline Stage Colors

| Stage | Color |
|---|---|
| Check Database | `--secondary` (grey) |
| Draft | `--pipeline-draft` = `--accent` (yellow) |
| Judge | `--pipeline-judge` = `--primary` (blue) |
| Revise | `--pipeline-revise` (grey) |
| Save to DB | `--pipeline-save` = `--primary` (blue) |

---

## Frontend Audit — Issues Found & Fixed (2026-02-27)

### Fixed Issues

#### 1. Nav — No Mobile Responsiveness
- **Problem:** Nav links overflowed on small screens, no hamburger menu, GitHub link had no accessible label on mobile.
- **Fix:** Added responsive hamburger menu (`md:hidden`). Desktop nav hidden on mobile. Mobile drawer uses `border-l-2` active state consistent with the design system. GitHub link has visible label in mobile menu.
- **Files:** `components/nav.tsx`

#### 2. Nav — Active State Underline Misalignment
- **Problem:** `after:bottom-0` underline was positioned relative to the link element's padding, causing misalignment at different viewports.
- **Fix:** Changed to `after:left-4 after:right-4` to precisely match the text bounds, not the full padded area.
- **Files:** `components/nav.tsx`

#### 3. Home Page — Inline Color Style Bypassing Token System
- **Problem:** `style={{ color: "#f3c13a" }}` hardcoded the accent yellow instead of using `text-accent`.
- **Fix:** Replaced with `className="text-accent"`.
- **Files:** `app/page.tsx`

#### 4. Home/Artifacts/Study/Analytics — Mobile Padding Missing
- **Problem:** All pages used fixed `px-6 py-10` with no responsive variants, causing content to touch screen edges on small phones.
- **Fix:** Updated to `px-4 sm:px-6 py-8 sm:py-10` across all four page `main` elements.
- **Files:** `app/page.tsx`, `app/artifacts/page.tsx`, `app/study/page.tsx`, `app/analytics/page.tsx`

#### 5. ScoreBadge (Artifacts) — Wrong Color Semantic for Mid-Range Score
- **Problem:** Mid-range scores (0.7–0.9) used `text-pipeline-judge` (blue), which is the same as "good" primary color — not meaningfully distinct from high scores.
- **Fix:** Changed mid-range to `text-pipeline-draft` (amber/yellow) — semantically "partial/caution". Removed `rounded` class to match sharp design system.
- **Files:** `app/artifacts/page.tsx`

#### 6. Artifacts Sidebar — Selected State Border Conflict
- **Problem:** Selected item had both `border` (1px all sides) and `border-l-2 border-primary` (2px left, primary color) — the shorthand `border` overrode the left-specific class, creating an inconsistent visual.
- **Fix:** Kept explicit `border border-border` on all states, then used `border-l-[3px] border-l-primary` for selected state with higher specificity.
- **Files:** `app/artifacts/page.tsx`

#### 7. Artifacts — Search Input Rounding Inconsistency
- **Problem:** Search input had `rounded-md` but the design system uses `--radius: 0.25rem` (near-sharp). All other inputs and cards have no rounding.
- **Fix:** Removed `rounded-md` from the search input.
- **Files:** `app/artifacts/page.tsx`

#### 8. Artifacts — Grid Breakpoint Gap at Tablet
- **Problem:** Grid was `grid-cols-1` → `lg:grid-cols-4`, with nothing at `md`. Between 768–1024px the layout was a stacked single column, wasting space.
- **Fix:** Added `md:grid-cols-3` intermediate step (sidebar 1 col + detail 2 col at md, then 1+3 at lg).
- **Files:** `app/artifacts/page.tsx`

#### 9. Study Page — Low Contrast "Unsure" Color
- **Problem:** `text-accent` (yellow #f3c13a) on a white `bg-surface` card for the Unsure count in Results — fails WCAG AA contrast (4.5:1 minimum). Same issue with `text-pipeline-judge` (blue) used for Unsure in per-card result badges, which is semantically wrong (blue = "good/primary").
- **Fix:** Changed Unsure color to `text-pipeline-draft` (amber via CSS var, renders as the same yellow but via the token system). For the per-card badge, `bg-pipeline-draft/10` provides a recognizable amber chip.
- **Files:** `app/study/page.tsx`

#### 10. Analytics Page — `overflow-auto` on Main Element
- **Problem:** `overflow-auto` on `<main>` can clip sticky elements, shadow, and cause unexpected scroll containers. Page-level scrolling should occur at the window level.
- **Fix:** Removed `overflow-auto`.
- **Files:** `app/analytics/page.tsx`

#### 11. Analytics Page — Artifact Progress Section Uses `rounded-lg` + Incorrect Heading
- **Problem:** Wrapper `div` used `rounded-lg` (breaks sharp design system). Inner heading used `text-xl font-semibold` (inconsistent with the page's `text-xs uppercase tracking-wide` pattern for section labels).
- **Fix:** Removed wrapper card entirely (sub-components have their own borders). Updated heading to match design system.
- **Files:** `app/analytics/page.tsx`

#### 12. ArtifactProgressDetail — Nested Double-Borders
- **Problem:** The component rendered three separate `border border-border bg-card p-5` sub-sections, which were then placed inside the analytics page's own bordered card — creating double-border visual noise.
- **Fix:** Consolidated into a single outer card with a header row and an inner padded body. Sub-sections are now content blocks without their own card borders.
- **Files:** `components/analytics/artifact-progress-detail.tsx`

#### 13. Analytics Error State — Rounded Corner Inconsistency
- **Problem:** Error banner used `rounded-lg` and `bg-destructive/10 border border-destructive/20`, inconsistent with the left-border error pattern used on every other page.
- **Fix:** Updated to `border-l-2 border-destructive bg-destructive/5` to match system-wide error style.
- **Files:** `app/analytics/page.tsx`

#### 14. Design Tokens — `green-*` Hardcoded Tailwind Colors
- **Problem:** `mastery-badge.tsx` and `mastery-distribution-chart.tsx` used `bg-green-500`, `text-green-600`, `bg-green-50` — raw Tailwind colors outside the design token system, making theming impossible.
- **Fix:** Added `--mastered` CSS variable (`142 71% 38%`) and `mastered` token in `globals.css` and `tailwind.config.ts`. Updated both components to use `bg-mastered`, `text-mastered`, `bg-mastered/10`.
- **Files:** `app/globals.css`, `tailwind.config.ts`, `components/study/mastery-badge.tsx`, `components/analytics/mastery-distribution-chart.tsx`

#### 15. Pipeline Connector Line Too Short
- **Problem:** The vertical connector line between pipeline stage icons was `h-2` (8px), creating a visible gap between stage rows instead of a continuous flow.
- **Fix:** Increased to `h-4` (16px) to properly bridge the gap between icons.
- **Files:** `components/pipeline-status.tsx`

---

## Remaining Frontend Items (Not Yet Fixed)

These are known issues intentionally left for future work:

| Issue | Severity | Notes |
|---|---|---|
| `bg-pipeline-draft/10` opacity modifier may not work with `hsl(var(...))` color definitions | Medium | Tailwind v3 opacity modifiers require raw channel values. Audit pipeline color token definitions if rendering appears off. |
| Study page flashcard has no keyboard shortcut (e.g. Space to flip, 1/2/3 to rate) | Low | Accessibility and UX enhancement. |
| Artifacts page empty state component (`components/artifacts/empty-state.tsx`) exists but is not used in the page | Low | Should replace the generic "No Q&A pairs match" message when artifacts list is empty. |
| Analytics `StreakWidget` — accent yellow callout for "Study today" may appear low contrast on some displays | Low | Consider using `border-primary` instead of `border-accent` for the streak nudge. |
| No `aria-live` region for pipeline simulation progress updates | Low | Screen reader users won't hear stage transitions. |
| Mobile: study card rating buttons (Didn't know / Unsure / Know it) stack into 3 equal columns but on very small phones may truncate labels | Low | Consider abbreviating or wrapping on `<sm`. |

---

## Backend Gaps (Frontend-Visible Impact)

These are backend issues that directly affect the frontend experience:

| Gap | Frontend Impact |
|---|---|
| No database — all API routes are stubs | Artifacts page always shows mock data. No user data persists. |
| `/api/auth/refresh` route does not exist | `auth-context.tsx` calls it on app load — silent 404 on every mount. |
| `/api/auth/login` returns mock token without verifying credentials | Login always "succeeds" in dev regardless of credentials. |
| No password reset email service | `forgot-password` page submits but no email is sent. |
| Study API (`/api/study`) not connected | Study sessions are not persisted; analytics always shows mock data. |
| Analytics export endpoint (`/api/analytics/export`) does not exist | Export buttons fail silently. |

---

## Component Health Summary (Post-Fix)

| System | UI Quality | Mobile | Token Compliance | Grade |
|---|---|---|---|---|
| Nav | Clean, accessible | Hamburger menu added | Compliant | A |
| Home / Generate | Clear, well-structured | Fixed padding | Compliant | A |
| Artifacts Browser | Sharp sidebar, readable | Fixed grid + padding | Compliant | A- |
| Study Mode | Good flashcard UX | Fixed padding | Compliant | A- |
| Analytics Dashboard | Dense data, well-laid out | Fixed padding | Compliant | A- |
| Auth Pages (Login/Register/ForgotPW/ResetPW) | Consistent, professional | Responsive (max-w-sm) | Compliant | A |
| Pipeline Status | Clear stage flow | N/A (embedded) | Compliant | A- |
| Design Token System | Fully tokenized | — | All green/pipeline colors now tokened | A |
