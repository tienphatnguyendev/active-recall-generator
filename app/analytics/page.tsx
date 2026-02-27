'use client';

import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { StatsOverview } from '@/components/analytics/stats-overview';
import { StreakWidget } from '@/components/analytics/streak-widget';
import { WeeklyActivityChart } from '@/components/analytics/weekly-activity-chart';
import { MasteryDistributionChart } from '@/components/analytics/mastery-distribution-chart';
import { PerformanceByTopic } from '@/components/analytics/performance-by-topic';
import { ArtifactProgressDetail } from '@/components/analytics/artifact-progress-detail';
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';
import { Skeleton } from '@/components/ui/skeletons';
import type { MasteryLevel } from '@/components/study/mastery-badge';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AnalyticsData {
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

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/analytics');
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalyticsData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAnalyticsData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 border-l-4 border-primary pl-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
            Analytics
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
            Learning analytics dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your progress, identify weak areas, and optimize your study strategy.
          </p>
        </div>

        <div className="mb-6 flex justify-end">
          <AnalyticsExportButton />
        </div>

        {error && (
          <div className="mb-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-80" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-6">
            {/* Stats Overview Row */}
            <StatsOverview stats={analyticsData.stats} />

            {/* Streak and Activity Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StreakWidget
                currentStreak={analyticsData.streak.currentStreak}
                longestStreak={analyticsData.streak.longestStreak}
                studiedToday={analyticsData.streak.studiedToday}
                recentDays={analyticsData.streak.recentDays}
              />
              <div className="md:col-span-2">
                <WeeklyActivityChart data={analyticsData.weeklyActivity} />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MasteryDistributionChart
                data={analyticsData.masteryDistribution.data}
                totalCards={analyticsData.masteryDistribution.totalCards}
              />
              <PerformanceByTopic topics={analyticsData.performanceByTopic} />
            </div>

            {/* Detailed Progress Section */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-foreground">
                Artifact progress
              </p>
              <div className="space-y-8">
                {analyticsData.artifacts.map((artifact) => (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No analytics data available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start creating artifacts and studying to see your progress.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
