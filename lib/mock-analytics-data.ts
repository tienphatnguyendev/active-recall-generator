import type { MasteryLevel } from '@/components/study/mastery-badge';

/**
 * Comprehensive mock analytics data for the analytics dashboard
 * Provides realistic learning metrics across multiple dimensions
 */

// Type definitions matching the AnalyticsData interface
export interface AnalyticsData {
  stats: {
    label: string;
    value: string | number;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }[];
  streak: {
    currentStreak: number;
    longestStreak: number;
    studiedToday: boolean;
    recentDays: { date: string; studied: boolean }[];
  };
  weeklyActivity: { date: string; cardsStudied: number; sessionCount: number }[];
  masteryDistribution: {
    data: { level: MasteryLevel; count: number }[];
    totalCards: number;
  };
  performanceByTopic: {
    topic: string;
    source: string;
    totalCards: number;
    knownPct: number;
    unsurePct: number;
    unknownPct: number;
  }[];
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

/**
 * Helper function to generate dates for the past N days
 */
function generatePastDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Helper function to generate recent days activity (7 days)
 */
function generateRecentDaysActivity(currentStreak: number): { date: string; studied: boolean }[] {
  const dates = generatePastDates(7);
  return dates.map((date, index) => {
    // Current streak means consecutive days at the end
    const daysFromEnd = 6 - index;
    return {
      date,
      studied: daysFromEnd < currentStreak,
    };
  });
}

/**
 * Helper to generate weekly activity data
 */
function generateWeeklyActivity(): { date: string; cardsStudied: number; sessionCount: number }[] {
  const dates = generatePastDates(7);
  return dates.map((date) => ({
    date,
    cardsStudied: Math.floor(Math.random() * 45) + 10, // 10-55 cards per day
    sessionCount: Math.floor(Math.random() * 3) + 1, // 1-3 sessions per day
  }));
}

/**
 * Helper to generate study timeline for an artifact
 */
function generateStudyTimeline(dayCount: number = 14): { date: string; rating: 'know' | 'unsure' | 'unknown' }[] {
  const dates = generatePastDates(dayCount);
  return dates.map((date) => {
    const rand = Math.random();
    return {
      date,
      rating: rand > 0.7 ? 'know' : rand > 0.35 ? 'unsure' : 'unknown',
    };
  });
}

/**
 * Main mock analytics data
 */
export const MOCK_ANALYTICS_DATA: AnalyticsData = {
  stats: [
    {
      label: 'Cards reviewed',
      value: 342,
      subValue: '+14 this week',
      trend: 'up',
      trendValue: '+8%',
    },
    {
      label: 'Cards mastered',
      value: 87,
      subValue: '25% of total',
      trend: 'up',
      trendValue: '+12%',
    },
    {
      label: 'Study streak',
      value: 23,
      subValue: 'Days',
      trend: 'up',
      trendValue: '3 days',
    },
    {
      label: 'Avg. accuracy',
      value: '71%',
      subValue: '+4% vs 2 weeks ago',
      trend: 'up',
      trendValue: '+4%',
    },
  ],

  streak: {
    currentStreak: 23,
    longestStreak: 45,
    studiedToday: true,
    recentDays: generateRecentDaysActivity(23),
  },

  weeklyActivity: generateWeeklyActivity(),

  masteryDistribution: {
    data: [
      { level: 'mastered', count: 87 },
      { level: 'reviewing', count: 142 },
      { level: 'learning', count: 89 },
      { level: 'new', count: 24 },
    ],
    totalCards: 342,
  },

  performanceByTopic: [
    {
      topic: 'Strategic Planning',
      source: 'Case Study: McKinsey Growth Framework',
      totalCards: 28,
      knownPct: 43,
      unsurePct: 32,
      unknownPct: 25,
    },
    {
      topic: 'Financial Analysis',
      source: 'Case Study: McKinsey Growth Framework',
      totalCards: 24,
      knownPct: 58,
      unsurePct: 25,
      unknownPct: 17,
    },
    {
      topic: 'Market Dynamics',
      source: 'Case Study: McKinsey Growth Framework',
      totalCards: 19,
      knownPct: 68,
      unsurePct: 21,
      unknownPct: 11,
    },
    {
      topic: 'Value Creation',
      source: 'Case Study: McKinsey Growth Framework',
      totalCards: 31,
      knownPct: 77,
      unsurePct: 16,
      unknownPct: 7,
    },
    {
      topic: 'Problem-Solving Frameworks',
      source: 'The Art of Problem Solving',
      totalCards: 22,
      knownPct: 82,
      unsurePct: 14,
      unknownPct: 4,
    },
    {
      topic: 'Data Interpretation',
      source: 'The Art of Problem Solving',
      totalCards: 26,
      knownPct: 73,
      unsurePct: 19,
      unknownPct: 8,
    },
    {
      topic: 'Competitive Strategy',
      source: 'Porter\'s Competitive Advantage',
      totalCards: 35,
      knownPct: 86,
      unsurePct: 11,
      unknownPct: 3,
    },
    {
      topic: 'Organizational Alignment',
      source: 'Porter\'s Competitive Advantage',
      totalCards: 28,
      knownPct: 64,
      unsurePct: 25,
      unknownPct: 11,
    },
    {
      topic: 'Digital Transformation',
      source: 'Digital Strategy in 2024',
      totalCards: 33,
      knownPct: 45,
      unsurePct: 36,
      unknownPct: 19,
    },
  ],

  artifacts: [
    {
      artifactId: 'art-001',
      section: 'Market Entry Strategy',
      source: 'Case Study: McKinsey Growth Framework',
      mastery: 'reviewing',
      studyTimeline: generateStudyTimeline(14),
      weakAreas: [
        {
          question: 'What are the three key pillars of market entry?',
          timesUnknown: 3,
          lastAttempted: '2024-01-18',
        },
        {
          question: 'How do you calculate addressable market size?',
          timesUnknown: 2,
          lastAttempted: '2024-01-16',
        },
      ],
      nextSessionSuggestion:
        'Focus on market sizing methodologies. You\'ve attempted 5 times but need clarity on TAM vs SAM vs SOM.',
    },
    {
      artifactId: 'art-002',
      section: 'Value Chain Analysis',
      source: 'Porter\'s Competitive Advantage',
      mastery: 'mastered',
      studyTimeline: generateStudyTimeline(21),
      weakAreas: [],
      nextSessionSuggestion: 'Review this topic in 7 days to maintain mastery. Consider teaching it to reinforce learning.',
    },
    {
      artifactId: 'art-003',
      section: 'Digital Transformation Roadmap',
      source: 'Digital Strategy in 2024',
      mastery: 'learning',
      studyTimeline: generateStudyTimeline(8),
      weakAreas: [
        {
          question: 'What is the difference between digitization and digital transformation?',
          timesUnknown: 4,
          lastAttempted: '2024-01-19',
        },
        {
          question: 'How do you measure digital maturity?',
          timesUnknown: 3,
          lastAttempted: '2024-01-17',
        },
        {
          question: 'What are the key change management considerations?',
          timesUnknown: 2,
          lastAttempted: '2024-01-14',
        },
      ],
      nextSessionSuggestion:
        'Dedicate next session to change management frameworks. This is a critical gap based on your study history.',
    },
    {
      artifactId: 'art-004',
      section: 'Hypothesis-Driven Problem Solving',
      source: 'The Art of Problem Solving',
      mastery: 'mastered',
      studyTimeline: generateStudyTimeline(28),
      weakAreas: [],
      nextSessionSuggestion: 'Excellent performance. Consider applying this framework to real case problems.',
    },
    {
      artifactId: 'art-005',
      section: 'Financial Modeling Basics',
      source: 'Case Study: McKinsey Growth Framework',
      mastery: 'reviewing',
      studyTimeline: generateStudyTimeline(12),
      weakAreas: [
        {
          question: 'How do you build a 3-statement model?',
          timesUnknown: 2,
          lastAttempted: '2024-01-17',
        },
      ],
      nextSessionSuggestion:
        'Practice more complex modeling scenarios. Your fundamentals are solid—time to advance to scenario analysis.',
    },
    {
      artifactId: 'art-006',
      section: 'Customer Journey Mapping',
      source: 'Digital Strategy in 2024',
      mastery: 'new',
      studyTimeline: generateStudyTimeline(3),
      weakAreas: [
        {
          question: 'What are the touchpoints in a customer journey?',
          timesUnknown: 2,
          lastAttempted: '2024-01-19',
        },
        {
          question: 'How do you identify pain points?',
          timesUnknown: 1,
          lastAttempted: '2024-01-18',
        },
        {
          question: 'What metrics measure customer satisfaction?',
          timesUnknown: 3,
          lastAttempted: '2024-01-17',
        },
      ],
      nextSessionSuggestion:
        'New material. Build foundational understanding through visual mapping exercises. Create 2-3 example journeys.',
    },
  ],
};

/**
 * Generate random analytics data for testing
 * Useful for testing different data scenarios
 */
export function generateRandomAnalyticsData(): AnalyticsData {
  const masteredCount = Math.floor(Math.random() * 150) + 30;
  const reviewingCount = Math.floor(Math.random() * 200) + 80;
  const learningCount = Math.floor(Math.random() * 150) + 50;
  const newCount = Math.floor(Math.random() * 100) + 10;
  const totalCards = masteredCount + reviewingCount + learningCount + newCount;

  const currentStreak = Math.floor(Math.random() * 60) + 1;

  return {
    stats: [
      {
        label: 'Cards reviewed',
        value: totalCards,
        subValue: `+${Math.floor(Math.random() * 30)} this week`,
        trend: Math.random() > 0.3 ? 'up' : 'down',
        trendValue: `${Math.random() > 0.5 ? '+' : '-'}${Math.floor(Math.random() * 20)}%`,
      },
      {
        label: 'Cards mastered',
        value: masteredCount,
        subValue: `${Math.round((masteredCount / totalCards) * 100)}% of total`,
        trend: 'up',
        trendValue: `+${Math.floor(Math.random() * 15)}%`,
      },
      {
        label: 'Study streak',
        value: currentStreak,
        subValue: 'Days',
        trend: Math.random() > 0.4 ? 'up' : 'neutral',
        trendValue: `${Math.floor(Math.random() * 10)} days`,
      },
      {
        label: 'Avg. accuracy',
        value: `${Math.floor(Math.random() * 30) + 60}%`,
        subValue: `+${Math.floor(Math.random() * 10)}% vs 2 weeks ago`,
        trend: 'up',
        trendValue: `+${Math.floor(Math.random() * 10)}%`,
      },
    ],
    streak: {
      currentStreak,
      longestStreak: currentStreak + Math.floor(Math.random() * 40),
      studiedToday: Math.random() > 0.2,
      recentDays: generateRecentDaysActivity(currentStreak),
    },
    weeklyActivity: generateWeeklyActivity(),
    masteryDistribution: {
      data: [
        { level: 'mastered', count: masteredCount },
        { level: 'reviewing', count: reviewingCount },
        { level: 'learning', count: learningCount },
        { level: 'new', count: newCount },
      ],
      totalCards,
    },
    performanceByTopic: [
      {
        topic: 'Topic A',
        source: 'Source 1',
        totalCards: 20,
        knownPct: 65,
        unsurePct: 25,
        unknownPct: 10,
      },
      {
        topic: 'Topic B',
        source: 'Source 1',
        totalCards: 25,
        knownPct: 45,
        unsurePct: 35,
        unknownPct: 20,
      },
      {
        topic: 'Topic C',
        source: 'Source 2',
        totalCards: 30,
        knownPct: 80,
        unsurePct: 15,
        unknownPct: 5,
      },
    ],
    artifacts: [],
  };
}

/**
 * Minimal mock data for testing empty/loading states
 */
export const MINIMAL_MOCK_DATA: AnalyticsData = {
  stats: [],
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    studiedToday: false,
    recentDays: [],
  },
  weeklyActivity: [],
  masteryDistribution: {
    data: [],
    totalCards: 0,
  },
  performanceByTopic: [],
  artifacts: [],
};
