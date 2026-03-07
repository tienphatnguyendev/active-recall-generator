"""Save pipeline artifacts to Supabase."""
import json
import logging
from typing import Any

from supabase import Client
from note_taker.models import FinalArtifactV2

logger = logging.getLogger(__name__)


def save_artifact_to_supabase(
    client: Client,
    user_id: str,
    title: str,
    artifact: FinalArtifactV2,
) -> str:
    """Insert a FinalArtifactV2 into Supabase as an artifact + cards.

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
    # 0) Self-healing: Ensure user profile exists in public.users
    try:
        user_response = client.table("users").select("id").eq("id", user_id).execute()
        if not user_response.data:
            logger.info(f"Self-healing: Creating missing profile for user {user_id}")
            client.table("users").insert({"id": user_id}).execute()
    except Exception as e:
        logger.warning(f"Self-healing user profile failed: {e}")

    # 1) Insert artifact
    mastery_brief_json = artifact.mastery_brief.model_dump()
    artifact_row = {
        "user_id": user_id,
        "title": title,
        "source_hash": artifact.source_hash,
        "mastery_brief": mastery_brief_json,
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
