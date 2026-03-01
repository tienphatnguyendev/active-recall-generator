'use client';

import { StatsOverview } from '@/components/analytics/stats-overview';
import { StreakWidget } from '@/components/analytics/streak-widget';
import { WeeklyActivityChart } from '@/components/analytics/weekly-activity-chart';
import { MasteryDistributionChart } from '@/components/analytics/mastery-distribution-chart';
import { PerformanceByTopic } from '@/components/analytics/performance-by-topic';
import { ArtifactProgressDetail } from '@/components/analytics/artifact-progress-detail';
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';
import type { MasteryLevel } from '@/components/study/mastery-badge';

export interface AnalyticsData {
  stats: { label: string; value: string | number; subValue?: string; trend?: "up" | "down" | "neutral"; trendValue?: string }[];
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
  performanceByTopic: { topic: string; source: string; totalCards: number; knownPct: number; unsurePct: number; unknownPct: number }[];
  artifacts: {
    artifactId: string;
    section: string;
    source: string;
    mastery: MasteryLevel;
    studyTimeline: { date: string; rating: "know" | "unsure" | "unknown" }[];
    weakAreas: { question: string; timesUnknown: number; lastAttempted: string }[];
    nextSessionSuggestion: string;
  }[];
}

interface AnalyticsClientProps {
  data: AnalyticsData;
}

export function AnalyticsClient({ data }: AnalyticsClientProps) {
  return (
    <div className="space-y-6">
      {/* Stats Overview Row */}
      <StatsOverview stats={data.stats} />

      {/* Streak and Activity Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StreakWidget
          currentStreak={data.streak.currentStreak}
          longestStreak={data.streak.longestStreak}
          studiedToday={data.streak.studiedToday}
          recentDays={data.streak.recentDays}
        />
        <div className="md:col-span-2">
          <WeeklyActivityChart data={data.weeklyActivity} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MasteryDistributionChart
          data={data.masteryDistribution.data}
          totalCards={data.masteryDistribution.totalCards}
        />
        <PerformanceByTopic topics={data.performanceByTopic} />
      </div>

      {/* Detailed Progress Section */}
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground">
          Artifact progress
        </p>
        <div className="space-y-8">
          {data.artifacts.map((artifact) => (
            <ArtifactProgressDetail
              key={artifact.artifactId}
              artifactId={artifact.artifactId}
              section={artifact.section}
              source={artifact.source}
              mastery={artifact.mastery}
              studyTimeline={artifact.studyTimeline}
              weakAreas={artifact.weakAreas}
              nextSessionSuggestion={artifact.nextSessionSuggestion}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
