#!/usr/bin/env python3
"""
Minimal AI Provider Health Check Script.

Verifies connectivity and model availability for every provider/model
pair configured in note_taker.llm.TIER_CONFIGS.

Usage (locally):
    python scripts/health_check.py

Usage (on Render shell):
    cd /opt/render/project/src && python scripts/health_check.py

The script forces a deterministic "Pong" response to rule out
hallucination or logic errors. Any model that returns a response
containing "Pong" is considered healthy.
"""

import os
import sys
import time

# ---------------------------------------------------------------------------
# Provider → model registry  (mirrors TIER_CONFIGS in note_taker/llm.py)
# ---------------------------------------------------------------------------
PROVIDERS = [
    # --- fast tier ---
    {
        "tier": "fast",
        "provider": "cerebras",
        "model": "llama3.1-8b",
        "env_key": "CEREBRAS_API_KEYS",
        "fallback_env": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1",
    },
    {
        "tier": "fast",
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
        "env_key": "GROQ_API_KEYS",
        "fallback_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
    },
    {
        "tier": "fast",
        "provider": "sambanova",
        "model": "Meta-Llama-3.1-8B-Instruct",
        "env_key": "SAMBANOVA_API_KEYS",
        "fallback_env": "SAMBANOVA_API_KEY",
        "base_url": "https://api.sambanova.ai/v1",
    },
    # --- reasoning tier ---
    {
        "tier": "reasoning",
        "provider": "cerebras",
        "model": "llama3.1-8b",  # Updated: llama3.1-70b was retired
        "env_key": "CEREBRAS_API_KEYS",
        "fallback_env": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1",
    },
    {
        "tier": "reasoning",
        "provider": "groq",
        "model": "llama-3.3-70b-versatile",
        "env_key": "GROQ_API_KEYS",
        "fallback_env": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
    },
    {
        "tier": "reasoning",
        "provider": "sambanova",
        "model": "Meta-Llama-3.1-70B-Instruct",
        "env_key": "SAMBANOVA_API_KEYS",
        "fallback_env": "SAMBANOVA_API_KEY",
        "base_url": "https://api.sambanova.ai/v1",
    },
]

# Deterministic prompt — model MUST return the word "Pong"
SYSTEM_PROMPT = "You are a connectivity test bot. Respond with EXACTLY the single word: Pong"
USER_PROMPT = "Ping"


def get_first_key(entry: dict) -> str | None:
    """Return the first API key from comma-separated env var."""
    keys_str = os.environ.get(entry["env_key"], "")
    if keys_str:
        return keys_str.split(",")[0].strip()
    return os.environ.get(entry.get("fallback_env", ""), "").strip() or None


def check_provider(entry: dict) -> dict:
    """
    Send a single chat-completion request via the raw OpenAI-compatible API.
    Uses only the `openai` SDK to avoid LangChain overhead.
    Returns a result dict with status, latency, and response text.
    """
    try:
        from openai import OpenAI
    except ImportError:
        return {
            **entry,
            "status": "ERROR",
            "detail": "openai SDK not installed (pip install openai)",
            "latency_ms": 0,
        }

    api_key = get_first_key(entry)
    if not api_key:
        return {
            **entry,
            "status": "SKIP",
            "detail": f"No API key found in ${entry['env_key']}",
            "latency_ms": 0,
        }

    client = OpenAI(api_key=api_key, base_url=entry["base_url"])

    t0 = time.perf_counter()
    try:
        resp = client.chat.completions.create(
            model=entry["model"],
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT},
            ],
            max_tokens=10,
            temperature=0,
        )
        latency = (time.perf_counter() - t0) * 1000
        text = resp.choices[0].message.content.strip()
        ok = "pong" in text.lower()
        return {
            **entry,
            "status": "OK" if ok else "WARN",
            "detail": text,
            "latency_ms": round(latency, 1),
        }
    except Exception as exc:
        latency = (time.perf_counter() - t0) * 1000
        return {
            **entry,
            "status": "FAIL",
            "detail": str(exc)[:200],
            "latency_ms": round(latency, 1),
        }


def main():
    # Load .env file if present (for local development)
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv not required on Render; env vars are injected

    print("=" * 72)
    print("  AI Provider Health Check")
    print("=" * 72)

    results = []
    for entry in PROVIDERS:
        tag = f"[{entry['tier']:>9}] {entry['provider']:>10} / {entry['model']}"
        print(f"\n  Testing {tag} …", end="", flush=True)
        result = check_provider(entry)
        results.append(result)
        emoji = {"OK": "✅", "WARN": "⚠️", "FAIL": "❌", "SKIP": "⏭️", "ERROR": "🛑"}
        print(f"  {emoji.get(result['status'], '?')}  {result['status']}  "
              f"({result['latency_ms']}ms)  {result['detail'][:80]}")

    # Summary
    print("\n" + "=" * 72)
    ok_count = sum(1 for r in results if r["status"] == "OK")
    fail_count = sum(1 for r in results if r["status"] == "FAIL")
    skip_count = sum(1 for r in results if r["status"] in ("SKIP", "ERROR"))
    print(f"  Summary: {ok_count} OK · {fail_count} FAIL · {skip_count} SKIP")
    print("=" * 72)

    sys.exit(1 if fail_count > 0 else 0)


if __name__ == "__main__":
    main()
