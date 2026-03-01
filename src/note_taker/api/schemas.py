"""API request/response schemas for the generate endpoint."""
from pydantic import BaseModel, Field
from typing import Optional


class GenerateRequest(BaseModel):
    """POST body for /api/generate."""
    markdown: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Markdown text to process through the pipeline",
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Title for the generated artifact",
    )
    force_refresh: bool = Field(
        default=False,
        description="If True, skip the cache check and re-process",
    )


class SSEStageEvent(BaseModel):
    """Data payload for a stage_update SSE event."""
    stage: str
    status: str  # "started" | "completed" | "skipped"
    data: Optional[dict] = None


class SSECompleteEvent(BaseModel):
    """Data payload for the final 'complete' SSE event."""
    artifact: dict


class SSEErrorEvent(BaseModel):
    """Data payload for an 'error' SSE event."""
    message: str
