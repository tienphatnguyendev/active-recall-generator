import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { apiError } from '@/lib/api-errors';
import { parseArtifactDisplay } from '@/lib/artifact-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError('Unauthorized', 401);
    }

    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return apiError(`Unsupported format "${format}". Allowed: ${allowed.join(', ')}.`, 400);
    }

    // Fetch artifact by ID — RLS ensures user can only access their own
    const { data: artifact, error: fetchError } = await supabase
      .from('artifacts')
      .select('id, title, source_hash, created_at, cards(id, front, back)')
      .eq('id', id)
      .single();

    if (fetchError || !artifact) {
      return apiError('Artifact not found', 404);
    }

    if (format === 'json') {
      const { source, section } = parseArtifactDisplay(artifact.title, artifact.source_hash);
      const body = JSON.stringify({ id: artifact.id, source, section, qaPairs: artifact.cards || [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="artifact-${id}.json"`,
        },
      });
    }

    if (format === 'csv') {
      let csv = 'front,back\n';
      for (const card of (artifact.cards || [])) {
        const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
        csv += `${escape(card.front)},${escape(card.back)}\n`;
      }
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="artifact-${id}.csv"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="artifact-${id}.${format === 'anki' ? 'apkg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Artifact export error:', error);
    return apiError('Internal server error', 500);
  }
}
