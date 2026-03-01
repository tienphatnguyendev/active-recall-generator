import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { apiError } from '@/lib/api-errors';
import { parseArtifactDisplay } from '@/lib/artifact-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('Unauthorized', 401);
    }

    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return apiError(`Unsupported format "${format}". Allowed: ${allowed.join(', ')}.`, 400);
    }

    // Fetch real artifacts for the authenticated user
    const { data: artifacts, error: fetchError } = await supabase
      .from('artifacts')
      .select('id, title, source_hash, created_at, cards(id, question, answer, judge_score)')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching artifacts for export:', fetchError);
      return apiError('Failed to fetch artifacts', 500);
    }

    if (format === 'json') {
      const body = JSON.stringify({ artifacts: artifacts || [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="artifacts-export.json"',
        },
      });
    }

    if (format === 'csv') {
      let csv = 'artifact_id,source,section,question,answer,judge_score\n';
      for (const artifact of (artifacts || [])) {
        for (const card of (artifact.cards || [])) {
          // Escape fields containing commas or quotes
          const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
          const { source, section } = parseArtifactDisplay(artifact.title, artifact.source_hash);
          csv += `${artifact.id},${escape(source)},${escape(section)},${escape(card.question)},${escape(card.answer)},${card.judge_score ?? ''}\n`;
        }
      }
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="artifacts-export.csv"',
        },
      });
    }

    // pdf / anki — return empty placeholder bytes (TODO: implement real export)
    return new NextResponse(new Uint8Array(), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="artifacts-export.${format === 'anki' ? 'apkg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Artifacts bulk export error:', error);
    return apiError('Internal server error', 500);
  }
}
