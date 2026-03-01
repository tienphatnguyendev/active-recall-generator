# Study Mastery Loop -- Full Design Document

**Status:** DESIGN COMPLETE  
**Spec source:** `STUDY_UX_SPEC.md`  
**Date:** 2026-03-01

---

## A) UX Upgrades Per Phase

### Phase 1 -- Brief

**Layout**
- Fullscreen centered column, `max-w-2xl mx-auto`, `px-4 sm:px-6 py-8 sm:py-10` (matches existing study-client spacing).
- Top chrome: sticky `<Nav />` (unchanged). Below nav: a thin breadcrumb bar showing `Chapter X . Section Y` left-aligned, `[1 of N sections]` right-aligned, separated by a `h-px bg-border` divider.
- Brief text rendered inside a left-bordered callout block: `border-l-4 border-primary pl-5 py-4 bg-primary/5`.
- Single CTA button below, full-width on mobile, centered `max-w-xs` on desktop.

**Microcopy**
- Breadcrumb: `{book} . {section}` (parsed via `parseArtifactDisplay`)
- Badge: `Section {n} of {total}`
- Callout body: `{sectionBrief}` or v1 fallback (see below)
- CTA: `Got it -- See key concepts`

**v1 Fallback (no section_brief)**
- Show section heading (from `source` field parsed into readable text) in the callout position.
- Below heading: `{N} concepts to review` as helper text.
- CTA unchanged.

**Interaction Model**
- Click CTA or press `Enter`/`Space` -> transitions to Phase 2 (Absorb).
- `animate-fade-in` on mount (existing keyframe).

**States**
| State | Behavior |
|---|---|
| Loading | Skeleton: one `h-4 w-3/4 bg-muted animate-pulse` block for brief text, one `h-10 w-40` block for CTA. |
| Empty (0 cards in section) | Skip section entirely, advance `currentSectionIndex`. |
| Error (Supabase fetch fail) | Rendered at page level in `app/study/page.tsx` with the existing `border-l-2 border-destructive` error pattern. |
| Edge: very long brief | `prose max-w-none` styling; text wraps naturally; no truncation. |

**Accessibility**
- CTA receives `autoFocus` on phase mount.
- Callout has `role="region"` and `aria-label="Section brief"`.
- Focus order: breadcrumb -> brief text -> CTA.
- All text meets WCAG AA contrast (primary blue on white = 4.7:1 ratio -- passes).
- `prefers-reduced-motion`: replace `animate-fade-in` with instant render.

---

### Phase 2 -- Absorb

**Layout**
- Same `max-w-2xl` centered column.
- Same breadcrumb bar but badge reads `Key Concepts`.
- Answer bullets rendered as an ordered list: `<ol>` with custom list-style via `font-mono text-xs text-primary` numbering on the left, `text-sm text-foreground` for the answer text on the right.
- Each bullet separated by `gap-3` (not dividers -- dense but calm).
- Single CTA at bottom.

**Microcopy**
- Section header badge: `Key Concepts`
- Each bullet: `{qa.answer}` (no question text shown -- answers ARE the concept statements per spec).
- CTA: `Ready -- Test myself`

**Interaction Model**
- All bullets visible simultaneously -- no accordion, no pagination.
- Click CTA or `Enter`/`Space` -> transitions to Phase 3 (Drill).
- `animate-slide-up` on mount.

**States**
| State | Behavior |
|---|---|
| Loading | N/A -- data already loaded from parent. |
| Empty (0 concepts) | Show: `No concepts extracted for this section.` with a `Skip section` link. |
| Edge: 1 concept | Renders single bullet, CTA still shown. |
| Edge: very long answer text | `leading-relaxed` line-height; wraps naturally. No truncation. |

**Accessibility**
- `<ol role="list">` for proper screen reader enumeration.
- CTA receives focus after brief transition.
- Bullet numbering provides visual sequence without relying on color alone.

---

### Phase 3 -- Drill

**Layout**
- Same `max-w-2xl` column.
- Top bar: `Section {n} . Card {x} of {y}` left, source badge right.
- Section-scoped progress bar (the existing `ProgressBar` component, re-scoped to section card count instead of global card count).
- Below: the **existing flip card UI from `study-client.tsx`** -- UNCHANGED visually.
- Below card: existing 3-button rating row.

**Microcopy**
- Progress label: `{currentCardIndex + 1} / {sectionCards.length}`
- Source badge: `{source}` (already shown in current UI)
- Rating buttons: `Didn't know` / `Unsure` / `Know it` (unchanged)

**Interaction Model**
- Card flip on click or `Enter` (existing behavior).
- Rate via buttons or keyboard: `1` = Didn't know, `2` = Unsure, `3` = Know it.
- After rating last card in section -> auto-advance to Phase 4.
- `logStudySession` fire-and-forget on each rating (existing behavior, unchanged).

**States**
| State | Behavior |
|---|---|
| Loading | N/A -- cards already in memory. |
| Empty (0 cards after filter) | Skip directly to Phase 4 with all-zero scores. |
| Edge: 1 card | Progress bar at 0%, becomes 100% on rate. |
| Edge: missing judgeScore | Fallback `0.85` already applied in `page.tsx` mapping. |

**Accessibility**
- Existing ARIA on flip card (`role="button"`, `aria-label`, `tabIndex={0}`) preserved.
- Keyboard rating: `1`/`2`/`3` number keys as shortcuts (new, announced via sr-only text).
- Progress bar gets `role="progressbar"`, `aria-valuenow`, `aria-valuemax`.

---

### Phase 4 -- Section Done

**Layout**
- Same `max-w-2xl` column.
- Heading: `Section {n} complete` with a subtle checkmark icon (inline SVG, `text-mastered`).
- 3-column score grid (reuses the exact styling from the current session-done results: `border border-border bg-surface p-4 text-center`).
- Two CTAs side by side: `Review weak cards` (secondary/outline) and `Next section` (primary).

**Microcopy**
- Heading: `Section {n} complete`
- Score labels: `Know it` / `Unsure` / `Didn't know` (consistent with drill buttons)
- CTA left: `Review weak cards` (disabled if 0 unsure + unknown)
- CTA right: `Next section` (or `Finish chapter` if last section)

**Interaction Model**
- `Review weak cards` -> re-enters Phase 3 with `sectionCards.filter(c => result === "unsure" || result === "unknown")`. After re-drill, returns to Phase 4 with merged results.
- `Next section` -> increments `currentSectionIndex`, returns to Phase 1 (Brief) for next section.
- If last section -> transitions to Chapter Done.

**States**
| State | Behavior |
|---|---|
| All cards "know" | `Review weak cards` button is disabled with `opacity-50 cursor-not-allowed`. Show a small celebratory line: `Perfect score on this section.` in `text-mastered` (the "delight" moment). |
| All cards "unknown" | Both buttons active. No special UI -- keep it neutral. |

**Accessibility**
- `Next section` receives `autoFocus`.
- Score grid cells are `role="group"` with `aria-label="Score summary"`.
- Disabled button gets `aria-disabled="true"`.

---

### Chapter Done

**Layout**
- Same `max-w-2xl` column.
- Heading: `Chapter complete` with full chapter name.
- Aggregate score grid: same 3-column pattern but summed across all sections.
- Per-section breakdown: a compact list of sections with mini score bars (reuse the stacked bar pattern from `SessionHistory`).
- Two CTAs: `Study again` (restart session) and `Browse artifacts`.

**Microcopy**
- Heading: `Chapter complete`
- Subtitle: `{totalCards} cards across {sections.length} sections`
- Section rows: `{sectionName}` + mini horizontal stacked bar (know/unsure/unknown proportions).
- CTAs: `Study again` (primary) / `Browse artifacts` (secondary outline)

**Interaction Model**
- `Study again` -> resets `SessionState`, returns to Phase 1 of first section.
- `Browse artifacts` -> navigates to `/artifacts`.

**Delight Moment**
- If overall know percentage >= 80%: show a `border-l-4 border-mastered bg-mastered/5 px-4 py-3` callout with text: `Strong performance -- {knowPct}% mastery across this chapter.`
- Triggers only once, not on re-study.

**Accessibility**
- `Study again` gets `autoFocus`.
- Stacked bars have `aria-label` describing the counts.

---

## B) Screen-by-Screen Component Breakdown

### Component Inventory

| Component | File Path | Purpose | Props (TypeScript) | Internal State | Events/Callbacks | Dependencies |
|---|---|---|---|---|---|---|
| `StudyShell` | `components/study/study-shell.tsx` | Fullscreen wrapper with consistent padding, breadcrumb bar, and phase routing | `{ sections: SectionGroup[], initialCards: StudyCard[] }` | `SessionState` (phase, sectionIndex, results) | None (manages all phase transitions internally) | `BriefPhase`, `AbsorbPhase`, `DrillPhase`, `SectionDone`, `ChapterDone`, `SectionBreadcrumb` |
| `SectionBreadcrumb` | `components/study/section-breadcrumb.tsx` | Top bar showing chapter/section context and section counter | `{ sectionName: string, sectionIndex: number, totalSections: number, phaseBadge?: string }` | None | None | `parseArtifactDisplay` |
| `BriefPhase` | `components/study/brief-phase.tsx` | Phase 1 -- renders section_brief callout with CTA | `{ section: SectionGroup, onAdvance: () => void }` | None | `onAdvance` | None |
| `AbsorbPhase` | `components/study/absorb-phase.tsx` | Phase 2 -- renders answer bullets sorted by judgeScore | `{ concepts: QAPair[], onAdvance: () => void }` | None | `onAdvance` | None |
| `DrillPhase` | `components/study/drill-phase.tsx` | Phase 3 -- wraps existing flip card UI scoped to section cards | `{ cards: StudyCard[], onComplete: (results: CardResult[]) => void }` | `currentIndex`, `flipped`, `localResults`, `cardStartTime` | `onComplete` | `logStudySession` |
| `SectionProgress` | `components/study/section-progress.tsx` | Progress bar scoped to current section | `{ current: number, total: number }` | None | None | None |
| `SectionDone` | `components/study/section-done.tsx` | Phase 4 -- section score summary with review/next CTAs | `{ sectionName: string, results: CardResult[], isLastSection: boolean, onReviewWeak: () => void, onNext: () => void }` | None | `onReviewWeak`, `onNext` | None |
| `ChapterDone` | `components/study/chapter-done.tsx` | Final screen -- full chapter results with per-section breakdown | `{ sections: SectionGroup[], allResults: Map<number, CardResult[]>, onRestart: () => void }` | None | `onRestart` | None |

### Prop Type Definitions

```typescript
// lib/study.ts

interface QAPair {
  question: string;
  answer: string;
  source: string;
  judgeScore: number;
}

interface StudyCard extends QAPair {
  id: string;
}

type Rating = "know" | "unsure" | "unknown";

interface CardResult {
  cardId: string;
  rating: Rating;
  durationMs: number;
}

type SessionPhase = "brief" | "absorb" | "drill" | "section_done" | "chapter_done";

interface SectionGroup {
  source: string;               // e.g. "ab1c2d3e..."
  sectionLabel: string;         // human-readable from parseArtifactDisplay
  sectionBrief?: string;        // from backend (optional until v2)
  concepts: StudyCard[];        // sorted by judgeScore desc
}

interface SessionState {
  sections: SectionGroup[];
  currentSectionIndex: number;
  currentPhase: SessionPhase;
  sectionResults: CardResult[];         // results for current section drill
  allSectionResults: Map<number, CardResult[]>;  // index -> results
  isReviewingWeak: boolean;             // true when re-drilling weak cards
}
```

---

## C) Frontend State Machine + Types

### SessionPhase Enum & Transitions

```
  brief ──→ absorb ──→ drill ──→ section_done ──→ brief (next section)
                                      │                       │
                                      │ (review weak)         │ (last section)
                                      ↓                       ↓
                                    drill               chapter_done
```

### State Machine Pseudocode

```typescript
function transition(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "ADVANCE_FROM_BRIEF":
      return { ...state, currentPhase: "absorb" };

    case "ADVANCE_FROM_ABSORB":
      return { ...state, currentPhase: "drill", sectionResults: [], isReviewingWeak: false };

    case "DRILL_COMPLETE": {
      const merged = state.isReviewingWeak
        ? mergeResults(state.sectionResults, action.results)
        : action.results;
      const updated = new Map(state.allSectionResults);
      updated.set(state.currentSectionIndex, merged);
      return {
        ...state,
        currentPhase: "section_done",
        sectionResults: merged,
        allSectionResults: updated,
        isReviewingWeak: false,
      };
    }

    case "REVIEW_WEAK": {
      return { ...state, currentPhase: "drill", isReviewingWeak: true };
    }

    case "NEXT_SECTION": {
      const nextIdx = state.currentSectionIndex + 1;
      if (nextIdx >= state.sections.length) {
        return { ...state, currentPhase: "chapter_done" };
      }
      return {
        ...state,
        currentSectionIndex: nextIdx,
        currentPhase: "brief",
        sectionResults: [],
      };
    }

    case "RESTART":
      return initialState(state.sections);
  }
}

function mergeResults(existing: CardResult[], newResults: CardResult[]): CardResult[] {
  // For re-drilled cards: replace the old rating with the new one
  const map = new Map(existing.map(r => [r.cardId, r]));
  for (const r of newResults) map.set(r.cardId, r);
  return Array.from(map.values());
}
```

### Review Weak Cards Loop

When user clicks "Review weak cards" in SectionDone:
1. Filter `sectionResults` to cards where `rating === "unsure" || rating === "unknown"`.
2. Map those cardIds back to `StudyCard` objects from the section's `concepts` array.
3. Set `isReviewingWeak = true`, re-enter Phase 3 (Drill) with filtered card list.
4. On drill complete, `mergeResults` overwrites old ratings with new ones.
5. Return to SectionDone with updated scores.

### URL Behavior

- Default route: `/study` (existing).
- Add optional search param: `?view=digest` for section-loop (new default) vs `?view=cards` for legacy flat mode.
- On first load, if `view` param is absent, default to `digest` (section loop).
- `?view=cards` renders the original `StudyClient` component unchanged -- backward compatible.
- Use `useSearchParams()` in the client component to read/write; no server-side routing changes.

### Grouping Utility

```typescript
// lib/study.ts
export function groupCardsBySource(cards: StudyCard[]): SectionGroup[] {
  const map = new Map<string, StudyCard[]>();
  for (const card of cards) {
    if (!map.has(card.source)) map.set(card.source, []);
    map.get(card.source)!.push(card);
  }
  return Array.from(map.entries()).map(([source, concepts]) => ({
    source,
    sectionLabel: source, // will be enriched by parseArtifactDisplay at call site
    sectionBrief: undefined,
    concepts: concepts.sort((a, b) => b.judgeScore - a.judgeScore),
  }));
}
```

---

## D) Data Contracts (Supabase -> UI)

### Tables Read Today

| Table | Columns Used | Purpose |
|---|---|---|
| `artifacts` | `id`, `title`, `source_hash`, `outline` (JSONB), `created_at` | Parent record for each processed chunk |
| `cards` | `id`, `question`, `answer`, `source_context`, `judge_score`, `artifact_id` | Individual Q&A pairs |
| `study_sessions` | `card_id`, `user_id`, `rating`, `duration_ms`, `reviewed_at` | Write target for drill results |

### Current SELECT Shape (in `app/study/page.tsx`)

```sql
SELECT artifacts.*, cards.* 
FROM artifacts 
LEFT JOIN cards ON cards.artifact_id = artifacts.id
WHERE artifacts.user_id = auth.uid()
ORDER BY artifacts.created_at DESC
```

Executed via Supabase JS:
```typescript
supabase.from("artifacts").select("*, cards(*)").order("created_at", { ascending: false })
```

### Enhanced SELECT Shape (for section_brief support -- Phase 2+)

No query change needed. The `section_brief` will be stored in the artifact's existing JSONB `outline` field (see Section F) or as a new column. The frontend mapping changes:

### Field Mapping (snake_case -> camelCase)

| DB Field | Frontend Field | Transform |
|---|---|---|
| `card.id` | `StudyCard.id` | direct |
| `card.question` | `StudyCard.question` | direct |
| `card.answer` | `StudyCard.answer` | direct |
| `card.judge_score` | `StudyCard.judgeScore` | `?? 0.85` fallback |
| `card.source_context` | (not used in study UI) | -- |
| `artifact.title` | `SectionGroup.sectionLabel` | via `parseArtifactDisplay(title, source_hash)` |
| `artifact.source_hash` | `SectionGroup.source` / `StudyCard.source` | `sourceHash.substring(0, 8) + "..."` |
| `artifact.section_brief` (new) | `SectionGroup.sectionBrief` | direct, optional |

### Sorting Rules

1. **Sections**: ordered by `artifact.created_at` ascending (process order = chapter order).
2. **Concepts within section**: `judgeScore` descending. Tie-breaker: original array index (stable sort -- `Array.sort` in JS is stable).

### Source / Section Grouping Key

- Current: all cards from a single artifact share the same `source` (derived from `artifact.source_hash.substring(0, 8) + "..."`).
- Each artifact = one pipeline chunk = one section of the textbook.
- Grouping: `cards.groupBy(c => c.source)` -- each group is one `SectionGroup`.

### Pagination Strategy

**None.** All artifacts + cards are fetched in a single query. Rationale:
- Typical chapter: 5-15 sections x 5-10 cards = 25-150 cards total. Well within a single fetch.
- The study session is an offline-style experience -- all data must be in memory for fast phase transitions.
- Supabase RLS handles auth filtering; no server-side pagination needed.

---

## E) Backend/API Design (Next.js + Supabase)

### Existing Endpoints (Unchanged)

| Endpoint | Method | Purpose |
|---|---|---|
| `app/study/page.tsx` (RSC) | GET | Fetch all artifacts + cards for study |
| `app/actions/study.ts` `logStudySession` | Server Action | Log individual card rating |
| `app/actions/study.ts` `logBulkStudySession` | Server Action | Log batch of card ratings |
| `app/api/study/route.ts` | GET | Fetch study session history |

### New / Modified Endpoints

#### 1. Modified: `app/study/page.tsx` (RSC Data Fetch)

**Change:** Add `section_brief` to the SELECT if/when column exists. No breaking change -- field is nullable.

```typescript
// Enhanced query (when section_brief column exists):
const { data: rawArtifacts, error } = await supabase
  .from("artifacts")
  .select("*, cards(*)")
  .order("created_at", { ascending: true }); // Changed to ASC for chapter order
```

**Response mapping addition:**
```typescript
// In the flatMap, also extract section_brief per artifact:
const sectionBriefs = new Map<string, string>();
for (const artifact of rawArtifacts || []) {
  if (artifact.section_brief) {
    const source = parseArtifactDisplay(artifact.title, artifact.source_hash).source;
    sectionBriefs.set(source, artifact.section_brief);
  }
}
```

Pass `sectionBriefs` map to `StudyShell` alongside `initialCards`.

#### 2. New: Server Action `logSectionComplete`

**Purpose:** Log that a user completed a section drill (optional -- for analytics).

```typescript
// app/actions/study.ts (addition)
export async function logSectionComplete(
  artifactId: string,
  sectionSource: string,
  results: { know: number; unsure: number; unknown: number },
  durationMs: number
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");
  
  // This is optional enrichment -- study_sessions per card are the source of truth.
  // Could be used for faster analytics aggregation later.
  // For v1: no-op or simple console.log. Implement table in Phase 3 if needed.
}
```

**Decision:** This is deferred to Phase 3. The existing per-card `logStudySession` already captures everything needed. Section-level aggregation can be computed from card-level data.

#### 3. No New REST Endpoints Needed

All data flows through:
- RSC fetch (read) -> existing Supabase query
- Server Actions (write) -> existing `logStudySession` / `logBulkStudySession`

The drill phase continues to call `logStudySession` per card, unchanged.

### Security

- **Auth:** All Supabase queries run through the server-side client which uses `cookies()` for auth. `getUser()` is called in every server action.
- **RLS:** Existing policies on `artifacts`, `cards`, and `study_sessions` ensure users only see/write their own data. No changes needed.
- **Validation:** Existing Zod schemas (`logStudySessionSchema`, `logBulkStudySessionSchema`) validate all inputs. No new validation needed for Phase 1.

---

## F) Supabase Schema Support (Migrations + RLS)

### Chosen Option: Add `section_brief` column to `artifacts` table

**Rationale:** Each artifact = one processed section. The brief belongs to the artifact, not to a separate table. This is the simplest, most normalized approach.

### Migration

```sql
-- File: supabase/migrations/20260302000000_add_section_brief.sql

-- Add section_brief column to artifacts
ALTER TABLE public.artifacts 
  ADD COLUMN IF NOT EXISTS section_brief TEXT;

-- No index needed: section_brief is only read when fetching the artifact row 
-- (already indexed by PK and user_id via RLS).

-- No RLS changes needed: existing artifact policies (SELECT/INSERT/UPDATE/DELETE 
-- by user_id = auth.uid()) automatically cover the new column.
```

### Why No Index

- `section_brief` is never queried directly (no `WHERE section_brief = ...`).
- It's always read as part of a full artifact row fetch.
- The existing `artifacts` table is already filtered by RLS on `user_id`.

### RLS Policies

**No changes.** Existing policies on `artifacts` apply to all columns including the new one:
- `Users can view their own artifacts` (SELECT where `auth.uid() = user_id`)
- `Users can create their own artifacts` (INSERT where `auth.uid() = user_id`)
- `Users can update their own artifacts` (UPDATE where `auth.uid() = user_id`)

### Backfill Strategy

For existing artifacts that were processed before the summarize_node was added:
1. `section_brief` will be `NULL` for all existing rows.
2. The frontend handles this gracefully via the v1 fallback (show section heading + card count).
3. **Optional backfill script** (run manually if desired):

```sql
-- No automatic backfill. Existing artifacts display with v1 fallback.
-- Users can re-process chapters to generate section_briefs.
-- A future admin script could batch-generate briefs for existing artifacts.
```

### Backend Persistence Change

In `src/note_taker/api/persistence.py`, the `save_artifact_to_supabase` function already inserts `artifact_row` dict. Add `section_brief`:

```python
# In save_artifact_to_supabase:
artifact_row = {
    "user_id": user_id,
    "title": title,
    "source_hash": artifact.source_hash,
    "outline": outline_json,
    "section_brief": getattr(artifact, "section_brief", None),  # NEW
}
```

### Study Sessions Table

**No changes.** The existing `study_sessions` table with per-card logging is sufficient. The `logStudySession` server action is unchanged. Section-level and chapter-level aggregation is computed client-side from card results.

---

## G) Implementation Plan (Phased)

### Phase 1: UI Structure (no backend changes)

- [ ] **`lib/study.ts`** (NEW): Create file with `SectionGroup`, `SessionState`, `StudyCard`, `CardResult`, `SessionPhase` types and `groupCardsBySource()` utility function.

- [ ] **`components/study/section-breadcrumb.tsx`** (NEW): Breadcrumb bar component showing section context and counter. Uses `parseArtifactDisplay` for readable names.

- [ ] **`components/study/brief-phase.tsx`** (NEW): Phase 1 component. Shows section_brief callout (or v1 fallback: section heading + card count). CTA button "Got it -- See key concepts". Keyboard: Enter/Space to advance.

- [ ] **`components/study/absorb-phase.tsx`** (NEW): Phase 2 component. Renders `concepts.map(c => c.answer)` as numbered bullet list sorted by judgeScore desc. CTA "Ready -- Test myself".

- [ ] **`components/study/drill-phase.tsx`** (NEW): Phase 3 wrapper. Contains the flip card UI (extracted from study-client.tsx core), section-scoped progress bar, and rating buttons. Calls `logStudySession` per card. On last card rated, calls `onComplete(results)`.

- [ ] **`components/study/section-progress.tsx`** (NEW): Thin progress bar component. Props: `current`, `total`. Renders `ProgressBar`-style UI with percentage.

- [ ] **`components/study/section-done.tsx`** (NEW): Phase 4 component. 3-column score grid (know/unsure/unknown). "Review weak cards" button (disabled if 0 weak). "Next section" or "Finish chapter" CTA.

- [ ] **`components/study/chapter-done.tsx`** (NEW): Chapter complete screen. Aggregate scores, per-section mini bars, "Study again" and "Browse artifacts" CTAs. Mastery callout if >= 80% know.

- [ ] **`components/study/study-shell.tsx`** (NEW): Main orchestrator component. Receives `initialCards` and `sectionBriefs` from RSC. Manages `SessionState` with `useReducer`. Routes to correct phase component based on `currentPhase`. Handles all phase transitions.

- [ ] **`app/study/page.tsx`** (MODIFY): Change sort order to `ascending: true`. Pass data to `StudyShell` instead of `StudyClient`. Keep `StudyClient` import for `?view=cards` fallback.

- [ ] **`app/study/study-client.tsx`** (NO CHANGE): Preserved as-is for `?view=cards` legacy mode.

### Phase 2: Backend `section_brief` Support

- [ ] **`supabase/migrations/20260302000000_add_section_brief.sql`** (NEW): `ALTER TABLE artifacts ADD COLUMN section_brief TEXT`.

- [ ] **`src/note_taker/models.py`** (MODIFY): Add `section_brief: Optional[str] = None` to `FinalArtifactV1`. Add `SummarizeResponse` model.

- [ ] **`src/note_taker/pipeline/nodes.py`** (MODIFY): Add `summarize_node` function using fast-tier LLM to generate 2-3 sentence brief from outline + answers.

- [ ] **`src/note_taker/pipeline/graph.py`** (MODIFY): Insert `summarize_node` between quality loop completion and `save_to_db_node`. Update `should_continue` to route to `summarize_node`.

- [ ] **`src/note_taker/api/persistence.py`** (MODIFY): Add `section_brief` to `artifact_row` dict in `save_artifact_to_supabase`.

- [ ] **`app/study/page.tsx`** (MODIFY): Extract `section_brief` from each artifact and pass as `sectionBriefs` map to `StudyShell`.

### Phase 3: Connect and Polish

- [ ] **`components/study/brief-phase.tsx`** (MODIFY): Replace v1 fallback with real `section_brief` text when available.

- [ ] **`components/study/study-shell.tsx`** (MODIFY): Implement "Review weak cards" re-drill flow with result merging. Add `?view=digest` / `?view=cards` URL param routing via `useSearchParams`.

- [ ] **`components/study/drill-phase.tsx`** (MODIFY): Add keyboard shortcuts: `1`/`2`/`3` for rating, `Space` to flip card. Add sr-only announcement text for keyboard shortcuts.

- [ ] **`components/study/chapter-done.tsx`** (MODIFY): Add per-section mini stacked bars using section results data.

- [ ] **`app/study/page.tsx`** (MODIFY): Read `view` search param and conditionally render `StudyShell` vs `StudyClient`.

---

### File Impact Summary

| File | Action | Phase |
|---|---|---|
| `lib/study.ts` | CREATE | 1 |
| `components/study/section-breadcrumb.tsx` | CREATE | 1 |
| `components/study/brief-phase.tsx` | CREATE | 1 |
| `components/study/absorb-phase.tsx` | CREATE | 1 |
| `components/study/drill-phase.tsx` | CREATE | 1 |
| `components/study/section-progress.tsx` | CREATE | 1 |
| `components/study/section-done.tsx` | CREATE | 1 |
| `components/study/chapter-done.tsx` | CREATE | 1 |
| `components/study/study-shell.tsx` | CREATE | 1 |
| `app/study/page.tsx` | MODIFY | 1, 2, 3 |
| `app/study/study-client.tsx` | NO CHANGE | -- |
| `supabase/migrations/20260302000000_add_section_brief.sql` | CREATE | 2 |
| `src/note_taker/models.py` | MODIFY | 2 |
| `src/note_taker/pipeline/nodes.py` | MODIFY | 2 |
| `src/note_taker/pipeline/graph.py` | MODIFY | 2 |
| `src/note_taker/api/persistence.py` | MODIFY | 2 |
