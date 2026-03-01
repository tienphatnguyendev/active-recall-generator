import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const artifactId = searchParams.get('artifactId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('study_sessions')
      .select('*, cards!inner(*)')
      .eq('user_id', userData.user.id)
      .order('reviewed_at', { ascending: false })
      .limit(limit);

    if (artifactId) {
      query = query.eq('cards.artifact_id', artifactId);
    }

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
