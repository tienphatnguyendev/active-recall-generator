"""Multi-provider LLM factory with tiered routing."""
import logging
import os
import time
from collections import deque
from typing import Dict, List, Optional, Tuple

from langchain_core.language_models import BaseChatModel
from langchain_groq import ChatGroq
from langchain_cerebras import ChatCerebras
from langchain_sambanova import ChatSambaNova
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

logger = logging.getLogger(__name__)

# --- Provider Configurations ---
TIER_CONFIGS: Dict[str, List[dict]] = {
    "fast": [
        {"provider": "cerebras", "model": "llama3.1-8b",
         "env_key": "CEREBRAS_API_KEYS", "fallback_env": "CEREBRAS_API_KEY",
         "tpm": 60_000},
        {"provider": "groq", "model": "llama-3.1-8b-instant",
         "env_key": "GROQ_API_KEYS", "fallback_env": "GROQ_API_KEY",
         "tpm": 6_000},
        {"provider": "sambanova", "model": "Meta-Llama-3.1-8B-Instruct",
         "env_key": "SAMBANOVA_API_KEYS", "fallback_env": "SAMBANOVA_API_KEY",
         "tpm": None},
    ],
    "reasoning": [
        {"provider": "cerebras", "model": "gpt-oss-120b",
         "env_key": "CEREBRAS_API_KEYS", "fallback_env": "CEREBRAS_API_KEY",
         "tpm": 64_000},
        {"provider": "groq", "model": "llama-3.3-70b-versatile",
         "env_key": "GROQ_API_KEYS", "fallback_env": "GROQ_API_KEY",
         "tpm": 12_000},
        {"provider": "sambanova", "model": "DeepSeek-R1-Distill-Llama-70B",
         "env_key": "SAMBANOVA_API_KEYS", "fallback_env": "SAMBANOVA_API_KEY",
         "tpm": None},
    ],
}

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
                
            if not self.usage:
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

class TieredLLMFactory:
    """Manages provider rotation and key cycling for tiered LLM access."""

    def __init__(self):
        self._tier_indices: Dict[str, int] = {"fast": 0, "reasoning": 0}
        self._key_indices: Dict[str, int] = {}  # per env_key

    def reset(self):
        self._tier_indices = {"fast": 0, "reasoning": 0}
        self._key_indices = {}

    def _get_keys(self, config: dict) -> List[str]:
        keys_str = os.environ.get(config["env_key"], "")
        if keys_str:
            return [k.strip() for k in keys_str.split(",") if k.strip()]
        single = os.environ.get(config.get("fallback_env", ""), "")
        return [single] if single else []

    def _next_key(self, env_key: str, keys: List[str]) -> str:
        idx = self._key_indices.get(env_key, 0)
        key = keys[idx % len(keys)]
        self._key_indices[env_key] = idx + 1
        return key

    def _create_llm(self, config: dict, api_key: str) -> BaseChatModel:
        provider = config["provider"]
        model = config["model"]
        if provider == "cerebras":
            return ChatCerebras(api_key=api_key, model=model, temperature=0)
        elif provider == "groq":
            return ChatGroq(api_key=api_key, model=model, temperature=0)
        elif provider == "sambanova":
            return ChatSambaNova(
                sambanova_api_key=api_key, model=model, temperature=0
            )
        raise ValueError(f"Unknown provider: {provider}")

    def get_llm(self, tier: str = "reasoning") -> BaseChatModel:
        configs = TIER_CONFIGS[tier]
        idx = self._tier_indices[tier]

        # Try providers in priority order, starting from current index
        for offset in range(len(configs)):
            config = configs[(idx + offset) % len(configs)]
            keys = self._get_keys(config)
            if keys:
                api_key = self._next_key(config["env_key"], keys)
                self._tier_indices[tier] = (idx + 1) % len(configs)
                logger.info(
                    f"[LLM Factory] tier={tier} → "
                    f"{config['provider']}:{config['model']}"
                )
                return self._create_llm(config, api_key)

        raise RuntimeError(f"No API keys configured for tier '{tier}'")

_factory = TieredLLMFactory()

def get_llm(tier: str = "reasoning") -> BaseChatModel:
    return _factory.get_llm(tier)


@retry(
    retry=retry_if_exception_type((Exception,)),  # Broad to catch different provider errors
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def invoke_with_backoff(runnable, *args, token_estimate: int = 500, **kwargs):
    """Invoke a LangChain runnable with exponential backoff and proactive pacing.

    Retries up to 5 times on exceptions (often rate limits).
    Also checks the ``TokenTracker`` to proactively sleep if close to the 
    TPM limit (default 6000, can be adjusted based on active provider).
    """
    tracker.wait_if_needed(token_estimate)
    
    response = runnable.invoke(*args, **kwargs)
    
    try:
        if hasattr(response, 'response_metadata'):
            usage = response.response_metadata.get('token_usage', {})
            total_tokens = usage.get('total_tokens')
            if isinstance(total_tokens, int):
                tracker.add_usage(total_tokens)
    except Exception as e:
        logger.warning(f"Failed to track token usage: {e}")

    return response