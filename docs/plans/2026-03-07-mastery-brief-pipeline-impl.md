# Mastery Brief Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the V1 outline+QA pipeline with a unified V2 mastery-brief-first pipeline that produces ultra-condensed 80/20 briefs + brief-derived Q&A cards.

**Architecture:** Single LangGraph `StateGraph` with 8 nodes and two independent judge/revise loops (one for the brief, one for QA). The outline becomes internal scaffolding — never surfaced to the user. The `MasteryBrief` is the critical artifact; Q&As are derived from it.

**Tech Stack:** LangGraph, Pydantic, Outlines (structured output), SQLite (`sqlite-utils`), FastAPI SSE, Typer CLI

**Design Document:** [`2026-03-07-mastery-brief-pipeline-design.md`](file:///Users/aaronng/repos/note-taker/docs/plans/2026-03-07-mastery-brief-pipeline-design.md)

---

## Dependency Graph

```
Task 1 (models) → Task 2 (state) → Task 3 (outline node) → Task 4 (synthesize_brief)
                                                            → Task 5 (judge_brief + revise_brief)
                                                            → Task 6 (qa_draft V2)
                                                            → Task 7 (judge_qa + revise_qa)
                                                            → Task 8 (save_to_db V2)
                                                            → Task 9 (graph assembly)
                                                            → Task 10 (CLI)
                                                            → Task 11 (API: generate.py + schemas.py + persistence.py)
                                                            → Task 12 (Integration test)
```

---

### Task 1: V2 Pydantic Models (Clean Slate)

**Files:**
- Modify: `src/note_taker/models.py`
- Create: `tests/test_models_v2.py`

**Context:** The design doc defines 5 new models: `CoreIdea`, `MasteryBrief`, `BriefJudgement`, `BriefRevisionResponse`, `FinalArtifactV2`. We keep the existing V1 models temporarily (other files still import them) and add V2 models alongside. V1 models will be deleted once all consumers are migrated.

**Step 1: Write failing tests for V2 models**

```python
# tests/test_models_v2.py
import pytest
from note_taker.models import CoreIdea, MasteryBrief, BriefJudgement, BriefRevisionResponse, FinalArtifactV2


def test_core_idea_creation():
    idea = CoreIdea(
        idea="Gradient descent minimizes a loss function by iteratively moving in the direction of steepest descent.",
        why_it_matters="It's the foundation of all neural network training.",
        mechanism="Compute the gradient of the loss w.r.t. parameters, then update: θ = θ - α∇L(θ).",
    )
    assert idea.idea.startswith("Gradient descent")
    assert "foundation" in idea.why_it_matters


def test_mastery_brief_creation():
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["Definition of X"],
        connections=["A causes B when C holds"],
        common_traps=["Confusing X with Y"],
        five_min_review=["X works by mechanism Z"],
    )
    assert len(brief.core_ideas) == 1
    assert len(brief.non_negotiable_details) == 1


def test_brief_judgement_scores_bounded():
    j = BriefJudgement(
        specificity_score=0.9,
        density_score=0.8,
        leverage_score=0.85,
        anti_summary_score=0.7,
        connections_score=0.75,
        overall_score=0.8,
        feedback="Good but could improve connections.",
    )
    assert 0.0 <= j.overall_score <= 1.0


def test_brief_revision_response_parsing():
    """BriefRevisionResponse should handle string-encoded JSON via _parse_embedded_json."""
    import json
    raw = {
        "revised_brief": json.dumps({
            "core_ideas": [{"idea": "A", "why_it_matters": "B", "mechanism": "C"}],
            "non_negotiable_details": ["D"],
            "connections": ["E"],
            "common_traps": ["F"],
            "five_min_review": ["G"],
        })
    }
    resp = BriefRevisionResponse.model_validate(raw)
    assert len(resp.revised_brief.core_ideas) == 1


def test_final_artifact_v2_creation():
    from note_taker.models import QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["D"],
        connections=["C"],
        common_traps=["T"],
        five_min_review=["R"],
    )
    artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=brief,
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S")],
    )
    assert artifact.version == 2
    assert artifact.mastery_brief.core_ideas[0].idea == "X"
```

**Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/test_models_v2.py -v
```
Expected: FAIL with `ImportError: cannot import name 'CoreIdea' from 'note_taker.models'`

**Step 3: Implement V2 models**

Add to `src/note_taker/models.py` (after existing V1 models):

```python
# --- V2 Models: Mastery Brief Pipeline ---

class CoreIdea(BaseModel):
    """A single high-leverage concept from the chapter."""
    idea: str                   # The concept, stated precisely
    why_it_matters: str         # Why this idea is foundational/reusable/testable
    mechanism: str              # How it works — the core logic, not just the label

class MasteryBrief(BaseModel):
    """The ultra-condensed 80/20 mastery brief for a chapter."""
    core_ideas: list[CoreIdea]
    non_negotiable_details: list[str]
    connections: list[str]
    common_traps: list[str]
    five_min_review: list[str]

class BriefJudgement(BaseModel):
    """Judge's evaluation of the mastery brief."""
    specificity_score: float = Field(ge=0.0, le=1.0)
    density_score: float = Field(ge=0.0, le=1.0)
    leverage_score: float = Field(ge=0.0, le=1.0)
    anti_summary_score: float = Field(ge=0.0, le=1.0)
    connections_score: float = Field(ge=0.0, le=1.0)
    overall_score: float = Field(ge=0.0, le=1.0)
    feedback: str

class BriefRevisionResponse(BaseModel):
    """LLM response from the brief revision node."""
    revised_brief: MasteryBrief

    @model_validator(mode="before")
    @classmethod
    def parse_str_to_obj(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "revised_brief")

class FinalArtifactV2(BaseModel):
    """The root container — brief-first, no outline exposed."""
    version: int = 2
    source_hash: str
    mastery_brief: MasteryBrief
    qa_pairs: List[QuestionAnswerPair]
```

**Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/test_models_v2.py -v
```
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/note_taker/models.py tests/test_models_v2.py
git commit -m "feat(models): add V2 Pydantic models for mastery brief pipeline"
```

---

### Task 2: V2 GraphState

**Files:**
- Modify: `src/note_taker/pipeline/state.py`
- Create: `tests/pipeline/test_state_v2.py`

**Context:** Replace the existing `GraphState` TypedDict. The new state adds `source_chunks` (list of dicts), `chunk_outlines`, `mastery_brief`, `brief_revision_count`, and replaces the single `revision_count` with `qa_revision_count`. Remove `source_content` and `outline` fields.

**Step 1: Write failing test**

```python
# tests/pipeline/test_state_v2.py
from note_taker.pipeline.state import GraphState


def test_graph_state_has_v2_fields():
    """GraphState should have all V2-required keys."""
    state: GraphState = {
        "chunk_id": "test:001",
        "source_chunks": [{"title": "Intro", "content": "Hello world"}],
        "source_hash": "abc",
        "force_refresh": False,
        "chunk_outlines": None,
        "mastery_brief": None,
        "brief_revision_count": 0,
        "artifact": None,
        "qa_revision_count": 0,
        "skip_processing": False,
        "persist_locally": True,
    }
    assert state["chunk_id"] == "test:001"
    assert isinstance(state["source_chunks"], list)
    assert state["brief_revision_count"] == 0
    assert state["qa_revision_count"] == 0
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/pipeline/test_state_v2.py -v
```
Expected: FAIL (TypedDict doesn't have `source_chunks`, `mastery_brief`, etc.)

**Step 3: Replace GraphState**

```python
# src/note_taker/pipeline/state.py
from typing import TypedDict, Optional
from note_taker.models import FinalArtifactV2, MasteryBrief, OutlineResponse


class GraphState(TypedDict):
    """State for the unified mastery brief pipeline (V2)."""
    # Input
    chunk_id: str
    source_chunks: list[dict]         # [{"title": str, "content": str}, ...]
    source_hash: str
    force_refresh: bool

    # Internal scaffolding (not user-facing)
    chunk_outlines: Optional[list[OutlineResponse]]

    # The mastery brief
    mastery_brief: Optional[MasteryBrief]
    brief_revision_count: int

    # The final artifact
    artifact: Optional[FinalArtifactV2]
    qa_revision_count: int

    # Control
    skip_processing: bool
    persist_locally: bool
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/pipeline/test_state_v2.py -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/state.py tests/pipeline/test_state_v2.py
git commit -m "feat(state): replace GraphState with V2 unified state"
```

---

### Task 3: `generate_outlines` Node

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/pipeline/test_nodes.py`

**Context:** Replace `outline_draft_node` with `generate_outlines`. This node processes ALL chunks (from `source_chunks`), generates a 2-level outline per chunk via the `fast` tier, and stores them as `chunk_outlines` in state. The outline prompt (`OUTLINE_SYSTEM_PROMPT`) stays the same.

**Step 1: Write failing test**

```python
# In tests/pipeline/test_nodes.py — add new test
def test_generate_outlines_processes_all_chunks():
    """generate_outlines should produce one OutlineResponse per source chunk."""
    from note_taker.pipeline.nodes import generate_outlines
    from note_taker.models import OutlineResponse, LLMOutlineItem

    state = {
        "chunk_id": "test:001",
        "source_chunks": [
            {"title": "Intro", "content": "Agents reason and act."},
            {"title": "Core", "content": "LLMs generate tokens."},
        ],
        "source_hash": "abc",
    }

    mock_outline = OutlineResponse(
        outline=[LLMOutlineItem(title="T", level=1)]
    )
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_outline
        result = generate_outlines(state)

    assert len(result["chunk_outlines"]) == 2
    assert mock_invoke.call_count == 2
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_generate_outlines_processes_all_chunks -v
```
Expected: FAIL with `ImportError: cannot import name 'generate_outlines'`

**Step 3: Implement `generate_outlines`**

```python
# In src/note_taker/pipeline/nodes.py

def generate_outlines(state: GraphState) -> dict:
    """Generate a 2-level outline per source chunk (fast tier, internal scaffolding)."""
    from note_taker.models import OutlineResponse

    outlines = []
    for chunk in state["source_chunks"]:
        prompt = f"System: {OUTLINE_SYSTEM_PROMPT}\n\nUser: {chunk['content']}"
        response = invoke_outlines_with_backoff(
            prompt=prompt,
            schema=OutlineResponse,
            token_estimate=400,
            tier="fast",
        )
        outlines.append(response)

    return {"chunk_outlines": outlines}
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_generate_outlines_processes_all_chunks -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(nodes): add generate_outlines node for V2 pipeline"
```

---

### Task 4: `synthesize_brief` Node

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/pipeline/test_nodes.py`

**Context:** New node. Takes all `chunk_outlines` + `source_chunks`, produces a `MasteryBrief`. Uses the `reasoning` tier. This is the most critical node — the prompting must enforce anti-summary behavior.

**Step 1: Write failing test**

```python
def test_synthesize_brief_produces_mastery_brief():
    """synthesize_brief should produce a MasteryBrief from outlines + source chunks."""
    from note_taker.pipeline.nodes import synthesize_brief
    from note_taker.models import OutlineResponse, LLMOutlineItem, MasteryBrief, CoreIdea

    state = {
        "source_chunks": [{"title": "Intro", "content": "Agents reason and act."}],
        "chunk_outlines": [
            OutlineResponse(outline=[LLMOutlineItem(title="Agents", level=1)])
        ],
    }

    mock_brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="Agents act autonomously", why_it_matters="Foundation of AI systems", mechanism="LLMs + tool use")],
        non_negotiable_details=["An agent = LLM + tools + memory"],
        connections=["Reasoning enables tool selection"],
        common_traps=["Confusing agents with chatbots"],
        five_min_review=["Agents combine reasoning with action"],
    )
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_brief
        result = synthesize_brief(state)

    assert result["mastery_brief"] is not None
    assert len(result["mastery_brief"].core_ideas) == 1
    assert result["mastery_brief"].core_ideas[0].idea == "Agents act autonomously"
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_synthesize_brief_produces_mastery_brief -v
```
Expected: FAIL with `ImportError: cannot import name 'synthesize_brief'`

**Step 3: Implement `synthesize_brief`**

```python
SYNTHESIZE_BRIEF_SYSTEM_PROMPT = """You are a mastery-brief generator. You distill textbook chapters into ultra-condensed 80/20 briefs.

**Your job is NOT to summarize.** Summaries restate topics. You identify the smallest set of ideas, mechanisms, definitions, and relationships that carry ~80% of the chapter's value.

Given: all section outlines from a chapter.

Produce:
- **core_ideas**: The few concepts that are foundational, reusable, testable, or high-leverage. For each: state the idea precisely, explain WHY it matters, and describe the MECHANISM (how it works).
- **non_negotiable_details**: Exact definitions, formulas, principles, or constraints the reader must memorize. No vague restatements.
- **connections**: How the core ideas relate — cause-effect chains, dependencies, necessary conditions. Not "A is related to B" but "A causes B only when C holds."
- **common_traps**: Misunderstandings, false equivalences, or subtle distinctions that trip up learners.
- **five_min_review**: 5-8 pithy bullets for rapid revision. Each bullet is a complete, testable claim.

Anti-patterns to AVOID:
- "This chapter discusses X" (topic label, not a mastery point)
- "Y is important" (assertion without mechanism)
- Listing every concept (that's an outline, not 80/20)
- Historical anecdotes or filler"""


def synthesize_brief(state: GraphState) -> dict:
    """Distill chunk outlines + source into a MasteryBrief (reasoning tier)."""
    from note_taker.models import MasteryBrief

    # Build combined outline text
    outline_sections = []
    for i, (chunk, outline_resp) in enumerate(zip(state["source_chunks"], state["chunk_outlines"])):
        section_text = f"## Section: {chunk['title']}\n"
        section_text += "\n".join(
            f"{'  ' * (item.level - 1)}- [L{item.level}] {item.title}"
            for item in outline_resp.outline
        )
        outline_sections.append(section_text)

    combined_outlines = "\n\n".join(outline_sections)
    combined_source = "\n\n---\n\n".join(
        f"### {chunk['title']}\n{chunk['content']}"
        for chunk in state["source_chunks"]
    )

    prompt = (
        f"System: {SYNTHESIZE_BRIEF_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Chapter Outlines\n{combined_outlines}\n\n"
        f"### Source Text\n{combined_source}"
    )

    brief = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=MasteryBrief,
        token_estimate=1200,
        tier="reasoning",
    )

    return {"mastery_brief": brief}
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_synthesize_brief_produces_mastery_brief -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(nodes): add synthesize_brief node with reasoning tier"
```

---

### Task 5: `judge_brief` + `revise_brief` Nodes

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/pipeline/test_nodes.py`

**Step 1: Write failing tests**

```python
def test_judge_brief_scores_brief():
    """judge_brief should return a BriefJudgement with scores."""
    from note_taker.pipeline.nodes import judge_brief
    from note_taker.models import MasteryBrief, CoreIdea, BriefJudgement

    state = {
        "mastery_brief": MasteryBrief(
            core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
            non_negotiable_details=["D"], connections=["C"],
            common_traps=["T"], five_min_review=["R"],
        ),
        "brief_revision_count": 0,
    }

    mock_judgement = BriefJudgement(
        specificity_score=0.9, density_score=0.85, leverage_score=0.8,
        anti_summary_score=0.9, connections_score=0.75,
        overall_score=0.84, feedback="Good but connections could be stronger.",
    )
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_judgement
        result = judge_brief(state)

    assert "brief_judgement" in result
    assert result["brief_judgement"].overall_score == 0.84


def test_revise_brief_rewrites_brief():
    """revise_brief should produce a revised MasteryBrief based on judge feedback."""
    from note_taker.pipeline.nodes import revise_brief
    from note_taker.models import MasteryBrief, CoreIdea, BriefJudgement, BriefRevisionResponse

    state = {
        "mastery_brief": MasteryBrief(
            core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
            non_negotiable_details=["D"], connections=["C"],
            common_traps=["T"], five_min_review=["R"],
        ),
        "brief_judgement": BriefJudgement(
            specificity_score=0.5, density_score=0.5, leverage_score=0.5,
            anti_summary_score=0.5, connections_score=0.5,
            overall_score=0.5, feedback="Too vague. Name specific mechanisms.",
        ),
        "brief_revision_count": 0,
        "source_chunks": [{"title": "T", "content": "C"}],
        "chunk_outlines": [],
    }

    revised = MasteryBrief(
        core_ideas=[CoreIdea(idea="Better X", why_it_matters="Better Y", mechanism="Better Z")],
        non_negotiable_details=["Better D"], connections=["Better C"],
        common_traps=["Better T"], five_min_review=["Better R"],
    )
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = BriefRevisionResponse(revised_brief=revised)
        result = revise_brief(state)

    assert result["mastery_brief"].core_ideas[0].idea == "Better X"
    assert result["brief_revision_count"] == 1
```

**Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_judge_brief_scores_brief tests/pipeline/test_nodes.py::test_revise_brief_rewrites_brief -v
```
Expected: FAIL

**Step 3: Implement both nodes**

```python
JUDGE_BRIEF_SYSTEM_PROMPT = """Score the mastery brief. Be ruthless — a vague overview should score below 0.5.

Criteria (0.0–1.0 each):
- **specificity_score**: Does each core idea name a specific mechanism, definition, or relationship? Or is it a vague topic label?
- **density_score**: Is every sentence information-dense? Could any sentence be deleted without losing information?
- **leverage_score**: Are these truly the ~20% of ideas that carry ~80% of value? Or is it just "everything in order"?
- **anti_summary_score**: Would this pass as a generic textbook summary? If yes, score LOW. A good brief sounds like expert notes, not a book jacket.
- **connections_score**: Does it show HOW ideas connect (cause-effect, dependency, condition)? Or just list them adjacently?

Threshold: overall_score ≥ 0.8 to pass. Provide specific, actionable feedback for any score below 0.8."""


def judge_brief(state: GraphState) -> dict:
    """Score the mastery brief on specificity, density, leverage, anti-summary, and connections."""
    from note_taker.models import BriefJudgement

    brief = state["mastery_brief"]
    brief_text = brief.model_dump_json(indent=2)

    prompt = f"System: {JUDGE_BRIEF_SYSTEM_PROMPT}\n\nUser: Mastery Brief:\n{brief_text}"

    judgement = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=BriefJudgement,
        token_estimate=800,
        tier="reasoning",
    )

    return {"brief_judgement": judgement}


REVISE_BRIEF_SYSTEM_PROMPT = """Rewrite the mastery brief to fix the issues identified in the feedback.

You must produce a complete, revised MasteryBrief. Do not just patch — rewrite with the feedback in mind.

The feedback is from a strict judge. Address every criticism. If the judge says "too vague", add specific mechanisms. If the judge says "reads like a summary", rewrite to sound like expert notes.

Anti-patterns to AVOID:
- "This chapter discusses X" (topic label)
- "Y is important" (assertion without mechanism)
- Listing every concept (that's an outline, not 80/20)"""


def revise_brief(state: GraphState) -> dict:
    """Rewrite the mastery brief based on judge feedback (reasoning tier)."""
    from note_taker.models import BriefRevisionResponse

    brief = state["mastery_brief"]
    judgement = state["brief_judgement"]

    prompt = (
        f"System: {REVISE_BRIEF_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Current Brief\n{brief.model_dump_json(indent=2)}\n\n"
        f"### Judge Feedback\n{judgement.feedback}\n\n"
        f"### Judge Scores\n"
        f"specificity={judgement.specificity_score}, density={judgement.density_score}, "
        f"leverage={judgement.leverage_score}, anti_summary={judgement.anti_summary_score}, "
        f"connections={judgement.connections_score}"
    )

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=BriefRevisionResponse,
        token_estimate=1200,
        tier="reasoning",
    )

    return {
        "mastery_brief": response.revised_brief,
        "brief_revision_count": state.get("brief_revision_count", 0) + 1,
    }
```

**Step 4: Run tests to verify they pass**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_judge_brief_scores_brief tests/pipeline/test_nodes.py::test_revise_brief_rewrites_brief -v
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(nodes): add judge_brief and revise_brief nodes"
```

---

### Task 6: V2 `qa_draft` Node

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/pipeline/test_nodes.py`

**Context:** Replace the old `qa_draft_node`. The V2 version derives Q&A cards from the approved `MasteryBrief`'s core ideas — one card per `CoreIdea`. The prompt anchors on the brief, not the outline.

**Step 1: Write failing test**

```python
def test_qa_draft_v2_derives_from_brief():
    """V2 qa_draft should derive Q&A pairs from the MasteryBrief's core ideas."""
    from note_taker.pipeline.nodes import qa_draft
    from note_taker.models import MasteryBrief, CoreIdea, QADraftResponse, LLMQuestionAnswerPair

    state = {
        "mastery_brief": MasteryBrief(
            core_ideas=[
                CoreIdea(idea="Gradient descent", why_it_matters="Foundation of training", mechanism="θ = θ - α∇L"),
                CoreIdea(idea="Backpropagation", why_it_matters="Enables gradient computation", mechanism="Chain rule"),
            ],
            non_negotiable_details=["D"], connections=["C"],
            common_traps=["T"], five_min_review=["R"],
        ),
        "source_hash": "abc",
        "source_chunks": [{"title": "ML Basics", "content": "Source text about ML."}],
    }

    mock_qa = QADraftResponse(qa_pairs=[
        LLMQuestionAnswerPair(question="Q1", answer="A1", source_context="S1"),
        LLMQuestionAnswerPair(question="Q2", answer="A2", source_context="S2"),
    ])
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_qa
        result = qa_draft(state)

    assert result["artifact"] is not None
    assert result["artifact"].version == 2
    assert len(result["artifact"].qa_pairs) == 2
    assert result["artifact"].mastery_brief is not None
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_qa_draft_v2_derives_from_brief -v
```

**Step 3: Implement V2 `qa_draft`**

```python
QA_V2_SYSTEM_PROMPT = """You are a study-card generator.

Task: Given a mastery brief, output EXACTLY one active-recall Q&A pair for every core idea — no more, no fewer.

Field contract:
- question : single sentence; tests the core mechanism or concept; self-contained (no "According to the text…")
- answer   : 1–3 sentences; fully answers the question using only information from the source
- source_context : ≤ 2 verbatim or near-verbatim sentences from the source that support the answer

Each Q&A pair should test UNDERSTANDING of the mechanism, not just recall of a label.
Do NOT invent facts outside the source. Do NOT add commentary."""


def qa_draft(state: GraphState) -> dict:
    """Generate Q&A pairs from the approved mastery brief (fast tier)."""
    from note_taker.models import QADraftResponse, FinalArtifactV2, QuestionAnswerPair

    brief = state["mastery_brief"]
    source_text = "\n\n---\n\n".join(
        f"### {c['title']}\n{c['content']}" for c in state["source_chunks"]
    )

    brief_text = brief.model_dump_json(indent=2)
    prompt = (
        f"System: {QA_V2_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Mastery Brief ({len(brief.core_ideas)} core ideas → generate {len(brief.core_ideas)} Q&A pairs)\n"
        f"{brief_text}\n\n"
        f"### Source Text\n{source_text}"
    )

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=QADraftResponse,
        token_estimate=600,
        tier="fast",
    )

    qa_pairs = [
        QuestionAnswerPair(question=qa.question, answer=qa.answer, source_context=qa.source_context)
        for qa in response.qa_pairs
    ]

    artifact = FinalArtifactV2(
        source_hash=state["source_hash"],
        mastery_brief=brief,
        qa_pairs=qa_pairs,
    )

    return {"artifact": artifact}
```

**Step 4: Run test to verify it passes**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_qa_draft_v2_derives_from_brief -v
```

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(nodes): add V2 qa_draft that derives Q&As from mastery brief"
```

---

### Task 7: V2 `judge_qa` + `revise_qa` Nodes

**Files:**
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/pipeline/test_nodes.py`

**Context:** These are very similar to the existing V1 `judge_node` and `revise_node`, but they now operate on `FinalArtifactV2` and use `qa_revision_count` instead of `revision_count`. The judge threshold stays at 0.8. Rename to `judge_qa` and `revise_qa` for clarity.

**Step 1: Write failing tests**

```python
def test_judge_qa_v2_scores_pairs():
    """judge_qa should score Q&A pairs on a FinalArtifactV2."""
    from note_taker.pipeline.nodes import judge_qa
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair, JudgeVerdict, QAJudgement

    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["D"], connections=["C"],
        common_traps=["T"], five_min_review=["R"],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="abc",
            mastery_brief=brief,
            qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S")],
        ),
    }

    mock_verdict = JudgeVerdict(judgements=[
        QAJudgement(question_index=0, accuracy_score=0.9, clarity_score=0.8,
                    recall_worthiness_score=0.85, overall_score=0.85, feedback="Good.")
    ])
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_verdict
        result = judge_qa(state)

    assert result["artifact"].qa_pairs[0].judge_score == 0.85


def test_revise_qa_v2_replaces_failing():
    """revise_qa should replace failing Q&A pairs on FinalArtifactV2."""
    from note_taker.pipeline.nodes import revise_qa
    from note_taker.models import (
        FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair,
        RevisionResponse, LLMQuestionAnswerPair,
    )

    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["D"], connections=["C"],
        common_traps=["T"], five_min_review=["R"],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="abc",
            mastery_brief=brief,
            qa_pairs=[
                QuestionAnswerPair(question="Bad Q", answer="Bad A", source_context="S",
                                   judge_score=0.4, judge_feedback="Vague"),
            ],
        ),
        "qa_revision_count": 0,
        "source_chunks": [{"title": "T", "content": "Source text."}],
    }

    mock_response = RevisionResponse(revised_pairs=[
        LLMQuestionAnswerPair(question="Better Q", answer="Better A", source_context="S")
    ])
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_response
        result = revise_qa(state)

    assert result["artifact"].qa_pairs[0].question == "Better Q"
    assert result["qa_revision_count"] == 1
```

**Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_judge_qa_v2_scores_pairs tests/pipeline/test_nodes.py::test_revise_qa_v2_replaces_failing -v
```

**Step 3: Implement `judge_qa` and `revise_qa`** (mostly rename + adapt from V1)

```python
def judge_qa(state: GraphState) -> dict:
    """Score each Q&A pair on accuracy, clarity, and recall-worthiness."""
    from note_taker.models import JudgeVerdict

    qa_text = "\n".join(
        f"[{i}] Q: {qa.question}\n    A: {qa.answer}\n    Context: {qa.source_context}"
        for i, qa in enumerate(state["artifact"].qa_pairs)
    )

    prompt = f"System: {JUDGE_SYSTEM_PROMPT}\n\nUser: Q&A Pairs:\n{qa_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt, schema=JudgeVerdict, token_estimate=800, tier="fast",
    )

    artifact = state["artifact"]
    for judgement in response.judgements:
        idx = judgement.question_index
        if 0 <= idx < len(artifact.qa_pairs):
            artifact.qa_pairs[idx].judge_score = judgement.overall_score
            artifact.qa_pairs[idx].judge_feedback = judgement.feedback

    return {"artifact": artifact}


def revise_qa(state: GraphState) -> dict:
    """Rewrite Q&A pairs that scored < 0.8 based on feedback."""
    from note_taker.models import RevisionResponse, QuestionAnswerPair

    artifact = state["artifact"]
    failing_indices = [
        i for i, qa in enumerate(artifact.qa_pairs)
        if qa.judge_score is None or qa.judge_score < 0.8
    ]

    if not failing_indices:
        return {"qa_revision_count": state.get("qa_revision_count", 0) + 1}

    failing_text = "\n".join(
        f"[{i}] Q: {artifact.qa_pairs[i].question}\n"
        f"    A: {artifact.qa_pairs[i].answer}\n"
        f"    Feedback: {artifact.qa_pairs[i].judge_feedback}"
        for i in failing_indices
    )

    source_text = "\n\n".join(c["content"] for c in state["source_chunks"])
    prompt = f"System: {REVISE_SYSTEM_PROMPT}\n\nUser: Source:\n{source_text}\n\nPairs to Revise:\n{failing_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt, schema=RevisionResponse, token_estimate=600, tier="fast",
    )

    if len(response.revised_pairs) == len(failing_indices):
        for idx, revised_qa in zip(failing_indices, response.revised_pairs):
            new_qa = QuestionAnswerPair(
                question=revised_qa.question, answer=revised_qa.answer, source_context=revised_qa.source_context,
            )
            artifact.qa_pairs[idx] = new_qa

    return {
        "artifact": artifact,
        "qa_revision_count": state.get("qa_revision_count", 0) + 1,
    }
```

**Step 4: Run tests**

```bash
uv run pytest tests/pipeline/test_nodes.py::test_judge_qa_v2_scores_pairs tests/pipeline/test_nodes.py::test_revise_qa_v2_replaces_failing -v
```

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/nodes.py tests/pipeline/test_nodes.py
git commit -m "feat(nodes): add V2 judge_qa and revise_qa nodes"
```

---

### Task 8: V2 `save_to_db` + Database Migration

**Files:**
- Modify: `src/note_taker/database.py`
- Modify: `src/note_taker/pipeline/nodes.py`
- Modify: `tests/test_database.py`

**Context:** `DatabaseManager` currently hardcodes `FinalArtifactV1`. Update `get_artifact` and `save_artifact` to handle `FinalArtifactV2`. Since the design says "clean slate", we just change the model type. The `save_to_db` node in `nodes.py` needs a minor update since `state["artifact"]` is now `FinalArtifactV2`.

**Step 1: Write failing test**

```python
# Add to tests/test_database.py
def test_save_and_retrieve_v2_artifact(tmp_path):
    """DatabaseManager should persist and retrieve FinalArtifactV2."""
    from note_taker.database import DatabaseManager
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair

    DatabaseManager._instance = None
    db = DatabaseManager(db_path=str(tmp_path / "v2_test.db"))
    db.ensure_database()

    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["D"], connections=["C"],
        common_traps=["T"], five_min_review=["R"],
    )
    artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=brief,
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S")],
    )

    db.save_artifact("test:001", artifact)
    retrieved = db.get_artifact("test:001")

    assert retrieved is not None
    assert retrieved.version == 2
    assert retrieved.mastery_brief.core_ideas[0].idea == "X"
    assert len(retrieved.qa_pairs) == 1
```

**Step 2: Run test to verify it fails**

```bash
uv run pytest tests/test_database.py::test_save_and_retrieve_v2_artifact -v
```

**Step 3: Update `database.py` to use `FinalArtifactV2`**

Replace `FinalArtifactV1` import with `FinalArtifactV2` and update method signatures. Update `save_to_db` node similarly.

**Step 4: Run tests**

```bash
uv run pytest tests/test_database.py -v
```

**Step 5: Commit**

```bash
git add src/note_taker/database.py src/note_taker/pipeline/nodes.py tests/test_database.py
git commit -m "feat(database): migrate to FinalArtifactV2"
```

---

### Task 9: V2 Graph Assembly

**Files:**
- Modify: `src/note_taker/pipeline/graph.py`
- Modify: `tests/pipeline/test_graph.py`

**Context:** Replace the entire graph. The new graph has 8 nodes and two conditional routing functions: `should_continue_brief` (routes from `judge_brief`) and `should_continue_qa` (routes from `judge_qa`). No more `check_database_node` — the CLI handles cache checks directly.

**Step 1: Write failing tests**

```python
# tests/pipeline/test_graph.py — replace entirely
import pytest
from unittest.mock import patch
from note_taker.pipeline.graph import build_graph, should_continue_brief, should_continue_qa


def test_should_continue_brief_passes():
    """If brief_judgement.overall_score >= 0.8, route to qa_draft."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.9, density_score=0.9, leverage_score=0.9,
            anti_summary_score=0.9, connections_score=0.9,
            overall_score=0.9, feedback="Excellent.",
        ),
        "brief_revision_count": 0,
    }
    assert should_continue_brief(state) == "qa_draft"


def test_should_continue_brief_fails_under_limit():
    """If brief score < 0.8 and under revision limit, route to revise_brief."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.5, density_score=0.5, leverage_score=0.5,
            anti_summary_score=0.5, connections_score=0.5,
            overall_score=0.5, feedback="Too vague.",
        ),
        "brief_revision_count": 1,
    }
    assert should_continue_brief(state) == "revise_brief"


def test_should_continue_brief_hits_limit():
    """If brief revision limit reached, force qa_draft anyway."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.5, density_score=0.5, leverage_score=0.5,
            anti_summary_score=0.5, connections_score=0.5,
            overall_score=0.5, feedback="Still vague.",
        ),
        "brief_revision_count": 3,
    }
    assert should_continue_brief(state) == "qa_draft"


def test_should_continue_qa_all_passing():
    """If all QA scores >= 0.8, route to save_to_db."""
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="h", mastery_brief=brief,
            qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S", judge_score=0.9)],
        ),
        "qa_revision_count": 0,
    }
    assert should_continue_qa(state) == "save_to_db"


def test_should_continue_qa_needs_revision():
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="h", mastery_brief=brief,
            qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S", judge_score=0.5)],
        ),
        "qa_revision_count": 1,
    }
    assert should_continue_qa(state) == "revise_qa"


def test_build_graph_v2_compiles():
    """V2 build_graph should return a compiled graph with invoke."""
    graph = build_graph()
    assert hasattr(graph, "invoke")
```

**Step 2: Run tests to verify they fail**

```bash
uv run pytest tests/pipeline/test_graph.py -v
```

**Step 3: Implement V2 graph**

```python
# src/note_taker/pipeline/graph.py
from langgraph.graph import StateGraph, START, END
from note_taker.pipeline.state import GraphState
from note_taker.pipeline.nodes import (
    generate_outlines,
    synthesize_brief,
    judge_brief,
    revise_brief,
    qa_draft,
    judge_qa,
    revise_qa,
    save_to_db,
)

MAX_BRIEF_REVISIONS = 3
MAX_QA_REVISIONS = 3


def should_continue_brief(state: GraphState) -> str:
    """Route after judge_brief: pass → qa_draft, fail → revise_brief (up to limit)."""
    if state.get("brief_revision_count", 0) >= MAX_BRIEF_REVISIONS:
        return "qa_draft"

    judgement = state.get("brief_judgement")
    if judgement and judgement.overall_score >= 0.8:
        return "qa_draft"

    return "revise_brief"


def should_continue_qa(state: GraphState) -> str:
    """Route after judge_qa: pass → save_to_db, fail → revise_qa (up to limit)."""
    if state.get("qa_revision_count", 0) >= MAX_QA_REVISIONS:
        return "save_to_db"

    artifact = state.get("artifact")
    if not artifact:
        return "save_to_db"

    failing = [qa for qa in artifact.qa_pairs if qa.judge_score is None or qa.judge_score < 0.8]
    if failing:
        return "revise_qa"

    return "save_to_db"


def build_graph() -> StateGraph:
    graph = StateGraph(GraphState)

    graph.add_node("generate_outlines", generate_outlines)
    graph.add_node("synthesize_brief", synthesize_brief)
    graph.add_node("judge_brief", judge_brief)
    graph.add_node("revise_brief", revise_brief)
    graph.add_node("qa_draft", qa_draft)
    graph.add_node("judge_qa", judge_qa)
    graph.add_node("revise_qa", revise_qa)
    graph.add_node("save_to_db", save_to_db)

    # Linear flow: START → generate_outlines → synthesize_brief → judge_brief
    graph.add_edge(START, "generate_outlines")
    graph.add_edge("generate_outlines", "synthesize_brief")
    graph.add_edge("synthesize_brief", "judge_brief")

    # Brief judge/revise loop
    graph.add_conditional_edges("judge_brief", should_continue_brief)
    graph.add_edge("revise_brief", "judge_brief")

    # QA flow: qa_draft → judge_qa
    graph.add_edge("qa_draft", "judge_qa")

    # QA judge/revise loop
    graph.add_conditional_edges("judge_qa", should_continue_qa)
    graph.add_edge("revise_qa", "judge_qa")

    # Exit
    graph.add_edge("save_to_db", END)

    return graph.compile()
```

**Step 4: Run tests**

```bash
uv run pytest tests/pipeline/test_graph.py -v
```

**Step 5: Commit**

```bash
git add src/note_taker/pipeline/graph.py tests/pipeline/test_graph.py
git commit -m "feat(graph): assemble V2 unified graph with two judge/revise loops"
```

---

### Task 10: CLI Update

**Files:**
- Modify: `src/note_taker/cli.py`
- Modify: `tests/test_cli.py`

**Context:** The CLI currently loops over chunks and invokes the graph per-chunk. V2 invokes ONE graph with all chunks bundled as `source_chunks`. The `check_database` logic moves into the CLI (it was a node before). Hash is computed over all chunks concatenated.

**Step 1: Update CLI to pass `source_chunks` to a single graph invocation**

Replace the per-chunk loop with:

```python
initial_state = {
    "chunk_id": book_chapter,
    "source_chunks": chunks,
    "source_hash": _hash("".join(c["content"] for c in chunks)),
    "force_refresh": bool(force_refresh),
    "chunk_outlines": None,
    "mastery_brief": None,
    "brief_revision_count": 0,
    "artifact": None,
    "qa_revision_count": 0,
    "skip_processing": False,
    "persist_locally": True,
}
graph = build_graph()
graph.invoke(initial_state)
```

**Step 2: Run existing CLI tests**

```bash
uv run pytest tests/test_cli.py -v
```

**Step 3: Commit**

```bash
git add src/note_taker/cli.py tests/test_cli.py
git commit -m "feat(cli): simplify to single graph invocation for V2"
```

---

### Task 11: API Layer Update

**Files:**
- Modify: `src/note_taker/api/generate.py`
- Modify: `src/note_taker/api/schemas.py`
- Modify: `src/note_taker/api/persistence.py`

**Context:** Update `NODE_TO_STAGE` mapping for new node names, update SSE serialization for V2 nodes (e.g., `synthesize_brief`, `judge_brief`), update `persistence.py` to save `MasteryBrief` as JSON column + Q&A cards.

**Step 1: Update `NODE_TO_STAGE` mapping**

```python
NODE_TO_STAGE = {
    "generate_outlines": "outline_scaffolding",
    "synthesize_brief": "synthesize_brief",
    "judge_brief": "judge_brief",
    "revise_brief": "revise_brief",
    "qa_draft": "qa_draft",
    "judge_qa": "judge_qa",
    "revise_qa": "revise_qa",
    "save_to_db": "save",
}
```

**Step 2: Update `_serialize_node_output` for V2 node names**

**Step 3: Update `persistence.py` to save `FinalArtifactV2` (mastery_brief JSON column instead of outline)**

**Step 4: Update `initial_state` in `_generate_events` to match V2 GraphState**

**Step 5: Run API tests**

```bash
uv run pytest tests/api/ -v
```

**Step 6: Commit**

```bash
git add src/note_taker/api/generate.py src/note_taker/api/schemas.py src/note_taker/api/persistence.py
git commit -m "feat(api): update SSE streaming and persistence for V2 pipeline"
```

---

### Task 12: V1 Cleanup + Integration Test

**Files:**
- Modify: `src/note_taker/models.py` (delete V1 models: `DraftResponse`, `FinalArtifactV1`)
- Delete old test files that test V1 behavior
- Modify: `tests/pipeline/test_nodes.py` (remove V1 tests)

**Step 1: Delete V1-only models** (`DraftResponse`, `FinalArtifactV1` if no longer imported)

**Step 2: Run full test suite to verify nothing is broken**

```bash
uv run pytest tests/ -v --tb=short
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove V1 models and tests"
```

---

## Verification Plan

### Automated Tests

All tasks follow TDD. Run the full suite after each task:

```bash
uv run pytest tests/ -v --tb=short
```

**Key test files created/modified:**
| Test File | What It Covers |
|---|---|
| `tests/test_models_v2.py` | V2 Pydantic model creation, validation, serialization |
| `tests/pipeline/test_state_v2.py` | V2 GraphState TypedDict fields |
| `tests/pipeline/test_nodes.py` | All 8 pipeline nodes (mocked LLM calls) |
| `tests/pipeline/test_graph.py` | Graph routing logic: `should_continue_brief`, `should_continue_qa`, compilation |
| `tests/test_database.py` | V2 artifact persistence & retrieval |
| `tests/api/test_generate.py` | SSE event shape for V2 node names |

### Manual Verification

After all tasks are complete, run the CLI against a real markdown file to verify end-to-end:

```bash
source .venv/bin/activate
uv run note-taker process "TestBook:Chapter1" path/to/test-chapter.md --force-refresh
```

Verify:
1. Pipeline runs all 8 nodes without errors
2. The generated `MasteryBrief` contains `core_ideas` (not just a vague summary)
3. Q&A cards are derived from the brief's core ideas
4. Artifact is saved to SQLite
