from langgraph.graph import StateGraph, START, END
from note_taker.pipeline.state import GraphState
from note_taker.pipeline.nodes import (
    generate_outlines,
    synthesize_brief,
    judge_brief,
    revise_brief,
    qa_draft,
    judge_qa,
    revise_qa,
    save_to_db_node,
)

MAX_BRIEF_REVISIONS = 3
MAX_QA_REVISIONS = 3

def should_continue_brief(state: GraphState) -> str:
    """Route after judge_brief: pass -> qa_draft, fail -> revise_brief (up to limit)."""
    if state.get("brief_revision_count", 0) >= MAX_BRIEF_REVISIONS:
        return "qa_draft"

    judgement = state.get("brief_judgement")
    if judgement and judgement.overall_score >= 0.8:
        return "qa_draft"

    return "revise_brief"


def should_continue_qa(state: GraphState) -> str:
    """Route after judge_qa: pass -> save_to_db_node, fail -> revise_qa (up to limit)."""
    if state.get("qa_revision_count", 0) >= MAX_QA_REVISIONS:
        return "save_to_db_node"

    artifact = state.get("artifact")
    if not artifact:
        return "save_to_db_node"

    failing = [qa for qa in artifact.qa_pairs if qa.judge_score is None or qa.judge_score < 0.8]
    if failing:
        return "revise_qa"

    return "save_to_db_node"


def build_graph() -> StateGraph:
    """Builds and returns the LangGraph StateGraph pipeline."""
    graph = StateGraph(GraphState)

    graph.add_node("generate_outlines", generate_outlines)
    graph.add_node("synthesize_brief", synthesize_brief)
    graph.add_node("judge_brief", judge_brief)
    graph.add_node("revise_brief", revise_brief)
    graph.add_node("qa_draft", qa_draft)
    graph.add_node("judge_qa", judge_qa)
    graph.add_node("revise_qa", revise_qa)
    graph.add_node("save_to_db_node", save_to_db_node)

    # Linear flow: START -> generate_outlines -> synthesize_brief -> judge_brief
    graph.add_edge(START, "generate_outlines")
    graph.add_edge("generate_outlines", "synthesize_brief")
    graph.add_edge("synthesize_brief", "judge_brief")

    # Brief judge/revise loop
    graph.add_conditional_edges("judge_brief", should_continue_brief)
    graph.add_edge("revise_brief", "judge_brief")

    # QA flow: qa_draft -> judge_qa
    graph.add_edge("qa_draft", "judge_qa")

    # QA judge/revise loop
    graph.add_conditional_edges("judge_qa", should_continue_qa)
    graph.add_edge("revise_qa", "judge_qa")

    # Exit
    graph.add_edge("save_to_db_node", END)

    return graph.compile()