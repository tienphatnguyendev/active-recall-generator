import pytest
from unittest.mock import patch, MagicMock
from langgraph.graph import StateGraph
from note_taker.pipeline.graph import build_graph, should_continue

def test_should_continue_skip_processing():
    """If skip_processing is True, should route to END."""
    state = {"skip_processing": True, "revision_count": 0, "artifact": None}
    assert should_continue(state) == "__end__"

def test_should_continue_needs_revision():
    """If there are failing qa_pairs and we haven't hit the limit, route to revise_node."""
    from note_taker.models import FinalArtifactV1, QuestionAnswerPair, OutlineItem
    failing_qa = QuestionAnswerPair(question="Q", answer="A", source_context="C", judge_score=0.5)
    artifact = FinalArtifactV1(source_hash="h", outline=[], qa_pairs=[failing_qa])
    
    state = {"skip_processing": False, "revision_count": 0, "artifact": artifact}
    assert should_continue(state) == "revise_node"

def test_should_continue_revision_limit():
    """If we hit the revision limit, route to save_to_db_node even if there are failing pairs."""
    from note_taker.models import FinalArtifactV1, QuestionAnswerPair, OutlineItem
    failing_qa = QuestionAnswerPair(question="Q", answer="A", source_context="C", judge_score=0.5)
    artifact = FinalArtifactV1(source_hash="h", outline=[], qa_pairs=[failing_qa])
    
    state = {"skip_processing": False, "revision_count": 3, "artifact": artifact}
    assert should_continue(state) == "save_to_db_node"

def test_should_continue_all_passing():
    """If all qa_pairs pass (score >= 0.7), route to save_to_db_node."""
    from note_taker.models import FinalArtifactV1, QuestionAnswerPair, OutlineItem
    passing_qa = QuestionAnswerPair(question="Q", answer="A", source_context="C", judge_score=0.9)
    artifact = FinalArtifactV1(source_hash="h", outline=[], qa_pairs=[passing_qa])
    
    state = {"skip_processing": False, "revision_count": 0, "artifact": artifact}
    assert should_continue(state) == "save_to_db_node"

def test_build_graph_compiles():
    """build_graph should return a compiled graph."""
    graph = build_graph()
    assert hasattr(graph, "invoke")