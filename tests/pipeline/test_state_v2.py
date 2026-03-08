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
