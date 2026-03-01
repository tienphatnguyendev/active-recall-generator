# Implementation Plan: C3 — Analytics Page Fetch Missing Auth Header

## Issue Summary

The analytics page (`app/analytics/page.tsx`) is a `'use client'` component that fetches `/api/analytics` via a plain `fetch()` call without any authorization header. The API route requires a Bearer token and returns 401 without it. This means analytics data silently fails to load for all users.

## Technical Approach

Convert the analytics page from a client component to a **Server Component** (matching the pattern used by `artifacts/page.tsx` and `study/page.tsx`). Fetch analytics data server-side using the SSR Supabase client, then pass the data to a client component for rendering. This eliminates the auth header problem entirely.

## Implementation Steps

### Step 1: Create `app/analytics/analytics-client.tsx` (20 min)

**Dependencies**: None

Extract the rendering logic into a client component:

```tsx
'use client';

import { StatsOverview } from '@/components/analytics/stats-overview';
import { StreakWidget } from '@/components/analytics/streak-widget';
// ... other component imports

interface AnalyticsClientProps {
  data: AnalyticsData; // Use the existing AnalyticsData interface
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  return (
    <div className="space-y-6">
      <StatsOverview stats={data.stats} />
      {/* ... rest of the rendering JSX, moved from page.tsx */}
    </div>
  );
}
```

### Step 2: Convert `app/analytics/page.tsx` to Server Component (20 min)

**Dependencies**: Step 1, C1 (SSR client), C2 (parameterless RPCs)

```tsx
import { Nav } from '@/components/nav';
import { createClient } from '@/utils/supabase/server';
import { AnalyticsClient } from './analytics-client';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [streakRes, weeklyRes, masteryRes] = await Promise.all([
    supabase.rpc('get_user_streak'),
    supabase.rpc('get_weekly_activity'),
    supabase.rpc('get_mastery_distribution'),
  ]);

  // ... transform into AnalyticsData shape
  // ... render <AnalyticsClient data={analyticsData} />
}
```

### Step 3: Remove the `/api/analytics` route (5 min)

**Dependencies**: Step 2

Delete `app/api/analytics/route.ts` — it's no longer needed since data is fetched server-side.

### Step 4: Test (10 min)

**Dependencies**: Steps 1–3

1. Navigate to `/analytics` while logged in
2. Verify skeleton is not shown (server-rendered)
3. Verify all dashboard widgets render with correct data
4. Verify page loads in under 2 seconds

## Acceptance Criteria

- [ ] `app/analytics/page.tsx` is a server component (no `'use client'` directive)
- [ ] Analytics data is fetched server-side via Supabase RPCs
- [ ] No `/api/analytics` route exists
- [ ] Dashboard renders correctly for authenticated users
- [ ] Unauthenticated users are redirected to `/login` by middleware

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Loading state UX change (no skeleton) | Low | Use Next.js `loading.tsx` for streaming |
| RPC errors not displayed | Medium | Add error boundary in server component |

**Rollback**: Restore the API route and revert `page.tsx` to the client component version.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~55 minutes
- **Dependencies**: C1 and C2 should ideally be completed first, but can be done independently
