"""Multi-provider LLM factory with tiered routing."""
import logging
import os
import time
from collections import deque
from typing import Dict, List, Optional, Tuple

from langchain_core.language_models import BaseChatModel
from langchain_groq import ChatGroq
try:
    from langchain_cerebras import ChatCerebras
except ImportError:
    # Handle known compatibility issue with latest langchain_openai in Python 3.12
    ChatCerebras = None

from langchain_sambanova import ChatSambaNova
from openai import NotFoundError, AuthenticationError
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
        # NOTE: Cerebras retired llama3.1-70b. Using llama3.1-8b as fast-path;
        # heavier reasoning falls through to Groq/SambaNova 70B models.
        {"provider": "cerebras", "model": "llama3.1-8b",
         "env_key": "CEREBRAS_API_KEYS", "fallback_env": "CEREBRAS_API_KEY",
         "tpm": 64_000},
        {"provider": "groq", "model": "llama-3.3-70b-versatile",
         "env_key": "GROQ_API_KEYS", "fallback_env": "GROQ_API_KEY",
         "tpm": 12_000},
        {"provider": "sambanova", "model": "Meta-Llama-3.1-70B-Instruct",
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
            if ChatCerebras is None:
                raise ImportError("ChatCerebras could not be imported. Please verify your langchain_cerebras installation.")
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
                try:
                    llm = self._create_llm(config, api_key)
                    logger.info(
                        f"[LLM Factory] tier={tier} → "
                        f"{config['provider']}:{config['model']}"
                    )
                    return llm
                except ImportError as e:
                    logger.warning(f"[LLM Factory] Skipping {config['provider']} due to missing dependency: {e}")
                    continue

        raise RuntimeError(f"No usable providers or API keys configured for tier '{tier}'")

_factory = TieredLLMFactory()

def get_llm(tier: str = "reasoning") -> BaseChatModel:
    return _factory.get_llm(tier)


# --- Permanent vs. Transient Error Classification ---
_PERMANENT_ERROR_TYPES = (NotFoundError, AuthenticationError)


def _is_permanent_error(exc: Exception) -> bool:
    """Return True if the error will never succeed on retry with the same provider.

    Examples: 404 model_not_found, 401 invalid API key.
    These should trigger an immediate provider fallback, not exponential backoff.
    """
    if isinstance(exc, _PERMANENT_ERROR_TYPES):
        return True
    # Some providers wrap OpenAI errors inside a generic Exception
    msg = str(exc).lower()
    return any(tag in msg for tag in ("model_not_found", "does not exist", "invalid api key"))


@retry(
    retry=retry_if_exception_type((Exception,)),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(3),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _invoke_single_provider(runnable, *args, token_estimate: int = 500, **kwargs):
    """Low-level invoke with exponential backoff for *transient* errors only."""
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


def invoke_with_backoff(runnable, *args, token_estimate: int = 500, tier: str | None = None, **kwargs):
    """Invoke a LangChain runnable with provider-level fallback.

    1. Tries the given ``runnable`` with exponential backoff (3 attempts).
    2. On *permanent* errors (model not found, auth failure) **immediately**
       falls back to the next provider in the same tier.
    3. On *transient* errors (rate limits, timeouts) retries with backoff
       before falling back.

    Parameters
    ----------
    runnable : BaseChatModel | RunnableSequence
        The LangChain runnable to invoke.
    tier : str, optional
        The tier name ("fast" or "reasoning") used to resolve fallback
        providers.  If ``None``, no provider fallback is attempted.
    """
    last_exc: Exception | None = None
    tried_providers: list[str] = []

    # First attempt with the provided runnable
    try:
        return _invoke_single_provider(runnable, *args, token_estimate=token_estimate, **kwargs)
    except Exception as exc:
        last_exc = exc
        tried_providers.append(_runnable_label(runnable))
        if not _is_permanent_error(exc):
            # Transient error already retried 3x — but we can still try other providers
            logger.warning(f"Provider {tried_providers[-1]} exhausted retries: {exc}")
        else:
            logger.warning(f"Permanent error from {tried_providers[-1]}, skipping retries: {exc}")

    # Provider-level fallback
    if tier is None:
        raise last_exc  # type: ignore[misc]

    configs = TIER_CONFIGS.get(tier, [])
    for config in configs:
        label = f"{config['provider']}:{config['model']}"
        if label in tried_providers:
            continue

        keys = _factory._get_keys(config)
        if not keys:
            logger.info(f"[Fallback] Skipping {label}: no API keys")
            continue

        api_key = _factory._next_key(config["env_key"], keys)
        try:
            fallback_llm = _factory._create_llm(config, api_key)
        except (ImportError, ValueError) as e:
            logger.warning(f"[Fallback] Cannot create {label}: {e}")
            continue

        # Re-apply structured output wrapper if the original runnable had one
        fallback_runnable = _rebuild_runnable(runnable, fallback_llm)
        tried_providers.append(label)

        logger.info(f"[Fallback] Trying {label}")
        try:
            return _invoke_single_provider(
                fallback_runnable, *args, token_estimate=token_estimate, **kwargs
            )
        except Exception as exc:
            last_exc = exc
            if _is_permanent_error(exc):
                logger.warning(f"[Fallback] Permanent error from {label}: {exc}")
            else:
                logger.warning(f"[Fallback] {label} exhausted retries: {exc}")

    raise RuntimeError(
        f"All providers exhausted for tier '{tier}'. "
        f"Tried: {tried_providers}. Last error: {last_exc}"
    ) from last_exc


def _runnable_label(runnable) -> str:
    """Best-effort label for logging."""
    if hasattr(runnable, 'model_name'):
        return str(runnable.model_name)
    if hasattr(runnable, 'bound') and hasattr(runnable.bound, 'model_name'):
        return str(runnable.bound.model_name)
    return type(runnable).__name__


def _rebuild_runnable(original, new_llm: BaseChatModel):
    """If the original runnable has structured-output binding, apply it to new_llm."""
    # LangChain wraps structured output in a RunnableSequence with .bound
    if hasattr(original, 'bound') and hasattr(original, 'kwargs'):
        schema = original.kwargs.get('schema') or original.kwargs.get('output_schema')
        if schema:
            return new_llm.with_structured_output(schema)
    # For RunnableSequence chains created by with_structured_output
    if hasattr(original, 'first') and hasattr(original, 'middle') and hasattr(original, 'last'):
        # Try to find the schema from the output parser at the end
        if hasattr(original.last, 'schema'):
            return new_llm.with_structured_output(original.last.schema)
    return new_llm