# Design Document - SOLO-37: Pydantic Models

## Goal
Define the core data structures for the `note-taker` processing engine. These models will govern the LLM output (Targeted Revision loop), the SQLite storage format, and the deduplication logic.

## Proposed Models

### `QuestionAnswerPair`
Represents a single active recall unit.
- `question`: `str`
- `answer`: `str`
- `source_context`: `str` (The Markdown snippet this was derived from)
- `judge_score`: `Optional[float]` (Default: `None`, populated by the Judge node)
- `judge_feedback`: `Optional[str]` (Detailed failure reasons for revision)

### `OutlineItem` (Recursive)
Represents a node in the hierarchical outline.
- `title`: `str`
- `level`: `int`
- `items`: `List[OutlineItem]` (Nested sub-points)

### `FinalArtifactV1`
The root container for a processed chunk.
- `version`: `int = 1`
- `source_hash`: `str` (SHA-256 of input Markdown)
- `outline`: `List[OutlineItem]` (2-level hierarchy)
- `qa_pairs`: `List[QuestionAnswerPair]`

## Technical Considerations
- **Immutability**: Use Pydantic's `frozen=True` where appropriate to ensure hashability if needed for deduplication later.
- **Serialization**: Ensure simple `model_dump_json()` compatibility for SQLite storage.
- **Validation**: Add clear descriptions/examples for LLM prompting (JSON mode).

## Verification Plan
1. **Unit Tests**:
    - Test successful instantiation with valid data.
    - Test validation errors for missing/invalid fields.
    - Test recursive nesting of `OutlineItem`.
2. **Serialization Test**:
    - Verify `idempotency`: `Model.parse_raw(model.json()) == model`.
