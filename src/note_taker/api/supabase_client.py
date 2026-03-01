"""Supabase admin client for server-side operations."""
import os
import logging

from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client() -> Client:
    """Get or create the Supabase admin client (service role)."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
            )
        _client = create_client(url, key)
        logger.info("Supabase admin client initialized")
    return _client


def reset_client() -> None:
    """Reset the client (for testing)."""
    global _client
    _client = None
