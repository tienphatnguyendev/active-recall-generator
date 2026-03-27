import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { apiError } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return apiError('Unauthorized', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch study sessions for the authenticated user
    // Note: artifactId filtering is removed as study_sessions no longer joins to cards directly
    let query = supabase
      .from('study_sessions')
      .select('id, user_id, cards_studied, duration_seconds, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching study sessions:', error);
      throw error;
    }

    return NextResponse.json({
      sessions: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Get study sessions error:', error);
    return apiError('Internal server error', 500);
  }
}