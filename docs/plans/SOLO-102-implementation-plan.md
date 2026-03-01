# Expose LangGraph Pipeline as SSE Endpoint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `POST /api/generate` endpoint in FastAPI that accepts Markdown text, runs the LangGraph pipeline, and streams Server-Sent Events (SSE) back to the client for each pipeline stage (Check → Outline → QA Draft → Judge → Revise → Save).

**Architecture:** We will add a new route module (`src/note_taker/api/generate.py`) that wraps the existing LangGraph pipeline (`src/note_taker/pipeline/graph.py`). Instead of running the graph synchronously, we'll use LangGraph's `.stream()` method which yields state updates per node. Each node completion is converted into an SSE event with a `stage` name and `data` payload, streamed via FastAPI's `StreamingResponse`. The `sse-starlette` package provides proper SSE formatting.

**Tech Stack:** FastAPI, LangGraph (`.stream()`), `sse-starlette`, Pytest, `httpx` (TestClient)

**Linear Issue:** [SOLO-102](https://linear.app/aaron-solo/issue/SOLO-102/expose-langgraph-pipeline-as-sse-endpoint)

**Estimated Total Time:** ~2–3 hours

---

## Background & Key Context

### Existing Pipeline Flow

The LangGraph state machine in `src/note_taker/pipeline/graph.py` follows this flow:

```
START → check_database_node → outline_draft_node → qa_draft_node → judge_node → [revise_node ↔ judge_node] → save_to_db_node → END
```

Each node receives and returns a `GraphState` TypedDict:

```python
class GraphState(TypedDict):
    chunk_id: str
    source_content: str
    source_hash: str
    force_refresh: bool
    artifact: Optional[FinalArtifactV1]
    skip_processing: bool
    outline: Optional[OutlineResponse]
    revision_count: int
```

### Existing API Scaffold

`src/note_taker/api/main.py` already has a FastAPI app with CORS configured. Routes are in `src/note_taker/api/routes.py` (currently only `/health`).

### SSE Event Format

Each SSE event sent to the client should follow this structure:

```
event: stage_update
data: {"stage": "outline_draft", "status": "completed", "data": {...}}

event: stage_update
data: {"stage": "judge", "status": "completed", "data": {"revision_count": 1, "failing_count": 2}}

event: complete
data: {"artifact": {...}}

event: error
data: {"message": "Pipeline failed: ..."}
```

---

## Task 1: Add `sse-starlette` Dependency (~5 min)

**Files:**
- Modify: `pyproject.toml`

**Step 1: Add the dependency**

Add `sse-starlette` to the `dependencies` list in `pyproject.toml`:

```toml
dependencies = [
    # ... existing deps ...
    "sse-starlette>=1.6.0",
]
```

**Step 2: Install**

Run: `uv pip install -e .`
Expected: Successfully installs `sse-starlette`.

**Step 3: Commit**

```bash
git add pyproject.toml uv.lock
git commit -m "build: add sse-starlette dependency for SSE streaming"
```

---

## Task 2: Create Request/Response Models (~10 min)

**Files:**
- Create: `src/note_taker/api/schemas.py`

**Step 1: Write the module**

```python
"""API request/response schemas for the generate endpoint."""
from pydantic import BaseModel, Field
from typing import Optional


class GenerateRequest(BaseModel):
    """POST body for /api/generate."""
    markdown: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Markdown text to process through the pipeline",
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Title for the generated artifact",
    )
    force_refresh: bool = Field(
        default=False,
        description="If True, skip the cache check and re-process",
    )


class SSEStageEvent(BaseModel):
    """Data payload for a stage_update SSE event."""
    stage: str
    status: str  # "started" | "completed" | "skipped"
    data: Optional[dict] = None


class SSECompleteEvent(BaseModel):
    """Data payload for the final 'complete' SSE event."""
    artifact: dict


class SSEErrorEvent(BaseModel):
    """Data payload for an 'error' SSE event."""
    message: str
```

**Step 2: Commit**

```bash
git add src/note_taker/api/schemas.py
git commit -m "feat: add request/response schemas for generate endpoint"
```

---

## Task 3: Write Failing Tests for the Generate Endpoint (~15 min)

**Files:**
- Create: `tests/api/test_generate.py`

**Step 1: Write the test file**

```python
"""Tests for POST /api/generate SSE endpoint."""
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from note_taker.api.main import app
from note_taker.models import (
    FinalArtifactV1, OutlineItem, QuestionAnswerPair, OutlineResponse,
)

client = TestClient(app)

SAMPLE_MARKDOWN = "# Introduction\n\nAgents are systems that reason and act autonomously."


def _parse_sse_events(response_text: str) -> list[dict]:
    """Parse SSE response text into a list of event dicts."""
    events = []
    current_event = {}
    for line in response_text.strip().split("\n"):
        line = line.strip()
        if line.startswith("event:"):
            current_event["event"] = line[len("event:"):].strip()
        elif line.startswith("data:"):
            current_event["data"] = json.loads(line[len("data:"):].strip())
        elif line == "" and current_event:
            events.append(current_event)
            current_event = {}
    if current_event:
        events.append(current_event)
    return events


def test_generate_rejects_empty_markdown():
    """POST /api/generate should return 422 for empty markdown."""
    response = client.post("/api/generate", json={"markdown": "", "title": "Test"})
    assert response.status_code == 422


def test_generate_rejects_missing_title():
    """POST /api/generate should return 422 when title is missing."""
    response = client.post("/api/generate", json={"markdown": SAMPLE_MARKDOWN})
    assert response.status_code == 422


def test_generate_returns_sse_stream():
    """POST /api/generate should return a text/event-stream response."""
    # Build a mock artifact for the pipeline to "yield"
    mock_artifact = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="Intro", level=1)],
        qa_pairs=[
            QuestionAnswerPair(
                question="What are agents?",
                answer="Systems that reason and act.",
                source_context="Agents are systems...",
                judge_score=0.9,
                judge_feedback="Good.",
            )
        ],
    )

    # Mock the compiled graph's .stream() to yield node updates
    mock_graph = MagicMock()
    mock_graph.stream.return_value = iter([
        {"check_database_node": {"skip_processing": False, "source_hash": "abc123"}},
        {"outline_draft_node": {"outline": OutlineResponse(outline=[OutlineItem(title="Intro", level=1)])}},
        {"qa_draft_node": {"artifact": mock_artifact}},
        {"judge_node": {"artifact": mock_artifact}},
        {"save_to_db_node": {}},
    ])

    with patch("note_taker.api.generate.build_graph", return_value=mock_graph):
        response = client.post(
            "/api/generate",
            json={"markdown": SAMPLE_MARKDOWN, "title": "Test Chapter"},
        )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    events = _parse_sse_events(response.text)
    event_types = [e["event"] for e in events]

    # Must have stage updates and a completion event
    assert "stage_update" in event_types
    assert "complete" in event_types


def test_generate_handles_pipeline_error():
    """POST /api/generate should emit an error SSE event on pipeline failure."""
    mock_graph = MagicMock()
    mock_graph.stream.side_effect = RuntimeError("LLM provider unavailable")

    with patch("note_taker.api.generate.build_graph", return_value=mock_graph):
        response = client.post(
            "/api/generate",
            json={"markdown": SAMPLE_MARKDOWN, "title": "Test Chapter"},
        )

    assert response.status_code == 200  # SSE always returns 200, errors in stream
    events = _parse_sse_events(response.text)
    error_events = [e for e in events if e.get("event") == "error"]
    assert len(error_events) >= 1
    assert "LLM provider unavailable" in error_events[0]["data"]["message"]


def test_generate_skipped_processing():
    """When the cache hits (skip_processing=True), should emit a 'skipped' event."""
    mock_artifact = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="T", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C", judge_score=0.9)],
    )

    mock_graph = MagicMock()
    mock_graph.stream.return_value = iter([
        {"check_database_node": {"skip_processing": True, "artifact": mock_artifact, "source_hash": "abc123"}},
    ])

    with patch("note_taker.api.generate.build_graph", return_value=mock_graph):
        response = client.post(
            "/api/generate",
            json={"markdown": SAMPLE_MARKDOWN, "title": "Cached"},
        )

    events = _parse_sse_events(response.text)
    # Should have a complete event with the cached artifact
    complete_events = [e for e in events if e.get("event") == "complete"]
    assert len(complete_events) == 1
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/api/test_generate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'note_taker.api.generate'`

**Step 3: Commit**

```bash
git add tests/api/test_generate.py
git commit -m "test: add failing tests for POST /api/generate SSE endpoint"
```

---

## Task 4: Implement the Generate Endpoint (~30 min)

**Files:**
- Create: `src/note_taker/api/generate.py`
- Modify: `src/note_taker/api/main.py`

**Step 1: Create the generate route module**

File: `src/note_taker/api/generate.py`

```python
"""SSE streaming endpoint for the LangGraph pipeline."""
import json
import hashlib
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from note_taker.api.schemas import GenerateRequest, SSEStageEvent, SSEErrorEvent
from note_taker.pipeline.graph import build_graph

logger = logging.getLogger(__name__)

router = APIRouter()

# Map LangGraph node names to user-friendly stage labels
NODE_TO_STAGE = {
    "check_database_node": "check",
    "outline_draft_node": "outline_draft",
    "qa_draft_node": "qa_draft",
    "judge_node": "judge",
    "revise_node": "revise",
    "save_to_db_node": "save",
}


def _serialize_node_output(node_name: str, output: dict) -> dict | None:
    """Extract serializable summary data from a node's state update."""
    if node_name == "check_database_node":
        return {"skip_processing": output.get("skip_processing", False)}
    if node_name == "outline_draft_node":
        outline = output.get("outline")
        if outline and hasattr(outline, "outline"):
            return {"item_count": len(outline.outline)}
        return {}
    if node_name in ("qa_draft_node", "judge_node", "revise_node"):
        artifact = output.get("artifact")
        if artifact and hasattr(artifact, "qa_pairs"):
            failing = sum(
                1 for qa in artifact.qa_pairs
                if qa.judge_score is None or qa.judge_score < 0.7
            )
            return {
                "qa_count": len(artifact.qa_pairs),
                "failing_count": failing,
                "revision_count": output.get("revision_count", 0),
            }
        return {}
    return {}


def _artifact_to_dict(artifact) -> dict:
    """Serialize a FinalArtifactV1 to a JSON-safe dict."""
    return json.loads(artifact.model_dump_json())


async def _generate_events(request: GenerateRequest) -> AsyncGenerator[dict, None]:
    """Run the pipeline and yield SSE events for each node completion."""
    chunk_id = hashlib.sha256(
        f"{request.title}:{request.markdown[:200]}".encode()
    ).hexdigest()[:16]

    initial_state = {
        "chunk_id": chunk_id,
        "source_content": request.markdown,
        "source_hash": "",
        "force_refresh": request.force_refresh,
        "artifact": None,
        "outline": None,
        "skip_processing": False,
        "revision_count": 0,
    }

    try:
        graph = build_graph()
        last_artifact = None

        for node_output in graph.stream(initial_state):
            # LangGraph stream yields {node_name: {state_updates}}
            for node_name, output in node_output.items():
                stage = NODE_TO_STAGE.get(node_name, node_name)

                # Track the latest artifact
                if "artifact" in output and output["artifact"] is not None:
                    last_artifact = output["artifact"]

                # Check if processing was skipped (cache hit)
                if node_name == "check_database_node" and output.get("skip_processing"):
                    if last_artifact is None and "artifact" in output:
                        last_artifact = output["artifact"]

                    yield {
                        "event": "stage_update",
                        "data": SSEStageEvent(
                            stage=stage,
                            status="skipped",
                            data={"reason": "cached"},
                        ).model_dump_json(),
                    }

                    # Emit complete with cached artifact
                    if last_artifact:
                        yield {
                            "event": "complete",
                            "data": json.dumps({"artifact": _artifact_to_dict(last_artifact)}),
                        }
                    return

                # Normal stage completion
                summary = _serialize_node_output(node_name, output)
                yield {
                    "event": "stage_update",
                    "data": SSEStageEvent(
                        stage=stage,
                        status="completed",
                        data=summary,
                    ).model_dump_json(),
                }

        # Emit final completion
        if last_artifact:
            yield {
                "event": "complete",
                "data": json.dumps({"artifact": _artifact_to_dict(last_artifact)}),
            }
        else:
            yield {
                "event": "error",
                "data": SSEErrorEvent(message="Pipeline completed without producing an artifact.").model_dump_json(),
            }

    except Exception as e:
        logger.exception("Pipeline error")
        yield {
            "event": "error",
            "data": SSEErrorEvent(message=f"Pipeline failed: {str(e)}").model_dump_json(),
        }


@router.post("/api/generate")
async def generate(request: GenerateRequest):
    """Stream pipeline progress as Server-Sent Events."""
    return EventSourceResponse(_generate_events(request))
```

**Step 2: Register the router in `main.py`**

Add to `src/note_taker/api/main.py` (after the existing `app.include_router(api_router)` line):

```python
from note_taker.api.generate import router as generate_router
app.include_router(generate_router)
```

**Step 3: Run tests to verify they pass**

Run: `pytest tests/api/test_generate.py -v`
Expected: All 5 tests PASS.

**Step 4: Run the full existing test suite**

Run: `pytest tests/ -v --tb=short`
Expected: All existing tests still pass (no regressions).

**Step 5: Commit**

```bash
git add src/note_taker/api/generate.py src/note_taker/api/main.py src/note_taker/api/schemas.py
git commit -m "feat(api): add POST /api/generate SSE streaming endpoint"
```

---

## Task 5: Manual Smoke Test (~10 min)

**Step 1: Start the dev server**

```bash
uv run uvicorn note_taker.api.main:app --reload --port 8000
```

**Step 2: Test with curl**

```bash
curl -N -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"markdown": "# Test\n\nAgents are autonomous systems.", "title": "Test Chapter"}'
```

Expected: You should see SSE events streaming back one at a time:

```
event: stage_update
data: {"stage": "check", "status": "completed", "data": {"skip_processing": false}}

event: stage_update
data: {"stage": "outline_draft", "status": "completed", "data": {"item_count": 2}}

...

event: complete
data: {"artifact": {...}}
```

**Step 3: Commit (if any tweaks needed)**

```bash
git add -A
git commit -m "fix: address smoke test issues for generate endpoint"
```

---

## Verification Plan

### Automated Tests

```bash
# Run only generate endpoint tests
pytest tests/api/test_generate.py -v

# Run full test suite for regressions
pytest tests/ -v --tb=short
```

### Manual Verification

1. Start the server: `uv run uvicorn note_taker.api.main:app --reload --port 8000`
2. Visit `http://localhost:8000/docs` and confirm the `/api/generate` endpoint appears in the OpenAPI docs
3. Use the `curl -N` command above to verify SSE streaming works end-to-end
4. Verify the `/health` endpoint still works: `curl http://localhost:8000/health`

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LangGraph `.stream()` API breaks | High | Pin `langgraph>=0.6.11` in `pyproject.toml` |
| Rate limit 429s during streaming | Medium | Existing `invoke_with_backoff` + `TokenTracker` handles this |
| Large markdown inputs cause timeout | Medium | `max_length=50_000` on request schema; consider adding timeout later |
| SSE connection drops mid-stream | Low | Client should reconnect or show partial results |
