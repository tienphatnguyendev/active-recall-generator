import hashlib
from note_taker.database import DatabaseManager
from note_taker.pipeline.state import GraphState
from note_taker.llm import get_llm

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

DRAFT_SYSTEM_PROMPT = """You are an expert educator creating active recall study materials.
Given a section of a textbook, generate:
1. A 2-level hierarchical outline of the key concepts.
2. One question-and-answer pair per subpoint in the outline.

Rules:
- Questions should test understanding, not just recall of facts.
- Answers should be concise but complete.
- source_context should be the relevant sentence(s) from the source text.
- The outline should have level 1 for main topics and level 2 for subtopics."""

def draft_node(state: GraphState) -> dict:
    """Generate outline and Q&A pairs from source content."""
    from note_taker.models import FinalArtifactV1, DraftResponse
    
    llm = get_llm()
    structured_llm = llm.with_structured_output(DraftResponse)

    response = structured_llm.invoke([
        {"role": "system", "content": DRAFT_SYSTEM_PROMPT},
        {"role": "user", "content": state["source_content"]},
    ])

    artifact = FinalArtifactV1(
        source_hash=state["source_hash"],
        outline=response.outline,
        qa_pairs=response.qa_pairs,
    )
    return {"artifact": artifact}

JUDGE_SYSTEM_PROMPT = """You are a strict educational content reviewer.
Evaluate each question-answer pair on three criteria (score 0.0 to 1.0):
- accuracy_score: Is the answer factually correct based on the source?
- clarity_score: Is the question clear and unambiguous?
- recall_worthiness_score: Does this question test genuine understanding?
- overall_score: Weighted average of the three scores.

Provide specific feedback for questions scoring below 0.7 on any criterion.
Reference questions by their index (0-based)."""

def judge_node(state: GraphState) -> dict:
    """Score each Q&A pair on accuracy, clarity, and recall-worthiness."""
    from note_taker.models import JudgeVerdict
    
    llm = get_llm()
    structured_llm = llm.with_structured_output(JudgeVerdict)

    qa_text = "\n".join(
        f"[{i}] Q: {qa.question}\n    A: {qa.answer}\n    Context: {qa.source_context}"
        for i, qa in enumerate(state["artifact"].qa_pairs)
    )

    response = structured_llm.invoke([
        {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
        {"role": "user", "content": f"Source:\n{state['source_content']}\n\nQ&A Pairs:\n{qa_text}"},
    ])

    artifact = state["artifact"]
    for judgement in response.judgements:
        idx = judgement.question_index
        # Verify the index is within bounds before applying the score
        if 0 <= idx < len(artifact.qa_pairs):
            artifact.qa_pairs[idx].judge_score = judgement.overall_score
            artifact.qa_pairs[idx].judge_feedback = judgement.feedback

    return {"artifact": artifact}

REVISE_SYSTEM_PROMPT = """You are an expert educator revising study materials based on feedback.
Given original source content and a list of question-answer pairs that need improvement,
rewrite the Q&A pairs to address the provided feedback.
Maintain the exact required JSON structure for the output.
Ensure the revised questions test genuine understanding and the answers are accurate based on the source context."""

def revise_node(state: GraphState) -> dict:
    """Rewrite Q&A pairs that scored < 0.7 based on feedback."""
    from note_taker.models import RevisionResponse
    
    artifact = state["artifact"]
    failing_indices = [
        i for i, qa in enumerate(artifact.qa_pairs)
        if qa.judge_score is None or qa.judge_score < 0.7
    ]

    if not failing_indices:
        return {"revision_count": state.get("revision_count", 0) + 1}

    llm = get_llm()
    structured_llm = llm.with_structured_output(RevisionResponse)

    failing_text = "\n".join(
        f"[{i}] Q: {artifact.qa_pairs[i].question}\n"
        f"    A: {artifact.qa_pairs[i].answer}\n"
        f"    Feedback: {artifact.qa_pairs[i].judge_feedback}"
        for i in failing_indices
    )

    response = structured_llm.invoke([
        {"role": "system", "content": REVISE_SYSTEM_PROMPT},
        {"role": "user", "content": f"Source:\n{state['source_content']}\n\nPairs to Revise:\n{failing_text}"},
    ])

    # Replace the failing pairs with the revised ones (mapping sequentially for now)
    # The LLM returns a list of N revised pairs for the N failing ones.
    if len(response.revised_pairs) == len(failing_indices):
        for idx, revised_qa in zip(failing_indices, response.revised_pairs):
            # Reset judge score and feedback for the revised pair
            revised_qa.judge_score = None
            revised_qa.judge_feedback = None
            artifact.qa_pairs[idx] = revised_qa

    return {
        "artifact": artifact,
        "revision_count": state.get("revision_count", 0) + 1
    }

def save_to_db_node(state: GraphState, db_manager: DatabaseManager = None) -> dict:
    """Persist the final artifact to the SQLite database."""
    if db_manager is None:
        db_manager = DatabaseManager()
    
    artifact = state["artifact"]
    db_manager.save_artifact(
        id=state["chunk_id"],
        artifact=artifact
    )
    return {}