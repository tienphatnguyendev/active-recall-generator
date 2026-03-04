"""Multi-provider LLM factory with tiered routing and Outlines integration."""

import logging
import os
import time
import json
import re
from collections import deque
from typing import Dict, List, Optional, Tuple, Any

import openai
import outlines
from pydantic import BaseModel

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
        {
            "provider": "cerebras",
            "model": "llama3.1-8b",
            "env_key": "CEREBRAS_API_KEYS",
            "fallback_env": "CEREBRAS_API_KEY",
            "tpm": 12_000,
        },
        {
            "provider": "groq",
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 30_000,
            "supports_json_schema": False,
        },
        {
            "provider": "groq",
            "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 30_000,
            "supports_json_schema": False,
        },
    ],
    "reasoning": [
        {
            "provider": "cerebras",
            "model": "gpt-oss-120b",
            "env_key": "CEREBRAS_API_KEYS",
            "fallback_env": "CEREBRAS_API_KEY",
            "tpm": 12_000,
            "supports_json_schema": False,
        },
        {
            "provider": "groq",
            "model": "openai/gpt-oss-20b",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 12_000,
            "supports_json_schema": True,
        },
        {
            "provider": "groq",
            "model": "llama-3.3-70b-versatile",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 12_000,
            "supports_json_schema": False,
        },
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
        logger.debug(
            f"Added {tokens} tokens to tracker. Current total in window: {self.get_current_usage()}"
        )

    def get_current_usage(self) -> int:
        """Returns the total tokens used in the last 60 seconds."""
        self._clean_old()
        return sum(tokens for _, tokens in self.usage)

    def wait_if_needed(
        self, estimated_next_tokens: int, max_limit: Optional[int] = None
    ):
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


class ProviderCircuitBreaker:
    """Tracks provider failures and temporarily disables unhealthy providers."""

    def __init__(self, failure_threshold: int = 2, reset_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.failures: Dict[str, int] = {}
        self.last_failure_time: Dict[str, float] = {}

    def record_failure(self, provider_id: str):
        """Record a failure for a provider."""
        self.failures[provider_id] = self.failures.get(provider_id, 0) + 1
        self.last_failure_time[provider_id] = time.time()
        logger.warning(
            f"Circuit breaker recorded failure for {provider_id} "
            f"({self.failures[provider_id]}/{self.failure_threshold})"
        )

    def record_success(self, provider_id: str):
        """Reset the failure count on a successful call."""
        if provider_id in self.failures and self.failures[provider_id] > 0:
            logger.info(f"Circuit breaker reset for {provider_id}")
        self.failures[provider_id] = 0

    def is_allowed(self, provider_id: str) -> bool:
        """Check if a provider is allowed to be used."""
        num_failures = self.failures.get(provider_id, 0)
        if num_failures < self.failure_threshold:
            return True
            
        last_failure = self.last_failure_time.get(provider_id, 0.0)
        if time.time() - last_failure > self.reset_timeout:
            # Half-open state: allow a retry to see if it recovered
            return True
            
        return False


# Global circuit breaker instance
circuit_breaker = ProviderCircuitBreaker()



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

    def get_outlines_model(self, tier: str = "reasoning") -> Any:
        """Returns an outlines model initialized with the proper client and config."""
        configs = TIER_CONFIGS[tier]
        idx = self._tier_indices[tier]

        # Try providers in priority order, starting from current index
        for offset in range(len(configs)):
            config = configs[(idx + offset) % len(configs)]
            keys = self._get_keys(config)
            if keys:
                api_key = self._next_key(config["env_key"], keys)
                self._tier_indices[tier] = (idx + 1) % len(configs)

                provider = config["provider"]
                model_name = config["model"]

                if provider == "groq":
                    try:
                        client = openai.OpenAI(
                            base_url="https://api.groq.com/openai/v1", api_key=api_key
                        )
                        model = outlines.from_openai(client, model_name)
                        logger.info(
                            f"[LLM Factory] tier={tier} → "
                            f"{config['provider']}:{config['model']} via outlines"
                        )
                        return model, config
                    except Exception as e:
                        logger.warning(
                            f"[LLM Factory] Skipping {config['provider']} due to error: {e}"
                        )
                        continue
                elif provider == "cerebras":
                    try:
                        client = openai.OpenAI(
                            base_url="https://api.cerebras.ai/v1", api_key=api_key
                        )
                        model = outlines.from_openai(client, model_name)
                        logger.info(
                            f"[LLM Factory] tier={tier} → "
                            f"{config['provider']}:{config['model']} via outlines"
                        )
                        return model, config
                    except Exception as e:
                        logger.warning(
                            f"[LLM Factory] Skipping {config['provider']} due to error: {e}"
                        )
                        continue

        raise RuntimeError(
            f"No usable providers or API keys configured for tier '{tier}'"
        )


_factory = TieredLLMFactory()

# --- Permanent vs. Transient Error Classification ---
_PERMANENT_ERROR_TYPES = (NotFoundError, AuthenticationError)


def _is_permanent_error(exc: Exception) -> bool:
    if isinstance(exc, _PERMANENT_ERROR_TYPES):
        return True
    msg = str(exc).lower()
    return any(
        tag in msg for tag in ("model_not_found", "does not exist", "invalid api key")
    )


def _invoke_single_outlines(
    model, prompt: str, schema: BaseModel, config: dict, token_estimate: int = 500
):
    tracker.wait_if_needed(token_estimate)

    supports_json_schema = config.get("supports_json_schema", True)

    if supports_json_schema:
        # outlines does not inherently return token usage for OpenAI in standard calls
        # We rely on the estimator for throttling
        result = model(prompt, output_type=schema)
        tracker.add_usage(token_estimate)  # Best effort tracking
        if isinstance(result, str):
            return schema.model_validate_json(result)
        return result
    else:
        # For models that don't support JSON Schema natively (like llama-3.3-70b-versatile on Groq)
        # We pass the schema in the prompt and ask it to respond with JSON.
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        modified_prompt = prompt + f"\n\nYou must output ONLY valid JSON matching this schema:\n```json\n{schema_json}\n```\nDo not include any other text."
        
        # We don't pass output_type=schema to outlines, which drops the json_schema response format
        result = model(modified_prompt)
        tracker.add_usage(token_estimate)

        if isinstance(result, str):
            # Clean markdown formatting if present
            clean_str = result.strip()
            if clean_str.startswith("```json"):
                clean_str = clean_str[7:]
            elif clean_str.startswith("```"):
                clean_str = clean_str[3:]
            if clean_str.endswith("```"):
                clean_str = clean_str[:-3]
            clean_str = clean_str.strip()
            return schema.model_validate_json(clean_str)
        return result


def invoke_outlines_with_backoff(
    prompt: str,
    schema: type[BaseModel],
    token_estimate: int = 500,
    tier: str = "reasoning",
):
    """Invoke an Outlines model with fast-fail provider-level fallback using a circuit breaker."""
    last_exc: Exception | None = None
    tried_providers: list[str] = []

    configs = TIER_CONFIGS.get(tier, [])
    if not configs:
        raise RuntimeError(f"No configurations found for tier '{tier}'")
        
    # Attempt to call all configs sequentially (fast failover)
    for offset in range(len(configs)):
        idx = (_factory._tier_indices[tier] + offset) % len(configs)
        config = configs[idx]
        
        provider_id = f"{config['provider']}:{config['model']}"
        if provider_id in tried_providers:
            continue
            
        if not circuit_breaker.is_allowed(provider_id):
            logger.warning(f"Skipping {provider_id} (circuit breaker open)")
            continue

        keys = _factory._get_keys(config)
        if not keys:
            continue
            
        try:
            api_key = _factory._next_key(config["env_key"], keys)
            base_url = "https://api.groq.com/openai/v1" if config["provider"] == "groq" else "https://api.cerebras.ai/v1"
            
            client = openai.OpenAI(base_url=base_url, api_key=api_key, timeout=10.0)
            model = outlines.from_openai(client, config["model"])
            
            tried_providers.append(provider_id)
            logger.info(f"[LLM Factory] Try {offset+1} tier={tier} → {provider_id}")
            
            result = _invoke_single_outlines(
                model, prompt, schema, config, token_estimate=token_estimate
            )
            
            circuit_breaker.record_success(provider_id)
            # Advance index on success to round-robin
            _factory._tier_indices[tier] = (idx + 1) % len(configs)
            return result
            
        except Exception as exc:
            last_exc = exc
            if _is_permanent_error(exc):
                logger.warning(f"Permanent error from {provider_id}: {exc}")
                # We do not mark circuit breaker for permanent credentials/not-found issues 
                # to not mask configuration errors, but we do skip it for this round
            else:
                logger.warning(f"Error from {provider_id}: {exc}")
                circuit_breaker.record_failure(provider_id)

    raise RuntimeError(
        f"All providers exhausted for tier '{tier}'. "
        f"Tried: {tried_providers}. Last error: {last_exc}"
    ) from last_exc
