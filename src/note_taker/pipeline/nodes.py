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

OUTLINE_SYSTEM_PROMPT = """Extract a 2-level outline from the text below.
Level 1 = main topics (typically section headings).
Level 2 = key facts or concepts under each topic.
Output ONLY the outline items, nothing else."""

def generate_outlines(state: GraphState) -> dict:
    """Generate outlines for all source chunks in parallel (conceptually)."""
    from note_taker.models import OutlineResponse
    
    outlines = []
    for chunk in state["source_chunks"]:
        prompt = f"System: {OUTLINE_SYSTEM_PROMPT}\n\nUser: {chunk['content']}"
        response = invoke_outlines_with_backoff(
            prompt=prompt,
            schema=OutlineResponse,
            token_estimate=400,
            tier="fast",
        )
        outlines.append(response)
        
    return {"chunk_outlines": outlines}

BRIEF_SYSTEM_PROMPT = """You are an expert educator.
Synthesize the provided source chunks and their outlines into a single, ultra-condensed 80/20 mastery brief.
Focus strictly on core ideas, non-negotiable details, conceptual connections, and common traps.
Do not just summarize. Extract the foundational mechanisms."""

def synthesize_brief(state: GraphState) -> dict:
    """Synthesize source chunks and outlines into a MasteryBrief."""
    from note_taker.models import MasteryBrief
    
    combined_context = []
    for chunk, outline in zip(state["source_chunks"], state.get("chunk_outlines", [])):
        outline_text = "\n".join(f"- {item.title}" for item in outline.outline)
        combined_context.append(f"### Source:\n{chunk['content']}\n### Outline:\n{outline_text}")
        
    context_str = "\n\n".join(combined_context)
    prompt = f"System: {BRIEF_SYSTEM_PROMPT}\n\nUser: {context_str}"
    
    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=MasteryBrief,
        token_estimate=1500,
        tier="reasoning",
    )
    
    return {"mastery_brief": response}

JUDGE_BRIEF_SYSTEM_PROMPT = """Score the mastery brief. Be ruthless — a vague overview should score below 0.5.

Criteria (0.0–1.0 each):
- **specificity_score**: Does each core idea name a specific mechanism, definition, or relationship? Or is it a vague topic label?
- **density_score**: Is every sentence information-dense? Could any sentence be deleted without losing information?
- **leverage_score**: Are these truly the ~20% of ideas that carry ~80% of value? Or is it just "everything in order"?
- **anti_summary_score**: Would this pass as a generic textbook summary? If yes, score LOW. A good brief sounds like expert notes, not a book jacket.
- **connections_score**: Does it show HOW ideas connect (cause-effect, dependency, condition)? Or just list them adjacently?

Threshold: overall_score ≥ 0.8 to pass. Provide specific, actionable feedback for any score below 0.8."""

def judge_brief(state: GraphState) -> dict:
    """Score the mastery brief on specificity, density, leverage, anti-summary, and connections."""
    from note_taker.models import BriefJudgement

    brief = state["mastery_brief"]
    brief_text = brief.model_dump_json(indent=2)

    prompt = f"System: {JUDGE_BRIEF_SYSTEM_PROMPT}\n\nUser: Mastery Brief:\n{brief_text}"

    judgement = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=BriefJudgement,
        token_estimate=800,
        tier="reasoning",
    )

    return {"brief_judgement": judgement}

REVISE_BRIEF_SYSTEM_PROMPT = """Rewrite the mastery brief to fix the issues identified in the feedback.

You must produce a complete, revised MasteryBrief. Do not just patch — rewrite with the feedback in mind.

The feedback is from a strict judge. Address every criticism. If the judge says "too vague", add specific mechanisms. If the judge says "reads like a summary", rewrite to sound like expert notes.

Anti-patterns to AVOID:
- "This chapter discusses X" (topic label)
- "Y is important" (assertion without mechanism)
- Listing every concept (that's an outline, not 80/20)"""

def revise_brief(state: GraphState) -> dict:
    """Rewrite the mastery brief based on judge feedback (reasoning tier)."""
    from note_taker.models import BriefRevisionResponse

    brief = state["mastery_brief"]
    judgement = state["brief_judgement"]

    prompt = (
        f"System: {REVISE_BRIEF_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Current Brief\n{brief.model_dump_json(indent=2)}\n\n"
        f"### Judge Feedback\n{judgement.feedback}\n\n"
        f"### Judge Scores\n"
        f"specificity={judgement.specificity_score}, density={judgement.density_score}, "
        f"leverage={judgement.leverage_score}, anti_summary={judgement.anti_summary_score}, "
        f"connections={judgement.connections_score}"
    )

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=BriefRevisionResponse,
        token_estimate=1200,
        tier="reasoning",
    )

    return {
        "mastery_brief": response.revised_brief,
        "brief_revision_count": state.get("brief_revision_count", 0) + 1,
    }

QA_V2_SYSTEM_PROMPT = """You are a study-card generator.

Task: Given a Mastery Brief, output EXACTLY one active-recall Q&A pair for every Core Idea — no more, no fewer.

Field contract:
- question : single sentence; tests a concept or mechanism from the source; self-contained
- answer   : 1–3 sentences; fully answers the question using only information in the source
- source_context : ≤ 2 verbatim or near-verbatim sentences from the source that support the answer"""

def qa_draft(state: GraphState) -> dict:
    """Generate Q&A pairs from the approved mastery brief (fast tier)."""
    from note_taker.models import QADraftResponse, FinalArtifactV2, QuestionAnswerPair

    brief = state["mastery_brief"]
    source_text = "\n\n---\n\n".join(
        f"### {c['title']}\n{c['content']}" for c in state["source_chunks"]
    )

    brief_text = brief.model_dump_json(indent=2)
    prompt = (
        f"System: {QA_V2_SYSTEM_PROMPT}\n\n"
        f"User:\n"
        f"### Mastery Brief ({len(brief.core_ideas)} core ideas → generate {len(brief.core_ideas)} Q&A pairs)\n"
        f"{brief_text}\n\n"
        f"### Source Text\n{source_text}"
    )

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=QADraftResponse,
        token_estimate=600,
        tier="fast",
    )

    qa_pairs = [
        QuestionAnswerPair(question=qa.question, answer=qa.answer, source_context=qa.source_context)
        for qa in response.qa_pairs
    ]

    artifact = FinalArtifactV2(
        source_hash=state["source_hash"],
        mastery_brief=brief,
        qa_pairs=qa_pairs,
    )

    return {"artifact": artifact}

JUDGE_SYSTEM_PROMPT = """Score each Q&A pair. Be strict — do NOT give high scores to vague or trivial items.

Criteria (0.0–1.0 each):
- accuracy_score: answer is factually correct per the source
- clarity_score: question is clear and unambiguous
- recall_worthiness_score: question tests understanding, not just a yes/no or trivial fact
- overall_score: average of the three

Provide feedback for any pair scoring below 0.8. Reference by index (0-based)."""

def judge_qa(state: GraphState) -> dict:
    """Score each Q&A pair on accuracy, clarity, and recall-worthiness (V2)."""
    from note_taker.models import JudgeVerdict
    
    qa_text = "\n".join(
        f"[{i}] Q: {qa.question}\n    A: {qa.answer}\n    Context: {qa.source_context}"
        for i, qa in enumerate(state["artifact"].qa_pairs)
    )

    prompt = f"System: {JUDGE_SYSTEM_PROMPT}\n\nUser: Q&A Pairs:\n{qa_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=JudgeVerdict,
        token_estimate=800,
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

REVISE_SYSTEM_PROMPT = """Rewrite the failing Q&A pairs to fix the issues in the feedback.

Field contract (same as original):
- question: single sentence; tests a concept from the source; self-contained
- answer: 1–3 sentences; accurate per the source
- source_context: ≤ 2 verbatim sentences from the source supporting the answer

Keep pairs that are fine. Fix only what the feedback criticizes."""

def revise_qa(state: GraphState) -> dict:
    """Rewrite Q&A pairs that scored < 0.8 based on feedback (V2)."""
    from note_taker.models import RevisionResponse
    
    artifact = state["artifact"]
    failing_indices = [
        i for i, qa in enumerate(artifact.qa_pairs)
        if qa.judge_score is None or qa.judge_score < 0.8
    ]

    if not failing_indices:
        return {"qa_revision_count": state.get("qa_revision_count", 0) + 1}

    failing_text = "\n".join(
        f"[{i}] Q: {artifact.qa_pairs[i].question}\n"
        f"    A: {artifact.qa_pairs[i].answer}\n"
        f"    Feedback: {artifact.qa_pairs[i].judge_feedback}"
        for i in failing_indices
    )
    
    source_text = "\n\n---\n\n".join(
        f"### {c['title']}\n{c['content']}" for c in state.get("source_chunks", [])
    )

    prompt = f"System: {REVISE_SYSTEM_PROMPT}\n\nUser: Source:\n{source_text}\n\nPairs to Revise:\n{failing_text}"

    response = invoke_outlines_with_backoff(
        prompt=prompt,
        schema=RevisionResponse,
        token_estimate=600,
        tier="fast",
    )

    # Replace the failing pairs with the revised ones (mapping sequentially for now)
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
        "qa_revision_count": state.get("qa_revision_count", 0) + 1
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
