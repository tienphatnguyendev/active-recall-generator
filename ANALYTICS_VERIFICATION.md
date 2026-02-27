# Analytics Mock Data Verification Checklist

## Pre-Deployment Verification

Use this checklist to verify all analytics components display correctly with mock data.

### Files Created Successfully
- [ ] `lib/mock-analytics-data.ts` exists and is readable
- [ ] `lib/analytics-test-scenarios.ts` exists and is readable
- [ ] `app/api/analytics/route.ts` updated to use mock data
- [ ] All documentation files created

### Data Files Are Importable
```bash
# In browser console at /analytics
console.log(window.__NEXT_DATA__)
```
- [ ] No import errors in console
- [ ] Analytics page loads without TypeScript errors
- [ ] Network request to `/api/analytics` succeeds

### API Response Structure
Check `curl http://localhost:3000/api/analytics`:
```json
{
  "stats": [...],              // ✓ Array of 4 objects
  "streak": {...},             // ✓ Has current/longest/recentDays
  "weeklyActivity": [...],     // ✓ Array of 7 objects
  "masteryDistribution": {...},// ✓ Has data array and totalCards
  "performanceByTopic": [...], // ✓ Array of 9+ objects
  "artifacts": [...]           // ✓ Array of 6 objects
}
```

## Component Rendering Verification

### Stats Overview Component
Navigate to `/analytics` and verify:
- [ ] 4 stat cards displayed in grid
- [ ] First card shows "Cards reviewed: 342"
- [ ] Second card shows "Cards mastered: 87"
- [ ] Third card shows "Study streak: 23"
- [ ] Fourth card shows "Avg. accuracy: 71%"
- [ ] All cards show trends (↑/↓ arrows)
- [ ] Trend values display with percentages
- [ ] Sub-values visible ("+14 this week", etc.)
- [ ] Cards are responsive (stack on mobile)

### Streak Widget Component
- [ ] Current streak displays as large number: "23"
- [ ] Longest streak shows: "45"
- [ ] 7-day activity grid visible below
- [ ] Days of week labels: M, T, W, R, F, S, Su
- [ ] Recent days show pattern (some filled, some empty)
- [ ] Current streak = consecutive filled days at end
- [ ] Message shows if not studied today
- [ ] Colors: filled days (primary color), empty days (muted)

### Weekly Activity Chart
- [ ] Bar chart title: "Weekly activity"
- [ ] Subtitle: "Cards studied per day"
- [ ] 7 vertical bars displayed
- [ ] Bar heights proportional to cards studied
- [ ] Values shown above bars (e.g., "22", "18", "25")
- [ ] Day abbreviations below: Mon, Tue, Wed, etc.
- [ ] Zero values show as empty space
- [ ] Legend shows color coding
- [ ] Responsive width adjusts on smaller screens

### Mastery Distribution Chart
- [ ] Title: "Mastery distribution"
- [ ] Horizontal segmented bar visible
- [ ] Bar segments show 4 levels: Mastered, Reviewing, Learning, New
- [ ] Colors correct: Green (mastered), Blue (reviewing), Orange (learning), Gray (new)
- [ ] Legend below shows:
  - [ ] "Mastered: 87 cards (25%)"
  - [ ] "Reviewing: 142 cards (41%)"
  - [ ] "Learning: 89 cards (26%)"
  - [ ] "New: 24 cards (7%)"
- [ ] Percentages sum to 100%
- [ ] Segment widths proportional to counts

### Performance by Topic
- [ ] Title: "Performance by topic"
- [ ] Subtitle: "Weakest topics listed first — focus here."
- [ ] Table/list shows 9 topics
- [ ] Topics sorted by lowest "known" percentage first
- [ ] Each row shows:
  - [ ] Topic name
  - [ ] Source name (smaller, gray text)
  - [ ] Performance percentage (right side, color-coded)
  - [ ] Stacked bar (Green | Orange | Red)
- [ ] Stacked bars show correct proportions
- [ ] High performance (80%+) shows green number
- [ ] Medium performance (50-80%) shows orange number
- [ ] Low performance (<50%) shows red number
- [ ] All percentages within 0-100%

### Artifact Progress Details
- [ ] Section title: "Artifact Progress"
- [ ] 6 artifact cards displayed
- [ ] Each card shows:
  - [ ] Source name (gray, small text, e.g., "Case Study: McKinsey Growth Framework")
  - [ ] Section title (bold, larger, e.g., "Market Entry Strategy")
  - [ ] Mastery badge (e.g., "Reviewing" with progress bar)
  - [ ] Blue suggestion box with next steps
  - [ ] Study timeline graph (if > 0 days)
  - [ ] Weak areas section (if > 0 weak areas)

#### First Artifact Details ("Market Entry Strategy")
- [ ] Shows mastery level: "Reviewing"
- [ ] Suggestion: "Focus on market sizing methodologies..."
- [ ] Timeline shows 14 days of history
- [ ] Timeline bars colored: Green (know), Orange (unsure), Red (unknown)
- [ ] Shows weak areas:
  - [ ] "What are the three key pillars of market entry?" (3x unknown)
  - [ ] "How do you calculate addressable market size?" (2x unknown)
- [ ] Last attempted dates shown

#### Last Artifact Details ("Customer Journey Mapping")
- [ ] Shows mastery level: "New"
- [ ] Shows 3 weak areas (new material, all questions difficult)
- [ ] Suggestion mentions: "visual mapping exercises"
- [ ] Timeline shows recent 3-day history

## Data Accuracy Verification

### Stats Data
```typescript
Check each stat matches:
- Cards reviewed: 342 ✓
- Cards mastered: 87 ✓
- Study streak: 23 ✓
- Avg. accuracy: 71% ✓
```

### Streak Data
```typescript
Check values:
- currentStreak: 23 ✓
- longestStreak: 45 ✓
- studiedToday: true ✓
- recentDays.length: 7 ✓
- recentDays[6].studied: true (today) ✓
```

### Weekly Activity
```typescript
Check array:
- weeklyActivity.length: 7 ✓
- All have .date (ISO format) ✓
- All have .cardsStudied (number) ✓
- All have .sessionCount (number) ✓
- Total days span: 7 consecutive days ✓
```

### Mastery Distribution
```typescript
Check totals:
- Sum of counts: 87 + 142 + 89 + 24 = 342 ✓
- totalCards: 342 ✓
- Percentages: 25% + 41% + 26% + 7% = 99% (rounding) ✓
```

### Performance by Topic
```typescript
Check each topic:
- Has .topic (string) ✓
- Has .source (string) ✓
- Has .totalCards (number) ✓
- knownPct + unsurePct + unknownPct = 100% ✓
- 9 topics total ✓
```

### Artifacts
```typescript
Check first artifact:
- artifactId: "art-001" ✓
- section: "Market Entry Strategy" ✓
- source: "Case Study: McKinsey Growth Framework" ✓
- mastery: "reviewing" ✓
- studyTimeline.length: > 0 ✓
- weakAreas.length: > 0 ✓
- nextSessionSuggestion: has text ✓
```

## Test Scenario Verification

### Test Scenario: New User
```
URL: /analytics?scenario=newUser
Expected:
- Stats show 0 mastered cards ✓
- Streak shows 0 current/longest ✓
- Weekly activity all 0s ✓
- All cards in "new" state ✓
- Only 1 artifact ✓
```

### Test Scenario: Casual Learner
```
URL: /analytics?scenario=casualLearner
Expected:
- Stats show 124 cards reviewed ✓
- Streak shows 1 day (just restarted) ✓
- 58% accuracy ✓
- Inconsistent weekly pattern ✓
- Mixed mastery levels ✓
```

### Test Scenario: Dedicated Learner
```
URL: /analytics?scenario=dedicatedLearner
Expected:
- Stats show 856 cards reviewed ✓
- Streak shows 67 days (long!) ✓
- 84% accuracy (high) ✓
- All recent days studied ✓
- 48% mastered cards ✓
- Multiple mastered artifacts ✓
```

### Test Scenario: Struggling Learner
```
URL: /analytics?scenario=strugglingLearner
Expected:
- Stats show 87 cards reviewed ✓
- Streak shows 3 days (inconsistent) ✓
- 42% accuracy (below target) ✓
- Inconsistent study pattern ✓
- Many cards in "learning" state ✓
- Multiple weak areas per artifact ✓
```

## Browser Console Tests

Run these in browser console while on `/analytics`:

```javascript
// Test API data is loaded
const analyticsData = window.__NEXT_DATA__.props.pageProps.initialData;
console.assert(analyticsData.stats.length === 4, "Stats should have 4 items");
console.assert(analyticsData.streak.currentStreak === 23, "Streak should be 23");
console.assert(analyticsData.artifacts.length === 6, "Should have 6 artifacts");

// Test data types
console.assert(typeof analyticsData.streak.currentStreak === 'number', "Streak should be number");
console.assert(Array.isArray(analyticsData.weeklyActivity), "Weekly should be array");
console.assert(Array.isArray(analyticsData.artifacts), "Artifacts should be array");

// Test all required fields exist
analyticsData.stats.forEach(stat => {
  console.assert(stat.label && stat.value, `Stat missing required fields: ${stat.label}`);
});
```

## Responsive Design Verification

### Mobile (375px width)
- [ ] Stats stack into 2 columns
- [ ] Charts remain readable
- [ ] Text doesn't overflow
- [ ] Touch targets adequate (≥44px)

### Tablet (768px width)
- [ ] Streak and Weekly Activity side-by-side
- [ ] 2-column layout for charts
- [ ] All text readable

### Desktop (1024px+)
- [ ] Full grid layout
- [ ] Artifacts display with proper spacing
- [ ] All elements visible without scroll

## Performance Verification

### Load Time
- [ ] Analytics page loads in < 2 seconds
- [ ] No layout shift after load
- [ ] Charts animate smoothly
- [ ] Scroll smooth without jank

### Data Size
```javascript
// In console
const size = new Blob([JSON.stringify(analyticsData)]).size;
console.log(`Data size: ${(size/1024).toFixed(2)}KB`);
// Expected: < 50KB
```

### Network
- [ ] Single API request to `/api/analytics`
- [ ] Response status: 200 OK
- [ ] Response time: < 100ms
- [ ] No console errors or warnings

## Accessibility Verification

- [ ] All charts have `aria-label` attributes
- [ ] Color not only indicator (patterns/numbers used)
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Semantic HTML used (buttons, headings)
- [ ] Alt text for all images

## Sign-Off Checklist

### Before Considering "Complete"
- [ ] All components render without errors
- [ ] All data displays correctly
- [ ] All test scenarios work
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Performance acceptable

### Ready for Backend Integration
- [ ] Mock data structure understood
- [ ] API response format documented
- [ ] Database schema planned
- [ ] Migration path clear
- [ ] Tests ready to switch to real data

## Troubleshooting Guide

### Issue: "Cannot find module '@/lib/mock-analytics-data'"
**Solution:** Check file exists at `lib/mock-analytics-data.ts`, clear `.next` folder, restart dev server

### Issue: "No data displayed, empty dashboard"
**Solution:** 
1. Check `/api/analytics` returns JSON
2. Check browser console for errors
3. Verify imports in route.ts

### Issue: "Charts not rendering, just blank spaces"
**Solution:**
1. Check data structure matches interfaces
2. Verify arrays have data (length > 0)
3. Check CSS imports for Recharts

### Issue: "Wrong scenario showing"
**Solution:**
1. Check URL has `?scenario=name`
2. Check scenario name matches export in analytics-test-scenarios.ts
3. Clear browser cache/reload

### Issue: "Dates are in past/future"
**Solution:**
1. Mock data uses relative dates
2. Dates automatically update daily
3. For specific dates, manually edit mock-analytics-data.ts

## Final Verification Signature

- [ ] All components working ___________
- [ ] All data accurate ___________
- [ ] All tests passing ___________
- [ ] Ready for production ___________

Date completed: ___________
Verified by: ___________

