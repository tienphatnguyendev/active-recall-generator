from typing import TypedDict, Optional
from note_taker.models import FinalArtifactV1, OutlineResponse

class GraphState(TypedDict):
    """The state of the LangGraph content processing pipeline."""
    chunk_id: str
    source_content: str
    source_hash: str
    force_refresh: bool
    
    # Set by check_database_node
    artifact: Optional[FinalArtifactV1]
    skip_processing: bool

    # Set by outline_draft_node
    outline: Optional[OutlineResponse]

    # Set by judge/revise loop
    revision_count: int
    persist_locally: bool
