"""Multi-provider LLM factory with tiered routing and Outlines integration."""

import logging
import os
import time
import json
import json_repair
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
            "provider": "groq",
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 1_000_000,
            "supports_json_schema": True,
        },
        {
            "provider": "groq",
            "model": "openai/gpt-oss-20b",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 1_000_000,
            "supports_json_schema": False,
            "reasoning_effort": "high",
        },
        {
            "provider": "cerebras",
            "model": "llama3.1-8b",
            "env_key": "CEREBRAS_API_KEYS",
            "fallback_env": "CEREBRAS_API_KEY",
            "tpm": 12_000,
        },
    ],
    "reasoning": [
        {
            "provider": "groq",
            "model": "meta-llama/llama-4-scout-17b-16e-instruct",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 1_000_000,
            "supports_json_schema": True,
        },
        {
            "provider": "groq",
            "model": "openai/gpt-oss-20b",
            "env_key": "GROQ_API_KEYS",
            "fallback_env": "GROQ_API_KEY",
            "tpm": 1_000_000,
            "supports_json_schema": False,
            "reasoning_effort": "high",
        },
        {
            "provider": "cerebras",
            "model": "gpt-oss-120b",
            "env_key": "CEREBRAS_API_KEYS",
            "fallback_env": "CEREBRAS_API_KEY",
            "tpm": 1_000_000,
            "supports_json_schema": False,
            "reasoning_effort": "high",
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
    """Per-provider token tracker with rolling 60-second windows.
    
    Each provider (identified by provider_id) gets its own independent
    token budget based on its actual TPM limit. This prevents Cerebras
    (12k TPM) from being blocked by Groq usage and vice versa.
    """

    def __init__(self):
        # provider_id -> deque of (timestamp, tokens)
        self._usage: Dict[str, deque] = {}
        # provider_id -> TPM limit
        self._limits: Dict[str, int] = {}

    def set_limit(self, provider_id: str, tpm: int):
        """Register a provider's TPM limit."""
        self._limits[provider_id] = tpm
        if provider_id not in self._usage:
            self._usage[provider_id] = deque()

    def _clean_old(self, provider_id: str):
        """Remove usage older than 60 seconds for a specific provider."""
        usage = self._usage.get(provider_id)
        if not usage:
            return
        now = time.time()
        while usage and usage[0][0] < now - 60:
            usage.popleft()

    def add_usage(self, provider_id: str, tokens: int):
        """Record token usage for a specific provider."""
        if provider_id not in self._usage:
            self._usage[provider_id] = deque()
        self._usage[provider_id].append((time.time(), tokens))
        logger.debug(
            f"[TokenTracker] {provider_id}: +{tokens} tokens "
            f"(window total: {self.get_current_usage(provider_id)})"
        )

    def get_current_usage(self, provider_id: str) -> int:
        """Returns tokens used in the last 60 seconds for a provider."""
        self._clean_old(provider_id)
        usage = self._usage.get(provider_id)
        if not usage:
            return 0
        return sum(tokens for _, tokens in usage)

    def wait_if_needed(self, provider_id: str, estimated_next_tokens: int):
        """Wait if adding the next request would exceed the provider's TPM limit."""
        limit = self._limits.get(provider_id, 6000)
        usage = self._usage.get(provider_id)

        while True:
            self._clean_old(provider_id)
            current_usage = self.get_current_usage(provider_id)

            if current_usage + estimated_next_tokens <= limit:
                break

            if not usage:
                break

            oldest_ts, _ = usage[0]
            wait_time = max(0.1, (oldest_ts + 60.1) - time.time())

            logger.info(
                f"[TokenTracker] Throttling {provider_id}: sleeping {wait_time:.1f}s "
                f"({current_usage}/{limit} TPM, next: {estimated_next_tokens})"
            )
            time.sleep(wait_time)


# Global tracker instance (per-provider)
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


def _sanitize_json_escapes(raw: str) -> str:
    """Fix invalid JSON escape sequences produced by reasoning models (e.g. gpt-oss-20b).

    The model sometimes outputs:
    1. Literal newline/carriage-return/tab characters inside JSON string values.
    2. Bare backslashes before non-standard escape characters (e.g. ``\.``).

    Both cause standard JSON parsers (and json_repair) to fail.  This helper
    sanitizes those cases so downstream parsing can succeed.
    """
    # Step 1: Replace literal control characters with their JSON escape equivalents.
    # We do \r\n before \r to avoid double-replacing on Windows-style line endings.
    sanitized = (
        raw
        .replace('\r\n', '\\n')
        .replace('\r', '\\n')
        .replace('\n', '\\n')
        .replace('\t', '\\t')
    )
    # Step 2: Fix bare backslashes that are NOT followed by a valid JSON escape char.
    # Valid single-char escapes after \ are: " \ / b f n r t
    # Multi-char: \uXXXX  (handled by the 'u' in the set)
    sanitized = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', sanitized)
    return sanitized


def _invoke_single_outlines(
    model, prompt: str, schema: BaseModel, config: dict, token_estimate: int = 500
):
    provider_id = f"{config['provider']}:{config['model']}"
    tracker.set_limit(provider_id, config.get("tpm", 6000))
    tracker.wait_if_needed(provider_id, token_estimate)

    supports_json_schema = config.get("supports_json_schema", True)
    
    # Extract reasoning_effort if present in config
    call_params = {}
    if "reasoning_effort" in config:
        call_params["reasoning_effort"] = config["reasoning_effort"]

    # Use max_completion_tokens (not deprecated max_tokens) with the model's
    # full capacity.  Reasoning tokens count against this budget, so we need
    # the maximum (65 536) to avoid truncation of the visible JSON output.
    call_params["max_completion_tokens"] = 65536

    if supports_json_schema:
        result = model(prompt, output_type=schema, **call_params)
        tracker.add_usage(provider_id, token_estimate)
        if isinstance(result, str):
            return schema.model_validate_json(result)
        return result
    else:
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        modified_prompt = prompt + f"\n\nYou must output ONLY valid JSON matching this schema:\n```json\n{schema_json}\n```\nDo not include any other text."
        
        result = model(modified_prompt, **call_params)
        tracker.add_usage(provider_id, token_estimate)

        if isinstance(result, str):
            clean_str = result.strip()
            logger.debug(f"Raw model output (first 200 chars): {clean_str[:200]!r}")
            if clean_str.startswith("```json"):
                clean_str = clean_str[7:]
            elif clean_str.startswith("```"):
                clean_str = clean_str[3:]
            if clean_str.endswith("```"):
                clean_str = clean_str[:-3]
            clean_str = clean_str.strip()
            
            try:
                return schema.model_validate_json(clean_str)
            except Exception as e:
                # Fallback 1: sanitize invalid escape sequences (e.g. from gpt-oss-20b reasoning output)
                logger.warning(f"JSON validation failed, attempting escape sanitization. Error: {e}")
                sanitized_str = _sanitize_json_escapes(clean_str)
                try:
                    return schema.model_validate_json(sanitized_str)
                except Exception as e2:
                    # Fallback 2: attempt structural repair (trailing commas, etc.)
                    logger.warning(f"Sanitized JSON still invalid, attempting json_repair. Error: {e2}")
                    try:
                        repaired_obj = json_repair.loads(sanitized_str)
                        return schema.model_validate(repaired_obj)
                    except Exception as e3:
                        # Fallback 3: bare-value wrapping.
                        # Reasoning models sometimes exhaust their token budget on
                        # chain-of-thought and only emit the final answer (e.g. '+').
                        # Try to wrap the bare value into a minimal schema-valid dict.
                        logger.warning(
                            f"json_repair failed, attempting bare-value wrap. "
                            f"Raw output: {clean_str!r}. Error: {e3}"
                        )
                        schema_props = schema.model_json_schema().get("properties", {})
                        if len(schema_props) > 0 and len(clean_str) < 50:
                            wrapper = {}
                            for field_name, field_info in schema_props.items():
                                if "enum" in field_info or field_info.get("type") == "string":
                                    # Use bare value for the first likely-match field
                                    wrapper.setdefault(field_name, clean_str)
                                else:
                                    wrapper.setdefault(field_name, "")
                            try:
                                return schema.model_validate(wrapper)
                            except Exception:
                                pass
                        raise  # re-raise e3 if wrapping didn't work
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
