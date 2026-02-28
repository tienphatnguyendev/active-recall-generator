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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { artifactId, mode, duration, results } = await request.json();

    if (!artifactId || !mode) {
      return NextResponse.json(
        { error: 'Artifact ID and mode are required' },
        { status: 400 }
      );
    }

    // Process results to insert into study_sessions
    // and update cards FSRS fields if provided.
    // results is an array of objects like: { cardId: 'uuid', rating: 3, duration_ms: 5000, state_before: 0, state_after: 1 }
    if (results && results.length > 0) {
      const sessionRecords = results.map((r: any) => ({
        user_id: userData.user.id,
        card_id: r.cardId,
        rating: r.rating || 3,
        duration_ms: r.duration_ms || duration || 0,
        state_before: r.state_before || 0,
        state_after: r.state_after || 0,
        reviewed_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('study_sessions')
        .insert(sessionRecords);

      if (insertError) {
        console.error('Error inserting study sessions:', insertError);
        throw insertError;
      }
      
      // Update cards FSRS state
      for (const r of results) {
        if (r.cardId && r.fsrs) {
           await supabase
             .from('cards')
             .update({
               fsrs_state: r.fsrs.state || r.state_after || 0,
               fsrs_due: r.fsrs.due || new Date().toISOString(),
               fsrs_stability: r.fsrs.stability || 0,
               fsrs_difficulty: r.fsrs.difficulty || 0,
               fsrs_elapsed_days: r.fsrs.elapsed_days || 0,
               fsrs_scheduled_days: r.fsrs.scheduled_days || 0,
               fsrs_reps: r.fsrs.reps || 0,
               fsrs_lapses: r.fsrs.lapses || 0,
               updated_at: new Date().toISOString()
             })
             .eq('id', r.cardId);
        }
      }
    }

    return NextResponse.json(
      {
        id: 'session-' + Date.now(),
        artifactId: artifactId,
        mode: mode,
        duration: duration || 0,
        results: results,
        completedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create study session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
