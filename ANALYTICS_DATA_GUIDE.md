# Analytics Mock Data Guide

## Overview

The Active Recall Generator includes comprehensive mock analytics data to support full development and testing of the analytics dashboard. The mock data is designed to be realistic, covering multiple learning scenarios and metrics that reflect typical user behavior patterns.

## Data Structure

### Main Analytics Data Interface (`AnalyticsData`)

```typescript
interface AnalyticsData {
  stats: Stat[];
  streak: StreakData;
  weeklyActivity: DayActivity[];
  masteryDistribution: MasteryDistribution;
  performanceByTopic: TopicPerformance[];
  artifacts: ArtifactProgress[];
}
```

## Components & Their Data Requirements

### 1. Stats Overview (`StatsOverview`)

**Component Location:** `components/analytics/stats-overview.tsx`

**Data Structure:**
```typescript
stats: Array<{
  label: string;           // "Cards reviewed"
  value: string | number;  // 342
  subValue?: string;       // "+14 this week"
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;     // "+8%"
}>
```

**Mock Data Example:**
- Cards reviewed: 342 (+14 this week) ↑ +8%
- Cards mastered: 87 (25% of total) ↑ +12%
- Study streak: 23 (Days) ↑ 3 days
- Avg. accuracy: 71% (+4% vs 2 weeks ago) ↑ +4%

**Realistic Values:**
- Cards reviewed: 200-500 (accumulated over time)
- Cards mastered: 15-40% of total cards
- Study streak: 1-60+ days
- Accuracy: 50-90%

### 2. Study Streak Widget (`StreakWidget`)

**Component Location:** `components/analytics/streak-widget.tsx`

**Data Structure:**
```typescript
streak: {
  currentStreak: number;    // 23 days
  longestStreak: number;    // 45 days
  studiedToday: boolean;    // true
  recentDays: Array<{
    date: string;           // ISO format: "2024-01-19"
    studied: boolean;       // true/false
  }>;
}
```

**Display Characteristics:**
- Shows 7-day activity with visual indicators (filled/empty squares)
- Current streak displayed prominently
- Longest streak shown for motivation
- Alert message if user hasn't studied today

**Realistic Patterns:**
- Current streaks: 1-100+ days (varies by user discipline)
- Longest streaks: Usually higher than current
- Recent days: Pattern of consecutive studied days at the end (forming current streak)
- Missing days: Break the streak if study wasn't done

### 3. Weekly Activity Chart (`WeeklyActivityChart`)

**Component Location:** `components/analytics/weekly-activity-chart.tsx`

**Data Structure:**
```typescript
weeklyActivity: Array<{
  date: string;           // ISO format: "2024-01-19"
  cardsStudied: number;   // 10-55 cards
  sessionCount: number;   // 1-3 sessions
}>
```

**Visualization:**
- 7 vertical bars showing cards studied per day
- Heights normalized to maximum daily cards
- Shows empty days (0 cards)

**Realistic Patterns:**
- Variable daily activity (not always consistent)
- Range: 10-55 cards per day (typical study loads)
- Multiple sessions per day when busy
- Some rest days with 0 activity

### 4. Mastery Distribution Chart (`MasteryDistributionChart`)

**Component Location:** `components/analytics/mastery-distribution-chart.tsx`

**Data Structure:**
```typescript
masteryDistribution: {
  data: Array<{
    level: MasteryLevel;  // "new" | "learning" | "reviewing" | "mastered"
    count: number;        // 87
  }>;
  totalCards: number;     // 342
}
```

**Levels & Meanings:**
- **new**: Never studied, newly created cards
- **learning**: First few attempts, still mastering
- **reviewing**: Intermediate mastery, needs periodic review
- **mastered**: Fully learned, long-term retention

**Realistic Distribution:**
```
Total Cards: 342

Mastered:   87 cards (25%)  - Core competency achieved
Reviewing:  142 cards (41%) - Active learning phase
Learning:   89 cards (26%)  - Early stage learning
New:        24 cards (7%)   - Just created, not started
```

**Patterns:**
- Most cards in "reviewing" (active learning)
- Mastered cards typically 20-35% of total
- Some new cards always being added
- Learning and reviewing make up bulk of material

### 5. Performance by Topic (`PerformanceByTopic`)

**Component Location:** `components/analytics/performance-by-topic.tsx`

**Data Structure:**
```typescript
performanceByTopic: Array<{
  topic: string;        // "Strategic Planning"
  source: string;       // "Case Study: McKinsey Growth Framework"
  totalCards: number;   // 28
  knownPct: number;     // 43 (%)
  unsurePct: number;    // 32 (%)
  unknownPct: number;   // 25 (%)
}>
```

**Display:**
- Stacked horizontal bars showing performance distribution
- Sorted by weakness (lowest "known" percentage first)
- Color coding: Green (known), Orange (unsure), Red (unknown)

**Realistic Distributions:**
```
Strong Topic (Strategic Planning):
  Known: 43% | Unsure: 32% | Unknown: 25%

Weak Topic (Digital Transformation):
  Known: 45% | Unsure: 36% | Unknown: 19%

Mastered Topic (Competitive Strategy):
  Known: 86% | Unsure: 11% | Unknown: 3%
```

**Patterns:**
- Weakest topics have 40-60% known
- Medium topics have 60-80% known
- Mastered topics have 80%+ known
- All categories represented (never 100% perfect)

### 6. Artifact Progress Detail (`ArtifactProgressDetail`)

**Component Location:** `components/analytics/artifact-progress-detail.tsx`

**Data Structure:**
```typescript
artifacts: Array<{
  artifactId: string;
  section: string;      // "Market Entry Strategy"
  source: string;       // "Case Study: McKinsey Growth Framework"
  mastery: MasteryLevel;
  studyTimeline: Array<{
    date: string;
    rating: 'know' | 'unsure' | 'unknown';
  }>;
  weakAreas: Array<{
    question: string;
    timesUnknown: number;  // How many times marked as "unknown"
    lastAttempted: string; // ISO date
  }>;
  nextSessionSuggestion: string;
}>
```

**Display Elements:**

1. **Header**
   - Source name (gray, smaller)
   - Section title (larger, bold)
   - Mastery badge with progress bar

2. **Next Session Suggestion**
   - Actionable advice based on study history
   - Highlights focus areas
   - Motivational when appropriate

3. **Study Timeline**
   - 14-day history shown as stacked bar chart
   - Colors: Green (know), Orange (unsure), Red (unknown)
   - Visualizes learning progress over time

4. **Weak Areas**
   - Only shown if weakAreas.length > 0
   - Questions marked "unknown" multiple times
   - Last attempted date for context
   - Counter showing times marked unknown

**Realistic Example:**

```typescript
{
  artifactId: 'art-001',
  section: 'Market Entry Strategy',
  source: 'Case Study: McKinsey Growth Framework',
  mastery: 'reviewing',
  studyTimeline: [
    // 14 days of study history with mixed ratings
    { date: '2024-01-07', rating: 'unknown' },
    { date: '2024-01-08', rating: 'unsure' },
    // ... progression shows learning over time
    { date: '2024-01-19', rating: 'know' }
  ],
  weakAreas: [
    {
      question: 'What are the three key pillars of market entry?',
      timesUnknown: 3,
      lastAttempted: '2024-01-18'
    }
  ],
  nextSessionSuggestion: 'Focus on market sizing methodologies...'
}
```

## Mock Data File

**Location:** `lib/mock-analytics-data.ts`

### Exports

1. **`MOCK_ANALYTICS_DATA`** (Main dataset)
   - Comprehensive, realistic analytics data
   - 6 artifacts with full study histories
   - 9 topics with varying performance
   - 23-day current streak
   - 342 total cards tracked

2. **`generateRandomAnalyticsData()`** (Function)
   - Generates random analytics data
   - Useful for testing different scenarios
   - Randomizes all metrics while maintaining realism

3. **`MINIMAL_MOCK_DATA`** (Empty state)
   - For testing empty state displays
   - All arrays empty, zero values

### Helper Functions

- **`generatePastDates(days)`**: Creates ISO date strings
- **`generateRecentDaysActivity(currentStreak)`**: 7-day activity pattern
- **`generateWeeklyActivity()`**: Random weekly data
- **`generateStudyTimeline(dayCount)`**: Study history with realistic progression

## Real-World Scenarios in Mock Data

### Scenario 1: Strong Learner (Mastered & Reviewing)
- 23-day study streak
- 87 mastered cards (25%)
- 142 reviewing cards (41%)
- 71% average accuracy
- Consistent daily study

### Scenario 2: Struggling Area (Digital Transformation)
- 3-day study history
- 45% known percentage
- Multiple weak areas identified
- Suggestion: Focused learning on change management
- Recommendation: More detailed study sessions

### Scenario 3: Mastered Topic (Hypothesis-Driven Problem Solving)
- 28-day study history
- 100% mastery
- No weak areas
- Suggestion: Apply to real cases for advancement

## Using Mock Data in Development

### Import in Components
```typescript
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';
```

### Use in API Route
```typescript
// app/api/analytics/route.ts
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';

export async function GET(request: NextRequest) {
  return NextResponse.json(MOCK_ANALYTICS_DATA);
}
```

### Generate Random Data for Testing
```typescript
import { generateRandomAnalyticsData } from '@/lib/mock-analytics-data';

const randomData = generateRandomAnalyticsData();
// Use for testing different data scenarios
```

## Key Design Principles

1. **Realism**: Data reflects actual learning patterns
2. **Variety**: Multiple scenarios and difficulty levels
3. **Completeness**: All component fields populated
4. **Flexibility**: Helper functions for custom scenarios
5. **Documentation**: Clear comments and types

## Transition to Real Data

When ready to implement backend:

1. Replace `MOCK_ANALYTICS_DATA` with database queries
2. Calculate streaks from session history
3. Compute mastery distribution from card ratings
4. Aggregate performance metrics by topic
5. Generate suggestions based on weak areas

## Testing Checklist

- [ ] All 4 mastery levels represented
- [ ] Streak shows consecutive days at end
- [ ] Weekly activity includes rest days
- [ ] Topics sorted by weakness (lowest known first)
- [ ] Artifacts show realistic progressions
- [ ] Weak areas only shown when present
- [ ] Trend indicators (up/down/neutral) display correctly
- [ ] Percentages sum to 100% in stacked bars
- [ ] Dates are recent and realistic
- [ ] Suggestions are contextual and actionable

## Data Refresh

For UI development, consider:
- Updating mock dates to current day
- Generating random data for each dev session
- Testing with minimal data for edge cases
- Using real-looking source names and topics

