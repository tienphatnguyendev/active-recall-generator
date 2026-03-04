import { Nav } from '@/components/nav';
import { createClient } from '@/utils/supabase/server';
import { AnalyticsClient, type AnalyticsData } from './analytics-client';
import { AnalyticsExportButton } from '@/components/analytics/analytics-export-button';

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  // If not authenticated, the middleware should handle the redirect,
  // but we add a safety check here.
  if (userError || !userData?.user) {
    return (
      <div className="min-h-screen bg-background">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Please log in to view analytics.
          </div>
        </main>
      </div>
    );
  }

  const [streakRes, weeklyRes, masteryRes] = await Promise.all([
    supabase.rpc('get_user_streak'),
    supabase.rpc('get_weekly_activity'),
    supabase.rpc('get_mastery_distribution'),
  ]);

  const errors = [
    streakRes.error && { rpc: 'get_user_streak', error: streakRes.error },
    weeklyRes.error && { rpc: 'get_weekly_activity', error: weeklyRes.error },
    masteryRes.error && { rpc: 'get_mastery_distribution', error: masteryRes.error },
  ].filter(Boolean) as { rpc: string; error: { code?: string; message: string } }[];

  errors.forEach(({ rpc, error }) => {
    console.error(`[analytics] RPC ${rpc} failed`, {
      code: error.code,
      message: error.message,
      hint: (error as any).hint,
      details: (error as any).details,
    });
  });

  const analyticsData: AnalyticsData = {
    stats: [
      {
        label: 'Cards reviewed',
        value: masteryRes.data?.totalCards || 0,
        trend: 'neutral',
      },
      {
        label: 'Cards mastered',
        value: masteryRes.data?.data?.find((d: { level: string; count: number }) => d.level === 'mastered')?.count || 0,
        trend: 'neutral',
      },
      {
        label: 'Study streak',
        value: streakRes.data?.currentStreak || 0,
        subValue: 'Days',
        trend: 'neutral',
      },
    ],
    streak: {
      currentStreak: streakRes.data?.currentStreak || 0,
      longestStreak: streakRes.data?.longestStreak || 0,
      studiedToday: streakRes.data?.studiedToday || false,
      recentDays: streakRes.data?.recentDays || [],
    },
    weeklyActivity: weeklyRes.data || [],
    masteryDistribution: {
      data: masteryRes.data?.data || [],
      totalCards: masteryRes.data?.totalCards || 0,
    },
    performanceByTopic: [], // TODO: Implement in future if needed
    artifacts: [], // TODO: Implement in future if needed
  };

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

        {errors.length > 0 && (
          <div className="mb-6 border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">Some analytics data could not be loaded.</p>
            {process.env.NODE_ENV === 'development' && (
              <ul className="mt-2 space-y-1 font-mono text-xs opacity-80">
                {errors.map(({ rpc, error }) => (
                  <li key={rpc}>{rpc}: [{error.code}] {error.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <AnalyticsClient data={analyticsData} />
      </main>
    </div>
  );
}
