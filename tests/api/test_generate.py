"""Tests for POST /api/generate SSE endpoint (secured)."""
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from note_taker.api.main import app
from note_taker.models import (
    FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair,
)
from note_taker.api.auth import get_current_user, AuthenticatedUser

client = TestClient(app)

SAMPLE_MARKDOWN = """# Introduction

Agents are systems that reason and act autonomously."""


@pytest.fixture(autouse=True)
def override_auth():
    """Skip real JWT verification in generate tests."""
    mock_user = AuthenticatedUser(id="test-user-uuid")
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()


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


def test_generate_rejects_unauthenticated():
    """POST /api/generate without auth should return 401 (when no override)."""
    app.dependency_overrides.clear()  # Remove the autouse override
    response = client.post(
        "/api/generate",
        json={"markdown": SAMPLE_MARKDOWN, "title": "Test"},
    )
    assert response.status_code in (401, 403)


def test_generate_rejects_empty_markdown():
    """POST /api/generate should return 422 for empty markdown."""
    response = client.post("/api/generate", json={"markdown": "", "title": "Test"})
    assert response.status_code == 422


def test_generate_rejects_missing_title():
    """POST /api/generate should return 422 when title is missing."""
    response = client.post("/api/generate", json={"markdown": SAMPLE_MARKDOWN})
    assert response.status_code == 422


@patch("note_taker.api.generate.save_artifact_to_supabase")
@patch("note_taker.api.generate.get_supabase_client")
def test_generate_returns_sse_stream(mock_get_supabase, mock_save_supabase):
    """POST /api/generate should return a text/event-stream response and save to Supabase."""
    mock_save_supabase.return_value = "new-artifact-id"

    # Build a mock V2 artifact for the pipeline to "yield"
    mock_brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="Auth", why_it_matters="Sec", mechanism="O")],
        non_negotiable_details=[],
        connections=[],
        common_traps=[],
        five_min_review=[]
    )
    
    mock_artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=mock_brief,
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

    # Mock the compiled graph's .stream() to yield V2 node updates
    mock_graph = MagicMock()
    mock_graph.stream.return_value = iter([
        {"generate_outlines": {"chunk_outlines": ["outline1"]}},
        {"synthesize_brief": {"mastery_brief": mock_brief}},
        {"qa_draft": {"artifact": mock_artifact}},
        {"judge_qa": {"artifact": mock_artifact}},
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

    # Must have stage updates, saving to supabase stage, and a completion event
    assert "stage_update" in event_types
    assert "complete" in event_types
    
    # Verify saving_to_supabase stage event
    saving_events = [e for e in events if e.get("event") == "stage_update" and e.get("data", {}).get("stage") == "saving_to_supabase"]
    assert len(saving_events) >= 1
    
    # Verify final completion event has artifact_id
    complete_event = [e for e in events if e.get("event") == "complete"][0]
    assert complete_event["data"]["artifact_id"] == "new-artifact-id"


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

