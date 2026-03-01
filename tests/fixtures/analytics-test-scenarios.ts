import type { AnalyticsData } from './mock-analytics-data';
import type { MasteryLevel } from '@/components/study/mastery-badge';

/**
 * Analytics Test Scenarios
 * 
 * Pre-built analytics data for testing different user states and edge cases.
 * Use these to test how the dashboard handles various learning progress patterns.
 */

/**
 * Scenario: Brand New User (Day 1)
 * - Just created first artifact
 * - No study sessions yet
 * - All cards in "new" state
 */
export const NEW_USER_SCENARIO: AnalyticsData = {
  stats: [
    {
      label: 'Cards created',
      value: 15,
      subValue: 'From 1 artifact',
      trend: 'neutral',
      trendValue: 'First day',
    },
    {
      label: 'Cards mastered',
      value: 0,
      subValue: '0% of total',
      trend: 'neutral',
      trendValue: 'Not started',
    },
    {
      label: 'Study streak',
      value: 0,
      subValue: 'Days',
      trend: 'neutral',
      trendValue: 'Start today!',
    },
    {
      label: 'Avg. accuracy',
      value: '0%',
      subValue: 'No sessions yet',
      trend: 'neutral',
      trendValue: 'Take first session',
    },
  ],
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    studiedToday: false,
    recentDays: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      studied: false,
    })),
  },
  weeklyActivity: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    cardsStudied: 0,
    sessionCount: 0,
  })),
  masteryDistribution: {
    data: [
      { level: 'new', count: 15 },
      { level: 'learning', count: 0 },
      { level: 'reviewing', count: 0 },
      { level: 'mastered', count: 0 },
    ],
    totalCards: 15,
  },
  performanceByTopic: [],
  artifacts: [
    {
      artifactId: 'art-new-001',
      section: 'Introduction to Strategy',
      source: 'Business Strategy 101',
      mastery: 'new',
      studyTimeline: [],
      weakAreas: [],
      nextSessionSuggestion: 'Start your first study session! Begin with the basics and take it one question at a time.',
    },
  ],
};

/**
 * Scenario: Casual Learner (Inconsistent 2-week history)
 * - Studies 2-3 times per week
 * - Mixed progression through cards
 * - Some completed, mostly in progress
 */
export const CASUAL_LEARNER_SCENARIO: AnalyticsData = {
  stats: [
    {
      label: 'Cards reviewed',
      value: 124,
      subValue: '+8 this week',
      trend: 'up',
      trendValue: '+6%',
    },
    {
      label: 'Cards mastered',
      value: 18,
      subValue: '14% of total',
      trend: 'up',
      trendValue: '+2%',
    },
    {
      label: 'Study streak',
      value: 1,
      subValue: 'Days',
      trend: 'down',
      trendValue: '-5 days',
    },
    {
      label: 'Avg. accuracy',
      value: '58%',
      subValue: 'Still learning',
      trend: 'neutral',
      trendValue: '±0%',
    },
  ],
  streak: {
    currentStreak: 1,
    longestStreak: 6,
    studiedToday: true,
    recentDays: [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: true },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: true },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date().toISOString().split('T')[0], studied: true },
    ],
  },
  weeklyActivity: [
    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 22, sessionCount: 1 },
    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 18, sessionCount: 1 },
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date().toISOString().split('T')[0], cardsStudied: 25, sessionCount: 2 },
  ],
  masteryDistribution: {
    data: [
      { level: 'mastered', count: 18 },
      { level: 'reviewing', count: 35 },
      { level: 'learning', count: 55 },
      { level: 'new', count: 16 },
    ],
    totalCards: 124,
  },
  performanceByTopic: [
    {
      topic: 'Basic Concepts',
      source: 'Strategy 101',
      totalCards: 28,
      knownPct: 36,
      unsurePct: 39,
      unknownPct: 25,
    },
    {
      topic: 'Advanced Frameworks',
      source: 'Strategy 201',
      totalCards: 35,
      knownPct: 46,
      unsurePct: 31,
      unknownPct: 23,
    },
  ],
  artifacts: [
    {
      artifactId: 'art-casual-001',
      section: 'Porter Five Forces',
      source: 'Strategy 101',
      mastery: 'learning',
      studyTimeline: [
        { date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'unknown' },
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'unsure' },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'know' },
      ],
      weakAreas: [
        {
          question: 'What are the five forces?',
          timesUnknown: 2,
          lastAttempted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      ],
      nextSessionSuggestion: 'Keep practicing. You\'re making progress on Porter\'s framework.',
    },
  ],
};

/**
 * Scenario: Dedicated Learner (90-day consistent study)
 * - Daily or near-daily study
 * - High mastery rate
 * - Long active streak
 * - Advanced learning phase
 */
export const DEDICATED_LEARNER_SCENARIO: AnalyticsData = {
  stats: [
    {
      label: 'Cards reviewed',
      value: 856,
      subValue: '+127 this week',
      trend: 'up',
      trendValue: '+18%',
    },
    {
      label: 'Cards mastered',
      value: 412,
      subValue: '48% of total',
      trend: 'up',
      trendValue: '+15%',
    },
    {
      label: 'Study streak',
      value: 67,
      subValue: 'Days',
      trend: 'up',
      trendValue: '+1 day',
    },
    {
      label: 'Avg. accuracy',
      value: '84%',
      subValue: '+12% vs 30 days ago',
      trend: 'up',
      trendValue: '+8%',
    },
  ],
  streak: {
    currentStreak: 67,
    longestStreak: 87,
    studiedToday: true,
    recentDays: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      studied: true, // All days studied
    })),
  },
  weeklyActivity: Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    cardsStudied: Math.floor(Math.random() * 40) + 35, // 35-75 cards daily
    sessionCount: 2,
  })),
  masteryDistribution: {
    data: [
      { level: 'mastered', count: 412 },
      { level: 'reviewing', count: 289 },
      { level: 'learning', count: 128 },
      { level: 'new', count: 27 },
    ],
    totalCards: 856,
  },
  performanceByTopic: [
    {
      topic: 'Strategic Planning',
      source: 'McKinsey Growth Framework',
      totalCards: 45,
      knownPct: 91,
      unsurePct: 7,
      unknownPct: 2,
    },
    {
      topic: 'Market Analysis',
      source: 'McKinsey Growth Framework',
      totalCards: 52,
      knownPct: 88,
      unsurePct: 10,
      unknownPct: 2,
    },
    {
      topic: 'Digital Transformation',
      source: 'Digital Strategy 2024',
      totalCards: 38,
      knownPct: 71,
      unsurePct: 21,
      unknownPct: 8,
    },
    {
      topic: 'Change Management',
      source: 'Digital Strategy 2024',
      totalCards: 29,
      knownPct: 62,
      unsurePct: 28,
      unknownPct: 10,
    },
  ],
  artifacts: [
    {
      artifactId: 'art-dedicated-001',
      section: 'Five Forces Analysis',
      source: 'Porter Competitive Advantage',
      mastery: 'mastered',
      studyTimeline: Array.from({ length: 28 }, (_, i) => ({
        date: new Date(Date.now() - (27 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        rating: i < 10 ? 'unknown' : i < 20 ? 'unsure' : 'know',
      })),
      weakAreas: [],
      nextSessionSuggestion: 'Excellent mastery! Consider teaching others this concept to deepen understanding.',
    },
    {
      artifactId: 'art-dedicated-002',
      section: 'Business Model Canvas',
      source: 'Osterwalder Value Proposition',
      mastery: 'reviewing',
      studyTimeline: Array.from({ length: 21 }, (_, i) => ({
        date: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        rating: i < 8 ? 'unknown' : i < 15 ? 'unsure' : 'know',
      })),
      weakAreas: [
        {
          question: 'How do you identify key partners?',
          timesUnknown: 1,
          lastAttempted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
      ],
      nextSessionSuggestion: 'Strong progress. One minor weak area remains. Review key partners section once more.',
    },
  ],
};

/**
 * Scenario: Struggling Learner (Needs help)
 * - Low mastery rate
 * - Multiple weak areas
 * - Recently started
 * - May need different study approach
 */
export const STRUGGLING_LEARNER_SCENARIO: AnalyticsData = {
  stats: [
    {
      label: 'Cards reviewed',
      value: 87,
      subValue: '+12 this week',
      trend: 'up',
      trendValue: '+16%',
    },
    {
      label: 'Cards mastered',
      value: 8,
      subValue: '9% of total',
      trend: 'down',
      trendValue: '-2%',
    },
    {
      label: 'Study streak',
      value: 3,
      subValue: 'Days',
      trend: 'up',
      trendValue: '+3 days',
    },
    {
      label: 'Avg. accuracy',
      value: '42%',
      subValue: 'Below target',
      trend: 'down',
      trendValue: '-3%',
    },
  ],
  streak: {
    currentStreak: 3,
    longestStreak: 5,
    studiedToday: false,
    recentDays: [
      { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: true },
      { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: true },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: true },
      { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], studied: false },
      { date: new Date().toISOString().split('T')[0], studied: false },
    ],
  },
  weeklyActivity: [
    { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 15, sessionCount: 1 },
    { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 12, sessionCount: 1 },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 18, sessionCount: 1 },
    { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
    { date: new Date().toISOString().split('T')[0], cardsStudied: 0, sessionCount: 0 },
  ],
  masteryDistribution: {
    data: [
      { level: 'mastered', count: 8 },
      { level: 'reviewing', count: 18 },
      { level: 'learning', count: 35 },
      { level: 'new', count: 26 },
    ],
    totalCards: 87,
  },
  performanceByTopic: [
    {
      topic: 'Strategic Frameworks',
      source: 'Strategy 101',
      totalCards: 28,
      knownPct: 28,
      unsurePct: 39,
      unknownPct: 33,
    },
    {
      topic: 'Financial Concepts',
      source: 'Finance Fundamentals',
      totalCards: 22,
      knownPct: 32,
      unsurePct: 36,
      unknownPct: 32,
    },
    {
      topic: 'Analysis Tools',
      source: 'Strategy 101',
      totalCards: 37,
      knownPct: 22,
      unsurePct: 43,
      unknownPct: 35,
    },
  ],
  artifacts: [
    {
      artifactId: 'art-struggling-001',
      section: 'Strategic Frameworks',
      source: 'Strategy 101',
      mastery: 'learning',
      studyTimeline: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'unknown' },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'unknown' },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rating: 'unsure' },
      ],
      weakAreas: [
        {
          question: 'What is SWOT analysis?',
          timesUnknown: 4,
          lastAttempted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
        {
          question: 'How do you apply Porter Five Forces?',
          timesUnknown: 3,
          lastAttempted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
        {
          question: 'What is a value proposition?',
          timesUnknown: 2,
          lastAttempted: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        },
      ],
      nextSessionSuggestion:
        'Multiple weak areas detected. Recommend: (1) Review SWOT with visual examples, (2) Study one framework at a time, (3) Apply to real company examples.',
    },
  ],
};

/**
 * Map of all test scenarios for easy access
 */
export const ANALYTICS_SCENARIOS = {
  newUser: NEW_USER_SCENARIO,
  casualLearner: CASUAL_LEARNER_SCENARIO,
  dedicatedLearner: DEDICATED_LEARNER_SCENARIO,
  strugglingLearner: STRUGGLING_LEARNER_SCENARIO,
} as const;

/**
 * Type for scenario keys
 */
export type AnalyticsScenarioKey = keyof typeof ANALYTICS_SCENARIOS;
