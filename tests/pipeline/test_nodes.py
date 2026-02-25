import os
import pytest
from unittest.mock import patch
from note_taker.pipeline.nodes import draft_node
from note_taker.pipeline.state import GraphState
from note_taker.models import DraftResponse, OutlineItem, QuestionAnswerPair

@pytest.fixture(autouse=True)
def mock_groq_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test_key")

@pytest.fixture
def base_state():
    return GraphState(
        chunk_id="Test:Ch1:000",
        source_content="# Introduction\n\nAgents are systems that reason and act autonomously.",
        source_hash="abc123",
        force_refresh=False,
        artifact=None,
        skip_processing=False,
        revision_count=0,
    )

def test_draft_node_creates_artifact(base_state):
    """draft_node should create a FinalArtifactV1 with outline and qa_pairs."""
    mock_response = DraftResponse(
        outline=[OutlineItem(title="Introduction", level=1)],
        qa_pairs=[QuestionAnswerPair(
            question="What are agents?",
            answer="Systems that reason and act autonomously.",
            source_context="Agents are systems that reason and act autonomously.",
        )]
    )
    with patch("note_taker.pipeline.nodes.get_llm") as mock_llm:
        mock_llm.return_value.with_structured_output.return_value.invoke.return_value = mock_response
        result = draft_node(base_state)

    assert result["artifact"] is not None
    assert len(result["artifact"].outline) == 1
    assert len(result["artifact"].qa_pairs) == 1
    assert result["artifact"].source_hash == "abc123"