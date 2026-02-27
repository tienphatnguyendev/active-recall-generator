# Analytics Mock Data - Complete Overview

## What's Included

A comprehensive mock data system for the Active Recall Generator analytics dashboard, featuring:

- **Main mock dataset** with realistic learning metrics across 6 artifacts and 9 topics
- **4 pre-built test scenarios** covering different user learning states
- **Helper functions** for generating dynamic data
- **Complete documentation** on data structures and usage

## Files Created

### Data Files
1. **`lib/mock-analytics-data.ts`** (450 lines)
   - `MOCK_ANALYTICS_DATA`: Main comprehensive mock dataset
   - `generateRandomAnalyticsData()`: Generate random realistic data
   - `MINIMAL_MOCK_DATA`: Empty state for testing
   - Helper functions for dates, timelines, activities

2. **`lib/analytics-test-scenarios.ts`** (488 lines)
   - `NEW_USER_SCENARIO`: Brand new user (day 1)
   - `CASUAL_LEARNER_SCENARIO`: Inconsistent 2-week pattern
   - `DEDICATED_LEARNER_SCENARIO`: 90-day consistent learning
   - `STRUGGLING_LEARNER_SCENARIO`: User needing support

### Documentation Files
3. **`ANALYTICS_DATA_GUIDE.md`** (368 lines)
   - Detailed explanation of each data component
   - Component-to-data mapping
   - Realistic value ranges
   - Real-world scenarios

4. **`MOCK_DATA_USAGE_GUIDE.md`** (360 lines)
   - Developer quick start
   - How to use each scenario
   - Testing strategies
   - Integration with backend

5. **`ANALYTICS_MOCK_DATA_README.md`** (This file)
   - Overview and quick reference

## Data Structure

All mock data conforms to this interface:

```typescript
interface AnalyticsData {
  // 4 KPI cards showing progress
  stats: {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }[];
  
  // Study streak information
  streak: {
    currentStreak: number;
    longestStreak: number;
    studiedToday: boolean;
    recentDays: { date: string; studied: boolean }[];
  };
  
  // Weekly activity (7 days)
  weeklyActivity: {
    date: string;
    cardsStudied: number;
    sessionCount: number;
  }[];
  
  // Card mastery distribution
  masteryDistribution: {
    data: { level: MasteryLevel; count: number }[];
    totalCards: number;
  };
  
  // Performance by topic
  performanceByTopic: {
    topic: string;
    source: string;
    totalCards: number;
    knownPct: number;
    unsurePct: number;
    unknownPct: number;
  }[];
  
  // Detailed artifact progress
  artifacts: {
    artifactId: string;
    section: string;
    source: string;
    mastery: MasteryLevel;
    studyTimeline: { date: string; rating: 'know' | 'unsure' | 'unknown' }[];
    weakAreas: { question: string; timesUnknown: number; lastAttempted: string }[];
    nextSessionSuggestion: string;
  }[];
}
```

## Quick Start

### 1. View Default Data

Navigate to `/analytics` - automatically displays comprehensive mock data.

### 2. View Different Scenarios

```bash
# New user (day 1)
/analytics?scenario=newUser

# Casual learner (2-week inconsistent pattern)
/analytics?scenario=casualLearner

# Dedicated learner (90+ days consistent)
/analytics?scenario=dedicatedLearner

# Struggling learner (needs help)
/analytics?scenario=strugglingLearner
```

### 3. Use in Code

```typescript
import { MOCK_ANALYTICS_DATA } from '@/lib/mock-analytics-data';
import { ANALYTICS_SCENARIOS } from '@/lib/analytics-test-scenarios';

// Default data
const data = MOCK_ANALYTICS_DATA;

// Specific scenario
const newUserData = ANALYTICS_SCENARIOS.newUser;

// Random data
const random = generateRandomAnalyticsData();
```

## Main Features

### Comprehensive Mock Dataset
- **342 total cards** across 6 artifacts
- **23-day active streak** with realistic patterns
- **9 topics** with varying performance levels
- **Detailed study history** showing learning progression
- **Weak areas identified** for each artifact
- **Actionable suggestions** for next study sessions

### 4 Test Scenarios
| Scenario | Use Case | Characteristics |
|----------|----------|-----------------|
| New User | Initial state testing | 15 cards, 0 mastered, no streak |
| Casual Learner | Variable patterns | 124 cards, 1-day streak, 58% accuracy |
| Dedicated Learner | Advanced user | 856 cards, 67-day streak, 84% accuracy |
| Struggling Learner | Support needs | 87 cards, 3-day streak, 42% accuracy |

### Helper Functions

- `generatePastDates(days)` - Create ISO date strings
- `generateRecentDaysActivity(streak)` - 7-day activity pattern
- `generateWeeklyActivity()` - Random weekly data
- `generateStudyTimeline(days)` - Study history with progression
- `generateRandomAnalyticsData()` - Fully random dataset

## What Each Component Displays

### StatsOverview
- 4 KPI cards showing top-line metrics
- Trends (up/down/neutral) with percentage changes
- Sub-values providing context

**Example Data:**
```
Cards reviewed: 342 (+14 this week) ↑ +8%
Cards mastered: 87 (25% of total) ↑ +12%
Study streak: 23 (Days) ↑ 3 days
Avg. accuracy: 71% (+4% vs 2 weeks ago) ↑ +4%
```

### StreakWidget
- Current and longest streaks prominently displayed
- 7-day activity grid with study/rest days
- Message if no study today
- Visual indicators for consistency

**Example Data:**
```
Current: 23 days | Longest: 45 days
Recent: M✓ T✗ W✗ R✓ F✗ S✓ Su✓
```

### WeeklyActivityChart
- Bar chart showing cards studied per day
- 7-bar visualization over last week
- Variable heights based on study volume
- Shows rest days

**Example Data:**
```
Daily cards: 22, 0, 0, 18, 0, 25, 15
Heights: 45%, 0%, 0%, 35%, 0%, 50%, 30%
```

### MasteryDistributionChart
- Segmented horizontal bar showing card distribution
- 4 mastery levels with distinct colors
- Percentage breakdown with counts
- Sorted by achievement level

**Example Data:**
```
Mastered: 87 (25%) | Reviewing: 142 (41%)
Learning: 89 (26%) | New: 24 (7%)
```

### PerformanceByTopic
- Table of topics sorted by weakness
- Stacked bar showing know/unsure/unknown breakdown
- Source attribution
- Color-coded performance levels

**Example Topics:**
```
Digital Transformation (45% known, weakest)
Market Dynamics (68% known)
Competitive Strategy (86% known, strong)
```

### ArtifactProgressDetail
- Individual artifact card with full context
- 14-day study timeline visualization
- Identified weak areas with failure counts
- Personalized next session suggestions

**Example Content:**
```
Market Entry Strategy (Reviewing)
Timeline: 14 days of study progression
Weak Areas: 2 identified questions (3x and 2x unknown)
Suggestion: "Focus on market sizing methodologies..."
```

## Realistic Data Characteristics

### Distribution Patterns
- Mastery levels follow realistic learning curve
- Early stages have more "new" and "learning" cards
- Advanced users show 20-50% mastery
- Expert users show 40-80% mastery

### Study Patterns
- Daily cards studied: 10-75 (varies by user)
- Sessions per day: 1-3 (varies by routine)
- Rest days included (not perfect consistency)
- Streaks end and restart (natural patterns)

### Performance Curves
- New topics: 20-40% known
- Mid-level topics: 50-75% known
- Mastered topics: 80%+ known
- Always some uncertainty (realistic)

### Temporal Patterns
- Recent studies more successful than early attempts
- Timeline shows progression toward mastery
- Weak areas remain consistent (real struggle areas)
- Suggestions improve as data improves

## Integration Roadmap

### Phase 1: Frontend Development (Current)
- Use mock data for all dashboard development
- Test different scenarios
- Verify component interactions
- No backend needed

### Phase 2: Backend Integration
- Replace API route with database queries
- Keep same response format
- Use mock data structure as schema template
- Gradual migration (can keep mock fallback)

### Phase 3: Production
- Real analytics calculations from sessions
- User-specific data filtering
- Real-time updates
- Historical trending

## Testing Checklist

- [ ] All 4 stat cards display with correct values
- [ ] Streak shows consecutive days at end of activity
- [ ] Weekly chart has 7 bars with proper heights
- [ ] Mastery bar segments show correct percentages
- [ ] Topics sorted by lowest "known" percentage first
- [ ] Each artifact has data in all sections
- [ ] Weak areas only display when > 0
- [ ] Suggestions are contextual and meaningful
- [ ] Dates are recent and properly formatted
- [ ] Trends display up/down/neutral correctly
- [ ] All colors and styling match design system
- [ ] Responsive layout works on mobile/tablet

## File Organization

```
lib/
├── mock-analytics-data.ts       (Main data + helpers)
└── analytics-test-scenarios.ts  (Pre-built scenarios)

app/api/analytics/
└── route.ts                     (Uses mock data)

Documentation/
├── ANALYTICS_DATA_GUIDE.md      (Detailed structure)
├── MOCK_DATA_USAGE_GUIDE.md     (Developer guide)
└── ANALYTICS_MOCK_DATA_README.md (This file)
```

## Key Metrics in Default Dataset

```
Total Cards Reviewed:   342
Cards Mastered:         87 (25%)
Cards Reviewing:        142 (41%)
Cards Learning:         89 (26%)
New Cards:              24 (7%)

Current Streak:         23 days
Longest Streak:         45 days
Average Accuracy:       71%

Artifacts:              6 total
- Mastered:             2
- Reviewing:            2
- Learning:             1
- New:                  1

Topics Tracked:         9
Average Performance:    64% known
```

## Common Use Cases

### UI Development
"Show me what this looks like with data"
→ Use `MOCK_ANALYTICS_DATA`

### Component Testing
"Test different scenarios"
→ Use `ANALYTICS_SCENARIOS.{scenario}`

### Edge Case Testing
"What if user has no data?"
→ Use `MINIMAL_MOCK_DATA`

### Load Testing
"Random variation each time"
→ Use `generateRandomAnalyticsData()`

### Debugging
"Find specific data for this issue"
→ Inspect mock data structure, update as needed

## Next Steps

1. **Open Analytics Dashboard**
   - Navigate to `/analytics`
   - Verify all components render
   - Check data accuracy

2. **Test Different Scenarios**
   - Try `?scenario=newUser`
   - Try `?scenario=dedicatedLearner`
   - Compare visualizations

3. **Study the Data Structure**
   - Read `ANALYTICS_DATA_GUIDE.md`
   - Understand each component's needs
   - Review helper functions

4. **Plan Backend Migration**
   - Design database schema using mock structure
   - Plan API responses matching mock format
   - Plan migration strategy

## Questions?

Refer to:
- **Data structure questions:** `ANALYTICS_DATA_GUIDE.md`
- **Usage questions:** `MOCK_DATA_USAGE_GUIDE.md`
- **Code questions:** See comments in mock-analytics-data.ts

