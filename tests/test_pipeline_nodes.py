import pytest
from note_taker.pipeline.state import GraphState
from note_taker.pipeline.nodes import check_database_node, calculate_hash
from note_taker.database import DatabaseManager
from note_taker.models import FinalArtifactV1, OutlineItem, QuestionAnswerPair

@pytest.fixture
def temp_db_path(tmp_path):
    return str(tmp_path / "test_pipeline.db")

@pytest.fixture
def db_manager(temp_db_path):
    DatabaseManager._instance = None
    manager = DatabaseManager(db_path=temp_db_path)
    manager.ensure_database()
    return manager

@pytest.fixture
def sample_artifact():
    return FinalArtifactV1(
        source_hash="dummy_hash",
        outline=[OutlineItem(title="Test", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")]
    )

def test_check_database_node_not_found(db_manager):
    state: GraphState = {
        "chunk_id": "test_chunk_1",
        "source_content": "Hello World",
        "force_refresh": False,
        "source_hash": "",
        "artifact": None,
        "skip_processing": False
    }
    
    new_state = check_database_node(state, db_manager=db_manager)
    assert not new_state["skip_processing"]
    assert new_state["artifact"] is None
    assert new_state["source_hash"] == calculate_hash("Hello World")

def test_check_database_node_found_and_matches(db_manager, sample_artifact):
    content = "Hello World"
    content_hash = calculate_hash(content)
    sample_artifact.source_hash = content_hash
    db_manager.save_artifact("test_chunk_2", sample_artifact)
    
    state: GraphState = {
        "chunk_id": "test_chunk_2",
        "source_content": content,
        "force_refresh": False,
        "source_hash": "",
        "artifact": None,
        "skip_processing": False
    }
    
    new_state = check_database_node(state, db_manager=db_manager)
    assert new_state["skip_processing"] is True
    assert new_state["artifact"] is not None
    assert new_state["artifact"].source_hash == content_hash

def test_check_database_node_force_refresh(db_manager, sample_artifact):
    content = "Hello World"
    content_hash = calculate_hash(content)
    sample_artifact.source_hash = content_hash
    db_manager.save_artifact("test_chunk_3", sample_artifact)
    
    state: GraphState = {
        "chunk_id": "test_chunk_3",
        "source_content": content,
        "force_refresh": True,
        "source_hash": "",
        "artifact": None,
        "skip_processing": False
    }
    
    new_state = check_database_node(state, db_manager=db_manager)
    assert not new_state["skip_processing"]
    assert new_state["artifact"] is None
