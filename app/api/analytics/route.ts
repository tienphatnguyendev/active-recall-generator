import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userData.user.id;

    const [streakRes, weeklyRes, masteryRes] = await Promise.all([
      supabase.rpc('get_user_streak', { p_user_id: userId }),
      supabase.rpc('get_weekly_activity', { p_user_id: userId }),
      supabase.rpc('get_mastery_distribution', { p_user_id: userId })
    ]);

    if (streakRes.error) console.error('Error fetching streak:', streakRes.error);
    if (weeklyRes.error) console.error('Error fetching weekly activity:', weeklyRes.error);
    if (masteryRes.error) console.error('Error fetching mastery distribution:', masteryRes.error);

    const analyticsData = {
      stats: [
        {
          label: 'Cards reviewed',
          value: masteryRes.data?.totalCards || 0,
          trend: 'neutral',
        },
        {
          label: 'Cards mastered',
          value: masteryRes.data?.data?.find((d: any) => d.level === 'mastered')?.count || 0,
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

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
