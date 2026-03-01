# 📖 STUDY_UX_SPEC.md — Shortform Mastery Loop

**Status:** 🧠 DESIGN COMPLETE — Ready for Implementation  
**Goal:** Let users master any book by reading a dense shortform distillation and drilling flashcards — without ever touching the original text.

---

## 🎯 Product Vision

The pipeline already transforms raw textbook chapters into distilled Q&A artifacts. This spec defines how the **study UI** surfaces that distillation as a first-class, standalone reading experience.

A user should be able to:
1. **Orient** — read a 2–3 sentence brief of what a section covers
2. **Absorb** — scan the key concepts as dense bullet statements
3. **Drill** — flip cards to confirm retention

...and declare mastery of a chapter without opening the original book once.

---

## 🧱 The 3-Layer Content Model

Every processed section collapses into exactly three layers, all derived from the pipeline:

| Layer | Source Field | Purpose | Time Budget |
|---|---|---|---|
| **1 — Orient** | `section_brief` | 2–3 sentence synthesis of the section | ~10 sec |
| **2 — Absorb** | `qa_pairs[].answer` | Key concept statements, bullet form | ~60 sec |
| **3 — Drill** | `qa_pairs[].question` | Active recall flip-card test | ~2 min |

Layers 1 and 2 are **read**. Layer 3 is **tested**. This is the complete learning loop per section.

---

## 🔄 The Session Flow

The session is structured as a **chapter-by-chapter mastery loop**, not a flat card queue.

```
For each section in the artifact (sorted by section order):

  ┌─────────────────────────────────────────────┐
  │  PHASE 1 — BRIEF                            │
  │  Read the 2–3 sentence section_brief        │
  │  CTA: "Got it → See key concepts"           │
  ├─────────────────────────────────────────────┤
  │  PHASE 2 — ABSORB                           │
  │  Read all answer bullets (sorted by score)  │
  │  CTA: "Ready → Test myself"                 │
  ├─────────────────────────────────────────────┤
  │  PHASE 3 — DRILL                            │
  │  Flip cards scoped to this section only     │
  │  Rate: Know it / Unsure / Didn't know        │
  ├─────────────────────────────────────────────┤
  │  PHASE 4 — SECTION DONE                     │
  │  Show section score summary                 │
  │  CTA: "Next section →"                      │
  └─────────────────────────────────────────────┘
           ↓
      Next section...
           ↓
      Chapter complete screen
```

---

## 🖼️ Phase UI Specs

### Phase 1 — Brief

```
┌──────────────────────────────────────────────────┐
│  Chapter 2 · Section 3         [1 of 6 sections] │
│  ──────────────────────────────────────────────  │
│                                                  │
│  ▌ CAPM links expected return to systematic      │
│    risk through beta. It assumes rational         │
│    investors, efficient markets, and no           │
│    arbitrage. Beta is the only priced risk.       │
│                                                  │
│           [Got it → See key concepts]            │
└──────────────────────────────────────────────────┘
```

- Fullscreen, minimal chrome
- `section_brief` text rendered in a left-bordered callout block
- Single CTA button to advance to Absorb phase
- **v1 fallback** (before backend ships): display section heading + card count instead of brief

### Phase 2 — Absorb

```
┌──────────────────────────────────────────────────┐
│  Chapter 2 · Section 3  [Key Concepts]           │
│  ──────────────────────────────────────────────  │
│                                                  │
│  ● Expected return = Rf + β(Rm - Rf)             │
│  ● Beta > 1 means more volatile than market      │
│  ● Systematic risk cannot be diversified away    │
│  ● CAPM requires homogeneous expectations        │
│  ● SML plots expected return vs beta linearly    │
│                                                  │
│              [Ready → Test myself]               │
└──────────────────────────────────────────────────┘
```

- All `qa_pairs[].answer` values rendered as bullet statements
- Sorted by `judgeScore` descending (highest quality concept first)
- All bullets visible simultaneously — no pagination, no hiding
- Single CTA to advance to Drill phase

### Phase 3 — Drill

```
┌──────────────────────────────────────────────────┐
│  Section 3 · Card 2 of 5                         │
│  ██████░░░░░░░░░░░░░░  (section-scoped progress) │
│                                                  │
│  [existing StudyClient flip card UI — unchanged] │
│                                                  │
│  [Didn't know]   [Unsure]   [Know it]            │
└──────────────────────────────────────────────────┘
```

- Reuses the existing flip card UI from `study-client.tsx` exactly
- Card pool filtered to `cards.filter(c => c.source === currentSection.source)`
- Progress bar scoped to this section (not global)
- After last card → auto-advance to Phase 4

### Phase 4 — Section Done

```
┌──────────────────────────────────────────────────┐
│  Section 3 complete ✓                            │
│                                                  │
│    Know it   Unsure   Didn't know                │
│       3        1          1                      │
│                                                  │
│  [Review weak cards]     [Next section →]        │
└──────────────────────────────────────────────────┘
```

- Know / Unsure / Unknown count for this section
- "Review weak cards" re-runs Phase 3 filtered to `unsure | unknown` only
- "Next section" advances `currentSectionIndex`

---

## 🗂️ Frontend Data Model

### New TypeScript Types

```typescript
// New top-level session shape
type SessionPhase = "brief" | "absorb" | "drill" | "section_done" | "chapter_done"

interface SectionGroup {
  source: string             // e.g. "BookName:Chapter2:Section3"
  sectionBrief?: string      // from backend section_brief (optional until v2)
  concepts: QAPair[]         // sorted by judgeScore desc
}

interface SessionState {
  sections: SectionGroup[]
  currentSectionIndex: number
  currentPhase: SessionPhase
  sectionResults: CardResult[]   // results scoped to current section
}
```

### Grouping Utility

Create `lib/study.ts`:

```typescript
export function groupCardsBySource(cards: QAPair[]): SectionGroup[] {
  const map = new Map<string, QAPair[]>()
  for (const card of cards) {
    if (!map.has(card.source)) map.set(card.source, [])
    map.get(card.source)!.push(card)
  }
  return Array.from(map.entries()).map(([source, concepts]) => ({
    source,
    sectionBrief: undefined,  // populated from API when available
    concepts: concepts.sort((a, b) => b.judgeScore - a.judgeScore),
  }))
}
```

---

## 🧩 New Components

| Component | File | Purpose |
|---|---|---|
| `BriefPhase` | `components/study/brief-phase.tsx` | Phase 1 — renders `section_brief` with CTA |
| `AbsorbPhase` | `components/study/absorb-phase.tsx` | Phase 2 — renders answer bullets with CTA |
| `SectionDone` | `components/study/section-done.tsx` | Phase 4 — section score + navigation |
| `ChapterDone` | `components/study/chapter-done.tsx` | Final screen — full chapter results |
| `SectionProgress` | `components/study/section-progress.tsx` | Progress bar scoped to current section |

The existing `StudyClient` flip card UI is **reused unchanged** for Phase 3. Only the card pool filter and progress bar scope change.

---

## 🐍 Backend Changes (v2 — `section_brief`)

### 1. `models.py` — Add field + response model

```python
# Add to FinalArtifactV1
class FinalArtifactV1(BaseModel):
    version: int = 1
    source_hash: str
    outline: List[OutlineItem]
    qa_pairs: List[QuestionAnswerPair]
    section_brief: Optional[str] = None   # ← NEW

# New LLM response model
class SummarizeResponse(BaseModel):
    section_brief: str
```

### 2. `nodes.py` — Add `summarize_node`

```python
SUMMARIZE_SYSTEM_PROMPT = """You are an expert at writing dense, information-rich study notes.
Given the outline and finalized Q&A answers from a textbook section, write a 2–3 sentence brief that:
- Synthesizes the main concepts and their relationships
- Reads like a cheat-sheet briefing, not a textbook paragraph
- Is dense: every word earns its place
Output only the brief text. No preamble."""

def summarize_node(state: GraphState) -> dict:
    from note_taker.models import SummarizeResponse
    artifact = state["artifact"]
    outline_text = "\n".join(
        f"{'  ' * (item.level - 1)}- {item.title}" for item in artifact.outline
    )
    answers_text = "\n".join(f"• {qa.answer}" for qa in artifact.qa_pairs)
    llm = get_llm(tier="fast")
    structured_llm = llm.with_structured_output(SummarizeResponse)
    response = invoke_with_backoff(
        structured_llm,
        [
            {"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT},
            {"role": "user", "content": f"Outline:\n{outline_text}\n\nKey Answers:\n{answers_text}"},
        ],
        token_estimate=500
    )
    artifact.section_brief = response.section_brief
    return {"artifact": artifact}
```

### 3. `graph.py` — Rewire

```
BEFORE: judge → should_continue → save_to_db | revise
AFTER:  judge → should_continue → summarize → save_to_db | revise
```

- Import `summarize_node`
- `graph.add_node("summarize_node", summarize_node)`
- `should_continue` returns `"summarize_node"` instead of `"save_to_db_node"`
- `graph.add_edge("summarize_node", "save_to_db_node")`

### LLM Cost

The `summarize_node` uses `tier="fast"` (~500 tokens) — same cost tier as `judge_node`. It runs once per chunk after the quality loop finishes. No global context, no extra API dependencies.

---

## 🚦 Build Phases

### Phase 1 — UI Structure (no backend changes needed)
- [ ] `groupCardsBySource()` utility in `lib/study.ts`
- [ ] Replace flat `currentIndex` state in `study-client.tsx` with `SessionState` (section + phase)
- [ ] `BriefPhase` component — shows section heading + card count as v1 fallback
- [ ] `AbsorbPhase` component — answers as bullets
- [ ] `SectionDone` component — per-section score + navigation
- [ ] `ChapterDone` component — final chapter summary screen
- [ ] Section-scoped progress bar in Phase 3

### Phase 2 — Backend `section_brief`
- [ ] Add `section_brief: Optional[str]` to `FinalArtifactV1` in `models.py`
- [ ] Add `SummarizeResponse` model to `models.py`
- [ ] Add `summarize_node` function to `nodes.py`
- [ ] Rewire `graph.py` to insert `summarize_node` after quality loop
- [ ] Verify `section_brief` serialises through `database.py` JSON blob
- [ ] Surface `section_brief` from the API response to the frontend

### Phase 3 — Connect & Polish
- [ ] Replace `BriefPhase` v1 fallback with real `section_brief` text
- [ ] Add "Review weak cards" re-drill flow in `SectionDone`
- [ ] Persist `ViewMode` preference in URL: `?view=digest` (section loop) vs `?view=cards` (legacy flat)
- [ ] Keyboard navigation: `Space` to advance phase, arrow keys for card rating

---

## ✅ Success Criteria

- [ ] A user can read a full chapter's distilled shortform (Brief + Absorb phases) in under 5 minutes
- [ ] Drill phase cards are always scoped to the section just read — no cross-section mixing
- [ ] `section_brief` is never empty for a processed artifact — Summarizer node is mandatory in pipeline
- [ ] The original textbook Markdown is never surfaced in the study UI
- [ ] Session results (know/unsure/unknown) are logged per card via `logStudySession` unchanged
- [ ] Phase 1 ships without any backend changes (section heading fallback is acceptable)

---

## 🔒 Constraints & Decisions

| Decision | Rationale |
|---|---|
| **No original text in UI** | The pipeline's distillation IS the product. Showing raw source defeats the purpose. |
| **Answers as concept statements** | Q&A answers are already declarative — they read as knowledge, not responses. |
| **Section-scoped drilling** | Mixing sections breaks the context built in Brief + Absorb phases. |
| **judgeScore sort for Absorb** | Highest-quality concepts surface first; users get the most value if they stop early. |
| **`section_brief` optional until Phase 2** | Lets UI ship independently of backend; fallback degrades gracefully. |
| **Reuse existing flip card UI** | Drill phase has no new logic — only the card pool changes. |
