"""SSE streaming endpoint for the LangGraph pipeline (secured)."""
import json
import hashlib
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse
from tenacity import RetryError

from note_taker.api.schemas import GenerateRequest, SSEStageEvent, SSEErrorEvent
from note_taker.api.auth import get_current_user, AuthenticatedUser
from note_taker.api.persistence import save_artifact_to_supabase
from note_taker.api.supabase_client import get_supabase_client
from note_taker.pipeline.graph import build_graph

logger = logging.getLogger(__name__)

router = APIRouter()

# Map LangGraph node names to user-friendly stage labels
NODE_TO_STAGE = {
    "check_database_node": "check",
    "outline_draft_node": "outline_draft",
    "qa_draft_node": "qa_draft",
    "judge_node": "judge",
    "revise_node": "revise",
    "save_to_db_node": "save",
}


def _serialize_node_output(node_name: str, output: dict) -> dict | None:
    """Extract serializable summary data from a node's state update."""
    if output is None:
        return {}
    if node_name == "check_database_node":
        return {"skip_processing": output.get("skip_processing", False)}
    if node_name == "outline_draft_node":
        outline = output.get("outline")
        if outline and hasattr(outline, "outline"):
            return {"item_count": len(outline.outline)}
        return {}
    if node_name in ("qa_draft_node", "judge_node", "revise_node"):
        artifact = output.get("artifact")
        if artifact and hasattr(artifact, "qa_pairs"):
            failing = sum(
                1 for qa in artifact.qa_pairs
                if qa.judge_score is None or qa.judge_score < 0.7
            )
            return {
                "qa_count": len(artifact.qa_pairs),
                "failing_count": failing,
                "revision_count": output.get("revision_count", 0),
            }
        return {}
    return {}


def _artifact_to_dict(artifact) -> dict:
    """Serialize a FinalArtifactV1 to a JSON-safe dict."""
    return json.loads(artifact.model_dump_json())


async def _generate_events(
    request: GenerateRequest,
    user: AuthenticatedUser,
) -> AsyncGenerator[dict, None]:
    """Run the pipeline and yield SSE events for each node completion."""
    chunk_id = hashlib.sha256(
        f"{request.title}:{request.markdown[:200]}".encode()
    ).hexdigest()[:16]

    initial_state = {
        "chunk_id": chunk_id,
        "source_content": request.markdown,
        "source_hash": "",
        "force_refresh": request.force_refresh,
        "artifact": None,
        "outline": None,
        "skip_processing": False,
        "revision_count": 0,
        "persist_locally": False,  # API route persists to Supabase instead
    }

    try:
        graph = build_graph()
        last_artifact = None

        for node_output in graph.stream(initial_state):
            # LangGraph stream yields {node_name: {state_updates}}
            for node_name, output in node_output.items():
                stage = NODE_TO_STAGE.get(node_name, node_name)

                if output is None:
                    output = {}

                # Track the latest artifact
                if "artifact" in output and output["artifact"] is not None:
                    last_artifact = output["artifact"]

                # Check if processing was skipped (cache hit)
                if node_name == "check_database_node" and output.get("skip_processing"):
                    if last_artifact is None and "artifact" in output:
                        last_artifact = output["artifact"]

                    yield {
                        "event": "stage_update",
                        "data": SSEStageEvent(
                            stage=stage,
                            status="skipped",
                            data={"reason": "cached"},
                        ).model_dump_json(),
                    }

                    # Fallthrough to completion if we have an artifact
                    break

                # Normal stage completion
                summary = _serialize_node_output(node_name, output)
                yield {
                    "event": "stage_update",
                    "data": SSEStageEvent(
                        stage=stage,
                        status="completed",
                        data=summary,
                    ).model_dump_json(),
                }
        
        # After pipeline, save to Supabase
        if last_artifact:
            yield {
                "event": "stage_update",
                "data": SSEStageEvent(
                    stage="saving_to_supabase",
                    status="started",
                    data=None,
                ).model_dump_json(),
            }

            supabase = get_supabase_client()
            artifact_id = save_artifact_to_supabase(
                client=supabase,
                user_id=user.id,
                title=request.title,
                artifact=last_artifact,
            )

            yield {
                "event": "stage_update",
                "data": SSEStageEvent(
                    stage="saving_to_supabase",
                    status="completed",
                    data={"artifact_id": artifact_id},
                ).model_dump_json(),
            }

            yield {
                "event": "complete",
                "data": json.dumps({
                    "artifact": _artifact_to_dict(last_artifact),
                    "artifact_id": artifact_id,
                }),
            }
        else:
            yield {
                "event": "error",
                "data": SSEErrorEvent(message="Pipeline completed without producing an artifact.").model_dump_json(),
            }

    except RetryError as e:
        logger.exception("Pipeline rate limited after retries")
        yield {
            "event": "error",
            "data": SSEErrorEvent(
                message="Rate limited by LLM provider. Please try again in a minute."
            ).model_dump_json(),
        }
    except Exception as e:
        logger.exception("Pipeline error")
        yield {
            "event": "error",
            "data": SSEErrorEvent(message=f"Pipeline failed: {str(e)}").model_dump_json(),
        }


@router.post("/api/generate")
async def generate(
    request: GenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Stream pipeline progress as Server-Sent Events (authenticated)."""
    return EventSourceResponse(_generate_events(request, user))
