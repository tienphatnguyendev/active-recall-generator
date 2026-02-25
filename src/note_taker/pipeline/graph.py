from langgraph.graph import StateGraph, START, END
from note_taker.pipeline.state import GraphState
from note_taker.pipeline.nodes import (
    check_database_node,
    draft_node,
    judge_node,
    revise_node,
    save_to_db_node
)

MAX_REVISIONS = 3

def should_continue(state: GraphState) -> str:
    """Determine the next step in the pipeline."""
    if state.get("skip_processing"):
        return END

    # If we've reached the revision limit, force a save
    if state.get("revision_count", 0) >= MAX_REVISIONS:
        return "save_to_db_node"

    # Check if any Q&A pairs failed the judgment
    artifact = state.get("artifact")
    if not artifact:
        # Should not happen because judge_node should always create/pass artifact
        return END

    failing_pairs = [
        qa for qa in artifact.qa_pairs 
        if qa.judge_score is None or qa.judge_score < 0.7
    ]

    if failing_pairs:
        return "revise_node"
    
    return "save_to_db_node"

def build_graph() -> StateGraph:
    """Builds and returns the LangGraph StateGraph pipeline."""
    graph = StateGraph(GraphState)

    # Add nodes
    graph.add_node("check_database_node", check_database_node)
    graph.add_node("draft_node", draft_node)
    graph.add_node("judge_node", judge_node)
    graph.add_node("revise_node", revise_node)
    graph.add_node("save_to_db_node", save_to_db_node)

    # Set Entry Point
    graph.add_edge(START, "check_database_node")

    # Routing from check_database_node
    # If skip_processing is True, exit. Else, continue to draft_node.
    def check_db_router(state: GraphState) -> str:
        if state.get("skip_processing"):
            return END
        return "draft_node"

    graph.add_conditional_edges(
        "check_database_node",
        check_db_router
    )

    # Linear flow
    graph.add_edge("draft_node", "judge_node")

    # Routing from judge_node
    graph.add_conditional_edges("judge_node", should_continue)

    # Loop back
    graph.add_edge("revise_node", "judge_node")

    # End
    graph.add_edge("save_to_db_node", END)

    return graph.compile()