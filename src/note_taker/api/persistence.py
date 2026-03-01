"""Save pipeline artifacts to Supabase."""
import json
import logging
from typing import Any

from supabase import Client
from note_taker.models import FinalArtifactV1

logger = logging.getLogger(__name__)


def save_artifact_to_supabase(
    client: Client,
    user_id: str,
    title: str,
    artifact: FinalArtifactV1,
) -> str:
    """Insert a FinalArtifactV1 into Supabase as an artifact + cards.

    Args:
        client: Supabase admin client (service role).
        user_id: The authenticated user's UUID.
        title: Title for the artifact.
        artifact: The pipeline-generated artifact.

    Returns:
        The UUID of the newly created artifact row.

    Raises:
        Exception: If the Supabase insert fails.
    """
    # 1) Insert artifact
    outline_json = [item.model_dump() for item in artifact.outline]
    artifact_row = {
        "user_id": user_id,
        "title": title,
        "source_hash": artifact.source_hash,
        "outline": outline_json,
    }

    artifact_response = (
        client.table("artifacts").insert(artifact_row).execute()
    )
    artifact_id = artifact_response.data[0]["id"]
    logger.info(f"Created artifact {artifact_id} for user {user_id}")

    # 2) Insert cards
    card_rows = [
        {
            "artifact_id": artifact_id,
            "question": qa.question,
            "answer": qa.answer,
            "source_context": qa.source_context,
            "judge_score": qa.judge_score,
            "judge_feedback": qa.judge_feedback,
        }
        for qa in artifact.qa_pairs
    ]

    if card_rows:
        client.table("cards").insert(card_rows).execute()
        logger.info(f"Created {len(card_rows)} cards for artifact {artifact_id}")

    return artifact_id
