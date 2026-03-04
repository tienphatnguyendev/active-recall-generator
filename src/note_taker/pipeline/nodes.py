import hashlib
from note_taker.database import DatabaseManager
from note_taker.pipeline.state import GraphState
from note_taker.llm import invoke_outlines_with_backoff

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

OUTLINE_SYSTEM_PROMPT = """You are an expert educator planning a study session.
Given a section of a textbook, generate a 2-level hierarchical outline of the key concepts.
Level 1 should cover main topics. Level 2 should cover detailed subtopics.
This outline will be used to generate active recall questions."""

def outline_draft_node(state: GraphState) -> dict:
    """Generate a hierarchical outline from source content."""
    from note_taker.models import OutlineResponse
    
    prompt = f"System: {OUTLINE_SYSTEM_PROMPT}\n\nUser: {state['source_content']}"
    
    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=OutlineResponse,
        token_estimate=1000,
        tier="fast",
    )

    return {"outline": response}

# ── QA Draft ─────────────────────────────────────────────────────────────────
# WHY this prompt is written the way it is:
#   • The fast tier uses grammar-constrained decoding (outlines native JSON schema),
#     so the model NEVER has to "guess" the JSON format — we just need it to fill
#     values correctly.
#   • Small models (8B-17B) need: a clear role, concrete field semantics with hard
#     bounds, and an explicit count anchor so they don't under- or over-generate.
#   • We removed vague rules like "test understanding" (the model ignores them when
#     constrained) and replaced them with terse, bounded specs.
QA_SYSTEM_PROMPT = """You are a study-card generator.

Task: Given source text and a hierarchical outline, output EXACTLY one active-recall Q&A pair for every Level-2 outline item — no more, no fewer.

Field contract:
- question : single sentence; tests a concept or mechanism from the source; self-contained (no "According to the text…")
- answer   : 1–3 sentences; fully answers the question using only information in the source
- source_context : ≤ 2 verbatim or near-verbatim sentences from the source that support the answer

Do NOT invent facts outside the source. Do NOT add commentary."""

def qa_draft_node(state: GraphState) -> dict:
    """Generate Q&A pairs from source content and outline.

    Tier choice — 'fast' (llama3.1-8b on Cerebras) rather than 'reasoning':
    • Q&A generation is a structured extraction task, not a reasoning task.
    • The fast tier uses outlines grammar-constrained decoding (supports_json_schema
      defaults to True), so the JSON schema is enforced at the token level — no
      regex fallback, no schema-in-prompt bloat.
    • Benchmark before fix: avg 47s, max 60s (gpt-oss-120b, schema-in-prompt path).
      Expected after fix: avg < 5s on Cerebras llama3.1-8b.
    """
    from note_taker.models import QADraftResponse, FinalArtifactV1, OutlineItem, QuestionAnswerPair
    
    # Needs outline from previous node
    outline_response = state.get("outline")
    if not outline_response:
        raise ValueError("qa_draft_node requires an outline but none was found in state.")

    # Separate level-1 and level-2 items for the prompt anchor
    level2_items = [item for item in outline_response.outline if item.level == 2]
    outline_text = "\n".join(
        f"{'  ' * (item.level - 1)}- [L{item.level}] {item.title}"
        for item in outline_response.outline
    )

    prompt = (
        f"System: {QA_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Source\n{state['source_content']}\n\n"
        f"### Outline ({len(level2_items)} Level-2 items → generate {len(level2_items)} Q&A pairs)\n"
        f"{outline_text}"
    )
    
    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=QADraftResponse,
        token_estimate=1200,  # reduced from 2000; eases TokenTracker throttle pressure
        tier="fast",          # was "reasoning" (gpt-oss-120b, avg 47s) → now fast (llama3.1-8b, ~3-5s)
    )

    # Convert LLM items to internal items
    internal_outline = [
        OutlineItem(title=item.title, level=item.level)
        for item in outline_response.outline
    ]
    internal_qa_pairs = [
        QuestionAnswerPair(question=qa.question, answer=qa.answer, source_context=qa.source_context)
        for qa in response.qa_pairs
    ]

    artifact = FinalArtifactV1(
        source_hash=state["source_hash"],
        outline=internal_outline,
        qa_pairs=internal_qa_pairs,
    )
    
    return {"artifact": artifact}

JUDGE_SYSTEM_PROMPT = """You are a strict educational content reviewer.
Evaluate each question-answer pair on three criteria (score 0.0 to 1.0):
- accuracy_score: Is the answer factually correct based on the source?
- clarity_score: Is the question clear and unambiguous?
- recall_worthiness_score: Does this question test genuine understanding?
- overall_score: Weighted average of the three scores.

Provide specific feedback for questions scoring below 0.8 on any criterion.
Reference questions by their index (0-based).

### Calibration Examples:
GOOD (0.9): Q: "What drives evaporation?" A: "Solar heating converts liquid water to vapor from surface bodies." -> High: accurate, clear, tests understanding.
MEDIOCRE (0.5): Q: "What is evaporation?" A: "It's when water goes up." -> Low: vague question, incomplete answer.
BAD (0.2): Q: "Is water wet?" A: "Yes." -> Very low: trivial, no recall value."""

def judge_node(state: GraphState) -> dict:
    """Score each Q&A pair on accuracy, clarity, and recall-worthiness."""
    from note_taker.models import JudgeVerdict
    
    qa_text = "\n".join(
        f"[{i}] Q: {qa.question}\n    A: {qa.answer}\n    Context: {qa.source_context}"
        for i, qa in enumerate(state["artifact"].qa_pairs)
    )

    prompt = f"System: {JUDGE_SYSTEM_PROMPT}\n\nUser: Q&A Pairs:\n{qa_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=JudgeVerdict,
        token_estimate=1500,
        tier="fast",
    )

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
        if qa.judge_score is None or qa.judge_score < 0.8
    ]

    if not failing_indices:
        return {"revision_count": state.get("revision_count", 0) + 1}

    failing_text = "\n".join(
        f"[{i}] Q: {artifact.qa_pairs[i].question}\n"
        f"    A: {artifact.qa_pairs[i].answer}\n"
        f"    Feedback: {artifact.qa_pairs[i].judge_feedback}"
        for i in failing_indices
    )

    prompt = f"System: {REVISE_SYSTEM_PROMPT}\n\nUser: Source:\n{state['source_content']}\n\nPairs to Revise:\n{failing_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=RevisionResponse,
        token_estimate=1500,
        tier="reasoning",
    )

    # Replace the failing pairs with the revised ones (mapping sequentially for now)
    # The LLM returns a list of N revised pairs for the N failing ones.
    if len(response.revised_pairs) == len(failing_indices):
        from note_taker.models import QuestionAnswerPair
        for idx, revised_qa in zip(failing_indices, response.revised_pairs):
            # Create internal QA pair, resetting judge score and feedback
            new_qa = QuestionAnswerPair(
                question=revised_qa.question,
                answer=revised_qa.answer,
                source_context=revised_qa.source_context
            )
            artifact.qa_pairs[idx] = new_qa

    return {
        "artifact": artifact,
        "revision_count": state.get("revision_count", 0) + 1
    }

def save_to_db_node(state: GraphState, db_manager: DatabaseManager = None) -> dict:
    """Persist the final artifact to the SQLite database."""
    if not state.get("persist_locally", True):
        return {}
        
    if db_manager is None:
        db_manager = DatabaseManager()
    
    artifact = state["artifact"]
    db_manager.save_artifact(
        id=state["chunk_id"],
        artifact=artifact
    )
    return {}
