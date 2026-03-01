import os
import pytest
from unittest.mock import patch
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
        outline=None,  # new field
        skip_processing=False,
        revision_count=0,
    )



def test_outline_draft_node_creates_outline(base_state):
    """outline_draft_node should create OutlineResponse and populate state['outline']."""
    from note_taker.pipeline.nodes import outline_draft_node
    from note_taker.models import OutlineResponse, OutlineItem
    
    mock_response = OutlineResponse(
        outline=[OutlineItem(title="Intro", level=1), OutlineItem(title="Agents", level=2)]
    )
    with patch("note_taker.pipeline.nodes.get_llm") as mock_llm:
        mock_llm.return_value.with_structured_output.return_value.invoke.return_value = mock_response
        result = outline_draft_node(base_state)
        
    assert result["outline"] is not None
    assert len(result["outline"].outline) == 2
    assert result["outline"].outline[0].title == "Intro"

def test_qa_draft_node_creates_qa_pairs(base_state):
    """qa_draft_node should create QADraftResponse based on outline and combine into FinalArtifactV1."""
    from note_taker.pipeline.nodes import qa_draft_node
    from note_taker.models import OutlineResponse, OutlineItem, QADraftResponse, QuestionAnswerPair
    
    # Needs outline from previous step
    base_state["outline"] = OutlineResponse(
        outline=[OutlineItem(title="Context", level=1)]
    )
    
    mock_qa = QADraftResponse(
        qa_pairs=[QuestionAnswerPair(
            question="What is context?", answer="Important info", source_context="Context is nice."
        )]
    )
    
    with patch("note_taker.pipeline.nodes.get_llm") as mock_llm:
        mock_llm.return_value.with_structured_output.return_value.invoke.return_value = mock_qa
        result = qa_draft_node(base_state)
        
    assert result["artifact"] is not None
    assert len(result["artifact"].outline) == 1
    assert len(result["artifact"].qa_pairs) == 1
    assert result["artifact"].qa_pairs[0].question == "What is context?"

def test_judge_node_scores_qa_pairs(base_state):
    """judge_node should fill in judge_score and judge_feedback on each Q&A pair."""
    from note_taker.pipeline.nodes import judge_node
    from note_taker.models import JudgeVerdict, QAJudgement, FinalArtifactV1
    
    base_state["artifact"] = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="Intro", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")]
    )
    mock_verdict = JudgeVerdict(judgements=[
        QAJudgement(question_index=0, accuracy_score=0.9, clarity_score=0.8,
                    recall_worthiness_score=0.85, overall_score=0.85, feedback="Good.")
    ])
    with patch("note_taker.pipeline.nodes.get_llm") as mock_llm:
        mock_llm.return_value.with_structured_output.return_value.invoke.return_value = mock_verdict
        result = judge_node(base_state)

    assert result["artifact"].qa_pairs[0].judge_score == 0.85
    assert result["artifact"].qa_pairs[0].judge_feedback == "Good."

def test_revise_node_replaces_failing_pairs(base_state):
    """revise_node should replace Q&A pairs with score < 0.7."""
    from note_taker.pipeline.nodes import revise_node
    from note_taker.models import RevisionResponse, FinalArtifactV1
    
    failing_qa = QuestionAnswerPair(
        question="Bad Q", answer="Bad A", source_context="C",
        judge_score=0.4, judge_feedback="Too vague"
    )
    passing_qa = QuestionAnswerPair(
        question="Good Q", answer="Good A", source_context="C",
        judge_score=0.9, judge_feedback="Great."
    )
    base_state["artifact"] = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="T", level=1)],
        qa_pairs=[failing_qa, passing_qa],
    )
    base_state["revision_count"] = 0

    revised_qa = QuestionAnswerPair(
        question="Better Q", answer="Better A", source_context="C"
    )
    mock_response = RevisionResponse(revised_pairs=[revised_qa])

    with patch("note_taker.pipeline.nodes.get_llm") as mock_llm:
        mock_llm.return_value.with_structured_output.return_value.invoke.return_value = mock_response
        result = revise_node(base_state)

    # Failing pair should be replaced, passing pair kept
    assert result["artifact"].qa_pairs[0].question == "Better Q"
    assert result["artifact"].qa_pairs[1].question == "Good Q"
    assert result["revision_count"] == 1

def test_save_to_db_node(base_state, tmp_path):
    """save_to_db_node should persist the artifact to the database."""
    from note_taker.pipeline.nodes import save_to_db_node
    from note_taker.database import DatabaseManager
    from note_taker.models import FinalArtifactV1
    
    DatabaseManager._instance = None
    db = DatabaseManager(db_path=str(tmp_path / "test.db"))
    db.ensure_database()

    base_state["artifact"] = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="T", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")],
    )

    save_to_db_node(base_state, db_manager=db)
    retrieved = db.get_artifact(base_state["chunk_id"])
    assert retrieved is not None
    assert retrieved.qa_pairs[0].question == "Q"
def test_save_to_db_node_skips_if_flag_is_false(base_state, tmp_path):
    """save_to_db_node should NOT persist the artifact if persist_locally is False."""
    from note_taker.pipeline.nodes import save_to_db_node
    from note_taker.database import DatabaseManager
    from note_taker.models import FinalArtifactV1
    
    DatabaseManager._instance = None
    db = DatabaseManager(db_path=str(tmp_path / "test_skip.db"))
    db.ensure_database()

    base_state["artifact"] = FinalArtifactV1(
        source_hash="abc123",
        outline=[OutlineItem(title="T", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")],
    )
    base_state["persist_locally"] = False

    save_to_db_node(base_state, db_manager=db)
    retrieved = db.get_artifact(base_state["chunk_id"])
    assert retrieved is None
