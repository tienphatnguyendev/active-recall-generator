import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/artifacts/[id]/export?format=json|csv|pdf|anki
 *
 * Per-artifact export endpoint.
 * Currently returns stub data — replace with real DB queries once the
 * database integration is wired up.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format "${format}". Allowed: ${allowed.join(', ')}.` },
        { status: 400 }
      );
    }

    // TODO: Fetch artifact by `id` from the database and check ownership
    // before serialising. Return 404 if not found, 403 if not owned by the user.

    if (format === 'json') {
      const body = JSON.stringify({ id, qaPairs: [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="artifact-${id}.json"`,
        },
      });
    }

    if (format === 'csv') {
      const csv = 'question,answer,judgeScore\n';
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
