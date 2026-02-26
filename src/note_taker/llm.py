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

import time
from collections import deque
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class TokenTracker:
    """Tracks token usage over a rolling 60-second window to prevent 429 errors."""
    
    def __init__(self, default_limit: int = 6000):
        self.default_limit = default_limit
        self.usage: deque[Tuple[float, int]] = deque()  # List of (timestamp, tokens)

    def _clean_old(self):
        """Remove usage older than 60 seconds."""
        now = time.time()
        while self.usage and self.usage[0][0] < now - 60:
            self.usage.popleft()

    def add_usage(self, tokens: int):
        """Record token usage at the current timestamp."""
        self.usage.append((time.time(), tokens))
        logger.debug(f"Added {tokens} tokens to tracker. Current total in window: {self.get_current_usage()}")

    def get_current_usage(self) -> int:
        """Returns the total tokens used in the last 60 seconds."""
        self._clean_old()
        return sum(tokens for _, tokens in self.usage)

    def wait_if_needed(self, estimated_next_tokens: int, max_limit: Optional[int] = None):
        """Wait if adding the next request would exceed the token limit."""
        limit = max_limit or self.default_limit
        
        while True:
            self._clean_old()
            current_usage = self.get_current_usage()
            
            if current_usage + estimated_next_tokens <= limit:
                break
                
            # Need to wait. Calculate how long until the oldest request in the window expires.
            # Even if we wait just for the first one to expire, we might still be over the limit,
            # so we loop until we have enough space.
            if not self.usage:
                # This should theoretically not happen if current_usage > 0
                break
                
            oldest_ts, _ = self.usage[0]
            wait_time = max(0.1, (oldest_ts + 60.1) - time.time())
            
            logger.info(
                f"Throttling to prevent 429: Sleeping for {wait_time:.2f} seconds "
                f"(Token usage: {current_usage}/{limit}, next estimate: {estimated_next_tokens})..."
            )
            time.sleep(wait_time)

# Global tracker instance
tracker = TokenTracker()

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
def invoke_with_backoff(runnable, *args, token_estimate: int = 500, **kwargs):
    """Invoke a LangChain runnable with exponential backoff and proactive pacing.

    Retries up to 5 times on ``groq.RateLimitError`` (HTTP 429).
    Also checks the ``TokenTracker`` to proactively sleep if close to the 
    TPM limit (6,000 for llama-3.3-70b-versatile).

    Args:
        runnable: Any object with an ``.invoke(*args, **kwargs)`` method.
        *args: Positional arguments forwarded to ``runnable.invoke``.
        token_estimate: Optional estimate of tokens this request will use.
            Used for proactive throttling. Default 500.
        **kwargs: Keyword arguments forwarded to ``runnable.invoke``.

    Returns:
        The result of ``runnable.invoke(*args, **kwargs)``.
    """
    # Proactively wait if we're approaching the rate limit
    tracker.wait_if_needed(token_estimate)
    
    response = runnable.invoke(*args, **kwargs)
    
    # Track actual usage if available in metadata
    try:
        if hasattr(response, 'response_metadata'):
            usage = response.response_metadata.get('token_usage', {})
            total_tokens = usage.get('total_tokens')
            if isinstance(total_tokens, int):
                tracker.add_usage(total_tokens)
    except Exception as e:
        logger.warning(f"Failed to track token usage: {e}")

    return response