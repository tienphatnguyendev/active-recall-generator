# Mock Analytics Data - Developer Usage Guide

## Quick Start

### 1. Using Default Mock Data

The analytics page automatically uses the default comprehensive mock data:

```typescript
// File: app/api/analytics/route.ts
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';

export async function GET(request: NextRequest) {
  return NextResponse.json(MOCK_ANALYTICS_DATA);
}
```

No changes needed - the dashboard will display with realistic data immediately.

### 2. Testing Different Scenarios

To test how the dashboard looks with different user states, use the test scenarios:

```typescript
// File: app/api/analytics/route.ts
import { ANALYTICS_SCENARIOS } from '@/lib/analytics-test-scenarios';

export async function GET(request: NextRequest) {
  const scenario = request.nextUrl.searchParams.get('scenario');
  
  if (scenario && scenario in ANALYTICS_SCENARIOS) {
    return NextResponse.json(ANALYTICS_SCENARIOS[scenario as AnalyticsScenarioKey]);
  }
  
  return NextResponse.json(MOCK_ANALYTICS_DATA);
}
```

Then access: `/analytics?scenario=newUser`

## Available Scenarios

### 1. New User (`newUser`)
**Use Case:** Testing empty/initial state
- 1 artifact created, no study sessions
- All 15 cards in "new" state
- No streak
- 0% accuracy
- Shows onboarding messages

```typescript
import { ANALYTICS_SCENARIOS } from '@/lib/analytics-test-scenarios';

const data = ANALYTICS_SCENARIOS.newUser;
```

### 2. Casual Learner (`casualLearner`)
**Use Case:** Inconsistent study patterns
- 124 cards reviewed
- 1-day streak (just restarted)
- 58% accuracy
- Studies 2-3 times per week
- Good for testing variable layouts

```typescript
const data = ANALYTICS_SCENARIOS.casualLearner;
```

### 3. Dedicated Learner (`dedicatedLearner`)
**Use Case:** Advanced user with high engagement
- 856 cards mastered (48%)
- 67-day streak
- 84% accuracy
- Multiple artifacts at mastery
- Shows best-case scenario

```typescript
const data = ANALYTICS_SCENARIOS.dedicatedLearner;
```

### 4. Struggling Learner (`strugglingLearner`)
**Use Case:** User needing support
- 87 cards reviewed
- 3-day streak (inconsistent)
- 42% accuracy (below target)
- Multiple weak areas per artifact
- Shows support recommendations

```typescript
const data = ANALYTICS_SCENARIOS.strugglingLearner;
```

## Files Location

```
lib/
  ├── mock-analytics-data.ts      (Main mock data + helpers)
  └── analytics-test-scenarios.ts (Pre-built test scenarios)

ANALYTICS_DATA_GUIDE.md           (Detailed data structure docs)
MOCK_DATA_USAGE_GUIDE.md          (This file)
```

## Data Structure Reference

### Core Interface

```typescript
interface AnalyticsData {
  stats: Stat[];                          // 4 KPI cards
  streak: StreakData;                     // 7-day activity
  weeklyActivity: DayActivity[];          // 7 bars chart
  masteryDistribution: MasteryDistribution; // Pie chart
  performanceByTopic: TopicPerformance[]; // Table
  artifacts: ArtifactProgress[];          // Detailed cards
}
```

### Key Data Points

| Component | Field | Type | Example |
|-----------|-------|------|---------|
| Stats | value | number | 342 |
| Stats | trend | 'up'\|'down'\|'neutral' | 'up' |
| Streak | currentStreak | number | 23 |
| Weekly | cardsStudied | number | 35 |
| Mastery | level | MasteryLevel | 'mastered' |
| Topic | knownPct | number | 71 |
| Artifact | mastery | MasteryLevel | 'reviewing' |

## Helper Functions

### Generate Past Dates
```typescript
import { generatePastDates } from '@/lib/mock-analytics-data';

const dates = generatePastDates(7); // Last 7 days
// ["2024-01-13", "2024-01-14", ..., "2024-01-19"]
```

### Generate Weekly Activity
```typescript
import { generateWeeklyActivity } from '@/lib/mock-analytics-data';

const activity = generateWeeklyActivity();
// Returns 7-day activity data with random cards studied
```

### Generate Study Timeline
```typescript
import { generateStudyTimeline } from '@/lib/mock-analytics-data';

const timeline = generateStudyTimeline(14);
// 14-day study history with mixed know/unsure/unknown
```

### Generate Random Data
```typescript
import { generateRandomAnalyticsData } from '@/lib/mock-analytics-data';

const randomData = generateRandomAnalyticsData();
// Fully random analytics data for each test run
```

## Testing Strategies

### 1. Component-Level Testing

Test individual components with specific data:

```typescript
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';

// Test StatsOverview
<StatsOverview stats={MOCK_ANALYTICS_DATA.stats} />

// Test StreakWidget
<StreakWidget {...MOCK_ANALYTICS_DATA.streak} />

// Test MasteryDistributionChart
<MasteryDistributionChart {...MOCK_ANALYTICS_DATA.masteryDistribution} />
```

### 2. Full Dashboard Testing

Test entire dashboard with different scenarios:

```typescript
// pages/__tests__/analytics.test.tsx
import { ANALYTICS_SCENARIOS } from '@/lib/analytics-test-scenarios';

describe('Analytics Dashboard', () => {
  Object.entries(ANALYTICS_SCENARIOS).forEach(([name, data]) => {
    test(`Renders correctly for ${name}`, () => {
      render(<AnalyticsPage initialData={data} />);
      expect(screen.getByText(/Learning analytics/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Edge Case Testing

Test specific conditions:

```typescript
// Empty data
import { MINIMAL_MOCK_DATA } from '@/lib/mock-analytics-data';

// Extreme values
const extremeData = {
  ...MOCK_ANALYTICS_DATA,
  masteryDistribution: {
    data: [{ level: 'mastered', count: 1000 }],
    totalCards: 1000
  }
};

// Unbalanced distribution
const unbalanced = {
  ...MOCK_ANALYTICS_DATA,
  masteryDistribution: {
    data: [{ level: 'new', count: 500 }, ...],
    totalCards: 600
  }
};
```

## Common Development Tasks

### Task: Verify All Components Display Correctly

1. Start dev server
2. Navigate to `/analytics`
3. Verify displays:
   - [ ] 4 stat cards with trends
   - [ ] Streak widget with 7-day activity
   - [ ] Weekly activity bar chart
   - [ ] Mastery distribution segmented bar
   - [ ] Performance by topic table
   - [ ] Artifact progress cards
   - [ ] Next session suggestions

### Task: Test Different User States

```bash
# Terminal
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test scenarios
curl http://localhost:3000/api/analytics?scenario=newUser
curl http://localhost:3000/api/analytics?scenario=strugglingLearner
curl http://localhost:3000/api/analytics?scenario=dedicatedLearner
```

### Task: Update Mock Data

1. Edit `lib/mock-analytics-data.ts`
2. Update `MOCK_ANALYTICS_DATA` constant
3. Save and hot-reload will refresh dashboard
4. No restart needed

### Task: Add New Scenario

```typescript
// Add to analytics-test-scenarios.ts
export const MY_NEW_SCENARIO: AnalyticsData = {
  // ... your data
};

// Add to scenarios map
export const ANALYTICS_SCENARIOS = {
  // ... existing
  myNewScenario: MY_NEW_SCENARIO,
};
```

## Integration with Backend

When ready to switch to real data:

### Step 1: Keep Mock Data as Fallback

```typescript
// app/api/analytics/route.ts
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    const data = await db.getAnalytics(userId);
    return NextResponse.json(data);
  } catch (error) {
    // Fallback to mock data during development
    console.warn('Using mock data:', error);
    return NextResponse.json(MOCK_ANALYTICS_DATA);
  }
}
```

### Step 2: Gradually Migrate

```typescript
// Switch scenarios dynamically based on environment
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(MOCK_ANALYTICS_DATA);
  }
  
  // Production: real data
  const userId = await verifyAuth(request);
  const data = await fetchRealAnalytics(userId);
  return NextResponse.json(data);
}
```

## Troubleshooting

### Issue: Components don't show data

**Solution:**
1. Check API response: `curl http://localhost:3000/api/analytics`
2. Verify mock data structure matches interfaces
3. Check console for TypeScript errors

### Issue: Dates are wrong

**Solution:**
Mock data uses relative dates (current date - X days). If deployed, dates will automatically update. For testing with specific dates, manually edit the mock data.

### Issue: Random data looks unrealistic

**Solution:**
The `generateRandomAnalyticsData()` function is probabilistic. For consistent data, use pre-built scenarios instead.

## Performance Notes

- Mock data: ~50KB (minimal impact)
- Helper functions: O(n) where n is days (7 = negligible)
- No external API calls needed during development
- Full dashboard renders in <100ms with mock data

## Next Steps

1. **Frontend Complete?** 
   - All components rendering with mock data ✓
   - Ready to build backend

2. **Building Backend?**
   - Replace API route with database queries
   - Keep same response format as mock data
   - Use `MOCK_ANALYTICS_DATA` structure as schema

3. **Deploying?**
   - Mock data serves as fallback
   - No changes needed to frontend code
   - Backend automatically takes over when database ready

