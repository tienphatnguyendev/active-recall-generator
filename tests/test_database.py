import os
import pytest
from pydantic import ValidationError
from note_taker.database import DatabaseManager
from note_taker.models import FinalArtifactV1, OutlineItem, QuestionAnswerPair

@pytest.fixture
def temp_db_path(tmp_path):
    """Fixture providing a temporary database file path."""
    db_file = tmp_path / "test_note_taker.db"
    return str(db_file)

@pytest.fixture
def db_manager(temp_db_path):
    """Fixture providing a clean DatabaseManager instance."""
    # Reset singleton for testing
    DatabaseManager._instance = None
    manager = DatabaseManager(db_path=temp_db_path)
    manager.ensure_database()
    return manager

@pytest.fixture
def sample_artifact():
    return FinalArtifactV1(
        source_hash="hash123",
        outline=[OutlineItem(title="Test", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")]
    )

def test_singleton_pattern(temp_db_path):
    DatabaseManager._instance = None
    manager1 = DatabaseManager(db_path=temp_db_path)
    manager2 = DatabaseManager()
    assert manager1 is manager2

def test_ensure_database_creates_file_and_table(temp_db_path):
    DatabaseManager._instance = None
    manager = DatabaseManager(db_path=temp_db_path)
    assert not os.path.exists(temp_db_path)
    manager.ensure_database()
    assert os.path.exists(temp_db_path)
    # Check if table exists
    assert "processed_content" in manager.db.table_names()

def test_database_permission_error():
    DatabaseManager._instance = None
    # Try to write to a root directory or an invalid path
    with pytest.raises((PermissionError, OSError, FileNotFoundError)):
        manager = DatabaseManager(db_path="/invalid_root_dir/test.db")
        manager.ensure_database()

def test_save_and_get_artifact(db_manager, sample_artifact):
    test_id = "Book:Ch1:Sec1"
    db_manager.save_artifact(test_id, sample_artifact)
    
    retrieved = db_manager.get_artifact(test_id)
    assert retrieved is not None
    assert retrieved.source_hash == sample_artifact.source_hash
    assert len(retrieved.qa_pairs) == 1
    assert retrieved.qa_pairs[0].question == "Q"

def test_get_nonexistent_artifact(db_manager):
    assert db_manager.get_artifact("missing_id") is None

def test_check_hash_match_and_mismatch(db_manager, sample_artifact):
    test_id = "Book:Ch1:Sec2"
    db_manager.save_artifact(test_id, sample_artifact)
    
    # Match
    assert db_manager.check_hash(test_id, "hash123") is True
    # Mismatch
    assert db_manager.check_hash(test_id, "different_hash") is False
    # Missing ID
    assert db_manager.check_hash("missing_id", "hash123") is False

def test_save_artifact_upsert(db_manager, sample_artifact):
    test_id = "Book:Ch1:Sec3"
    db_manager.save_artifact(test_id, sample_artifact)
    
    # Modify artifact and save again
    sample_artifact.source_hash = "new_hash"
    sample_artifact.qa_pairs[0].answer = "New Answer"
    db_manager.save_artifact(test_id, sample_artifact)
    
    retrieved = db_manager.get_artifact(test_id)
    assert retrieved.source_hash == "new_hash"
    assert retrieved.qa_pairs[0].answer == "New Answer"

def test_force_refresh_logic(db_manager, sample_artifact):
    test_id = "Book:Ch1:Sec4"
    db_manager.save_artifact(test_id, sample_artifact)
    
    # Even if hash matches, if force_refresh is handled externally,
    # save_artifact should still upsert.
    sample_artifact.qa_pairs[0].answer = "Forced Answer"
    db_manager.save_artifact(test_id, sample_artifact)
    
    retrieved = db_manager.get_artifact(test_id)
    assert retrieved.qa_pairs[0].answer == "Forced Answer"