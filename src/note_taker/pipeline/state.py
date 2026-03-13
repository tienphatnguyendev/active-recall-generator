from typing import TypedDict, Optional
from note_taker.models import FinalArtifactV2, MasteryBrief, OutlineResponse, BriefJudgement, QAJudgement

class GraphState(TypedDict):
    """State for the unified mastery brief pipeline (V2)."""
    # Input
    chunk_id: str
    source_chunks: list[dict]         # [{"title": str, "content": str}, ...]
    source_hash: str
    force_refresh: bool

    # Internal scaffolding (not user-facing)
    chunk_outlines: Optional[list[OutlineResponse]]

    # The mastery brief
    mastery_brief: Optional[MasteryBrief]
    brief_judgement: Optional[BriefJudgement]
    brief_revision_count: int

    # The final artifact
    artifact: Optional[FinalArtifactV2]
    qa_judgement: Optional[QAJudgement]
    qa_revision_count: int

    # Control
    skip_processing: bool
    persist_locally: bool
