"""Groq LLM client for the note-taker pipeline."""
import logging
import os

from groq import RateLimitError
from langchain_groq import ChatGroq
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

logger = logging.getLogger(__name__)

_current_key_index = 0

def get_llm(model_name: str = "llama-3.3-70b-versatile") -> ChatGroq:
    """Return a configured ChatGroq instance.
    
    Uses the GROQ_API_KEYS or GROQ_API_KEY environment variable for authentication,
    rotating keys if multiple are provided.
    """
    global _current_key_index
    keys_str = os.environ.get("GROQ_API_KEYS", "")
    if keys_str:
        keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    else:
        # Fallback to single key
        single_key = os.environ.get("GROQ_API_KEY")
        keys = [single_key] if single_key else []
        
    if not keys:
        logger.warning("No Groq API keys found in environment. Set GROQ_API_KEYS or GROQ_API_KEY.")

    selected_key = None
    if keys:
        selected_key = keys[_current_key_index % len(keys)]
        _current_key_index += 1

    kwargs = {
        "model": model_name,
        "temperature": 0,
    }
    if selected_key:
        kwargs["api_key"] = selected_key

    return ChatGroq(**kwargs)


@retry(
    retry=retry_if_exception_type(RateLimitError),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def invoke_with_backoff(runnable, *args, **kwargs):
    """Invoke a LangChain runnable with exponential backoff on Groq rate limits.

    Retries up to 5 times on ``groq.RateLimitError`` (HTTP 429) using an
    exponential back-off strategy (4 s → 8 s → 16 s → 32 s → 60 s).

    Args:
        runnable: Any object with an ``.invoke(*args, **kwargs)`` method.
        *args: Positional arguments forwarded to ``runnable.invoke``.
        **kwargs: Keyword arguments forwarded to ``runnable.invoke``.

    Returns:
        The result of ``runnable.invoke(*args, **kwargs)``.

    Raises:
        groq.RateLimitError: Re-raised after all retries are exhausted.
    """
    return runnable.invoke(*args, **kwargs)