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

def get_llm() -> ChatGroq:
    """Return a configured ChatGroq instance.
    
    Uses the GROQ_API_KEY environment variable for authentication.
    """
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
    )


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