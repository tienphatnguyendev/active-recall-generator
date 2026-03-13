"""Tests for Supabase persistence logic."""
import pytest
from unittest.mock import MagicMock, patch
from note_taker.api.persistence import save_artifact_to_supabase
from note_taker.models import (
    FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair,
)


@pytest.fixture
def sample_artifact():
    return FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=MasteryBrief(
            core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
            non_negotiable_details=[],
            connections=[],
            common_traps=[],
            five_min_review=[]
        ),
        qa_pairs=[
            QuestionAnswerPair(
                question="What are agents?",
                answer="Autonomous systems.",
                source_context="Agents are systems...",
                judge_score=0.9,
                judge_feedback="Good.",
            ),
            QuestionAnswerPair(
                question="What is reasoning?",
                answer="Logical thinking.",
                source_context="Reasoning is...",
                judge_score=0.85,
                judge_feedback="Clear.",
            ),
        ],
    )


def test_save_artifact_inserts_artifact_and_cards(sample_artifact):
    """save_artifact_to_supabase should insert into artifacts then cards."""
    mock_client = MagicMock()

    # Mock the artifacts insert to return an ID
    mock_artifact_response = MagicMock()
    mock_artifact_response.data = [{"id": "artifact-uuid-123"}]
    mock_client.table.return_value.insert.return_value.execute.return_value = (
        mock_artifact_response
    )

    result = save_artifact_to_supabase(
        client=mock_client,
        user_id="user-uuid-456",
        title="Test Chapter",
        artifact=sample_artifact,
    )

    # Check artifacts table was called
    calls = mock_client.table.call_args_list
    table_names = [c[0][0] for c in calls]
    assert "artifacts" in table_names
    assert "cards" in table_names

    # Verify the returned artifact ID
    assert result == "artifact-uuid-123"


def test_save_artifact_maps_cards_correctly(sample_artifact):
    """Each QA pair should map to a card row with correct fields."""
    mock_client = MagicMock()

    mock_artifact_response = MagicMock()
    mock_artifact_response.data = [{"id": "art-id"}]

    mock_cards_response = MagicMock()
    mock_cards_response.data = [{"id": "card-1"}, {"id": "card-2"}]

    # First call = artifacts, second call = cards
    mock_client.table.return_value.insert.return_value.execute.side_effect = [
        mock_artifact_response,
        mock_cards_response,
    ]

    save_artifact_to_supabase(
        client=mock_client,
        user_id="user-id",
        title="Title",
        artifact=sample_artifact,
    )

    # Get the cards insert call
    insert_calls = mock_client.table.return_value.insert.call_args_list
    # Second insert call should be for the cards
    cards_data = insert_calls[1][0][0]
    assert len(cards_data) == 2
    assert cards_data[0]["question"] == "What are agents?"
    assert cards_data[0]["artifact_id"] == "art-id"
    assert cards_data[1]["judge_score"] == 0.85
