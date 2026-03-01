# Implementation Plan: C5 — Export API Routes Stub-Only with No Auth Verification

## Issue Summary

The export routes at `app/api/artifacts/export/route.ts` and `app/api/artifacts/[id]/export/route.ts` check for the presence of a Bearer token but never verify it with Supabase. Any request with a non-empty `Authorization` header receives a 200 OK. Additionally, both routes return empty stub data.

## Technical Approach

1. Add proper Supabase auth verification to both export routes
2. Implement real data fetching for the JSON and CSV formats
3. Add ownership verification for the per-artifact export
4. Return proper 404 for non-existent artifacts

## Implementation Steps

### Step 1: Update bulk export route (30 min)

**Dependencies**: C1 (SSR client pattern)

Update `app/api/artifacts/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  const allowed = ['json', 'csv'];
  if (!allowed.includes(format)) {
    return NextResponse.json(
      { error: `Unsupported format. Allowed: ${allowed.join(', ')}.` },
      { status: 400 }
    );
  }

  // Fetch real data
  const { data: artifacts, error } = await supabase
    .from('artifacts')
    .select('*, cards(*)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (format === 'json') {
    const body = JSON.stringify({ artifacts }, null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="artifacts-export.json"',
      },
    });
  }

  // CSV format
  const rows = (artifacts || []).flatMap(a =>
    (a.cards || []).map((c: any) =>
      `"${a.id}","${a.title}","${c.question}","${c.answer}",${c.judge_score ?? ''}`
    )
  );
  const csv = 'id,title,question,answer,judgeScore\n' + rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="artifacts-export.csv"',
    },
  });
}
```

### Step 2: Update per-artifact export route (20 min)

**Dependencies**: Step 1

Update `app/api/artifacts/[id]/export/route.ts` with the same auth pattern, plus ownership check via RLS (automatic since we query through the authenticated client).

### Step 3: Remove PDF/Anki stubs (5 min)

**Dependencies**: None

Remove the unsupported format handlers that return empty bytes. Only JSON and CSV should be allowed until real implementations exist.

### Step 4: Test (15 min)

**Dependencies**: Steps 1–3

1. Export all artifacts as JSON → verify real data in downloaded file
2. Export all artifacts as CSV → verify columns and rows
3. Export single artifact by ID → verify correct artifact data
4. Try with invalid/missing auth → verify 401
5. Try non-existent artifact ID → verify 404

## Acceptance Criteria

- [ ] Both export routes verify auth via `supabase.auth.getUser()`
- [ ] Export routes return real artifact data from Supabase
- [ ] Per-artifact route returns 404 for non-existent artifacts
- [ ] Unsupported formats return 400
- [ ] Unauthenticated requests return 401

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Large exports hit memory limits | Medium | Add pagination/streaming for large datasets |
| CSV injection via user content | Low | Wrap all CSV values in double-quotes, escape internal quotes |

**Rollback**: Revert to stub implementations.

## Resources Required

- **Team**: 1 frontend developer
- **Time**: ~70 minutes
- **Dependencies**: C1 should be completed first for consistent client usage
