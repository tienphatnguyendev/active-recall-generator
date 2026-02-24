import hashlib
from note_taker.database import DatabaseManager
from note_taker.pipeline.state import GraphState

def calculate_hash(content: str) -> str:
    """Calculate SHA-256 hash of the source content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def check_database_node(state: GraphState, db_manager: DatabaseManager = None) -> GraphState:
    """
    Node to check if the chunk has already been processed and its source hasn't changed.
    If it exists and force_refresh is False, sets skip_processing=True.
    """
    chunk_id = state["chunk_id"]
    source_content = state["source_content"]
    force_refresh = state.get("force_refresh", False)
    
    source_hash = calculate_hash(source_content)
    # Ensure source_hash is stored in state for later nodes
    state["source_hash"] = source_hash
    
    if db_manager is None:
        db_manager = DatabaseManager()
    
    if force_refresh:
        state["skip_processing"] = False
        state["artifact"] = None
        return state
        
    # Check if we can resume/skip processing
    if db_manager.check_hash(chunk_id, source_hash):
        artifact = db_manager.get_artifact(chunk_id)
        if artifact:
            state["artifact"] = artifact
            state["skip_processing"] = True
            return state
            
    # Need to process
    state["skip_processing"] = False
    state["artifact"] = None
    return state