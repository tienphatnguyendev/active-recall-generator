'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-context';
import { StatsOverview } from '@/components/analytics/stats-overview';
import { StreakWidget } from '@/components/analytics/streak-widget';
import { WeeklyActivityChart } from '@/components/analytics/weekly-activity-chart';
import { MasteryDistributionChart } from '@/components/analytics/mastery-distribution-chart';
import { PerformanceByTopic } from '@/components/analytics/performance-by-topic';
import { ArtifactProgressDetail } from '@/components/analytics/artifact-progress-detail';
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';
import { Skeleton } from '@/components/ui/skeletons';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please log in to view analytics.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your learning progress and performance metrics
            </p>
          </div>
          <AnalyticsExportButton analyticsData={analyticsData} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
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
            <StatsOverview data={analyticsData.stats} />

            {/* Streak and Activity Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StreakWidget streak={analyticsData.streak} />
              <div className="md:col-span-2">
                <WeeklyActivityChart data={analyticsData.weeklyActivity} />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MasteryDistributionChart data={analyticsData.masteryDistribution} />
              <PerformanceByTopic data={analyticsData.performanceByTopic} />
            </div>

            {/* Detailed Progress Section */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Artifact Progress</h2>
              <ArtifactProgressDetail artifacts={analyticsData.artifacts} />
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
      </div>
    </main>
  );
}
