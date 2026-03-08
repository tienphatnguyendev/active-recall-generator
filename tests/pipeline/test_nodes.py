import os
import pytest
from unittest.mock import patch
from note_taker.pipeline.state import GraphState
from note_taker.models import QuestionAnswerPair

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

def test_save_to_db_node_v2(base_state, tmp_path):
    """save_to_db_node should persist the artifact to the database."""
    from note_taker.pipeline.nodes import save_to_db_node
    from note_taker.database import DatabaseManager
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea
    
    DatabaseManager._instance = None
    db = DatabaseManager(db_path=str(tmp_path / "test.db"))
    db.ensure_database()

    artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=MasteryBrief(
            core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
            non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[]
        ),
        qa_pairs=[],
    )
    base_state_dict = {
        "chunk_id": "test_chunk",
        "artifact": artifact,
        "persist_locally": True
    }
    save_to_db_node(base_state_dict, db_manager=db)
    retrieved = db.get_artifact("test_chunk")
    assert retrieved is not None

def test_save_to_db_node_skips_if_flag_is_false_v2(base_state, tmp_path):
    """save_to_db_node should NOT persist the artifact if persist_locally is False."""
    from note_taker.pipeline.nodes import save_to_db_node
    from note_taker.database import DatabaseManager
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea
    
    DatabaseManager._instance = None
    db = DatabaseManager(db_path=str(tmp_path / "test_skip.db"))
    db.ensure_database()

    artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=MasteryBrief(
            core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
            non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[]
        ),
        qa_pairs=[],
    )
    base_state_dict = {
        "chunk_id": "test_chunk",
        "artifact": artifact,
        "persist_locally": False
    }
    save_to_db_node(base_state_dict, db_manager=db)
    retrieved = db.get_artifact("test_chunk")
    assert retrieved is None

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

def test_synthesize_brief_creates_mastery_brief():
    """synthesize_brief should take chunks and chunk_outlines and produce a MasteryBrief."""
    from note_taker.pipeline.nodes import synthesize_brief
    from note_taker.models import MasteryBrief, CoreIdea, OutlineResponse, LLMOutlineItem
    
    state = {
        "source_chunks": [{"title": "Intro", "content": "Text"}],
        "chunk_outlines": [
            OutlineResponse(outline=[LLMOutlineItem(title="T", level=1)])
        ]
    }
    
    mock_brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="A", why_it_matters="B", mechanism="C")],
        non_negotiable_details=["D"],
        connections=["E"],
        common_traps=["F"],
        five_min_review=["G"]
    )
    
    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_brief
        result = synthesize_brief(state)
        
    assert result["mastery_brief"] is not None
    assert len(result["mastery_brief"].core_ideas) == 1
    assert mock_invoke.call_count == 1

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


def test_qa_draft_v2_derives_from_brief():
    """V2 qa_draft should derive Q&A pairs from the MasteryBrief's core ideas."""
    from note_taker.pipeline.nodes import qa_draft
    from note_taker.models import MasteryBrief, CoreIdea, QADraftResponse, LLMQuestionAnswerPair

    state = {
        "mastery_brief": MasteryBrief(
            core_ideas=[
                CoreIdea(idea="Gradient descent", why_it_matters="Foundation of training", mechanism="\u03b8 = \u03b8 - \u03b1\u2207L"),
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
    assert result["artifact"].qa_pairs[0].judge_feedback == "Good."


def test_revise_qa_v2_replaces_failing_pairs():
    """revise_qa should replace Q&A pairs with score < 0.8 on a FinalArtifactV2."""
    from note_taker.pipeline.nodes import revise_qa
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair, RevisionResponse, LLMQuestionAnswerPair

    brief = MasteryBrief(
        core_ideas=[], non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[]
    )
    failing_qa = QuestionAnswerPair(
        question="Bad Q", answer="Bad A", source_context="C",
        judge_score=0.4, judge_feedback="Too vague"
    )
    passing_qa = QuestionAnswerPair(
        question="Good Q", answer="Good A", source_context="C",
        judge_score=0.9, judge_feedback="Great."
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="abc", mastery_brief=brief, qa_pairs=[failing_qa, passing_qa],
        ),
        "qa_revision_count": 0,
        "source_chunks": [{"title": "T", "content": "Source text"}],
    }

    revised_qa = LLMQuestionAnswerPair(question="Better Q", answer="Better A", source_context="C")
    mock_response = RevisionResponse(revised_pairs=[revised_qa])

    with patch("note_taker.pipeline.nodes.invoke_outlines_with_backoff") as mock_invoke:
        mock_invoke.return_value = mock_response
        result = revise_qa(state)

    assert result["artifact"].qa_pairs[0].question == "Better Q"
    assert result["artifact"].qa_pairs[1].question == "Good Q"
    assert result["qa_revision_count"] == 1

