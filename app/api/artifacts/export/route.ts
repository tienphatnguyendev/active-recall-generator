import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/artifacts/export?format=json|csv|pdf|anki
 *
 * Bulk export endpoint for all of the authenticated user's artifacts.
 * Currently returns stub data — replace with real DB queries once the
 * database integration is wired up.
 *
 * This route MUST be defined before the [id] dynamic segment so Next.js
 * matches /api/artifacts/export before /api/artifacts/[id].
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    const allowed = ['json', 'csv', 'pdf', 'anki'];

    if (!allowed.includes(format)) {
      return NextResponse.json(
        { error: `Unsupported format "${format}". Allowed: ${allowed.join(', ')}.` },
        { status: 400 }
      );
    }

    // TODO: Fetch all user artifacts from the database and serialise them
    // in the requested format. For now return an empty-but-valid payload so
    // the export button receives a 200 and can trigger a download.

    if (format === 'json') {
      const body = JSON.stringify({ artifacts: [] }, null, 2);
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="artifacts-export.json"',
        },
      });
    }

    if (format === 'csv') {
      const csv = 'id,source,section,question,answer,judgeScore\n';
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="artifacts-export.csv"',
        },
      });
    }

    // pdf / anki — return empty placeholder bytes
    return new NextResponse(new Uint8Array(), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="artifacts-export.${format === 'anki' ? 'apkg' : format}"`,
      },
    });
  } catch (error) {
    console.error('Artifacts bulk export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
