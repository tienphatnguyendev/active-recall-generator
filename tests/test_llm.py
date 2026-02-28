import os
import pytest
from unittest.mock import MagicMock, patch
from groq import RateLimitError
from langchain_core.language_models import BaseChatModel

from note_taker.llm import get_llm, invoke_with_backoff, _factory

@pytest.fixture(autouse=True)
def mock_api_keys(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "test_groq_key")
    monkeypatch.setenv("CEREBRAS_API_KEYS", "test_cerebras_key")
    monkeypatch.setenv("SAMBANOVA_API_KEYS", "test_sambanova_key")

def test_get_llm_fast_returns_chat_model():
    """get_llm(tier='fast') should return a usable chat model."""
    pytest.importorskip("langchain_cerebras")
    _factory.reset()
    llm = get_llm(tier="fast")
    assert llm is not None
    assert isinstance(llm, BaseChatModel)
    assert hasattr(llm, 'invoke')

def test_get_llm_reasoning_returns_chat_model():
    """get_llm(tier='reasoning') should return a usable chat model."""
    pytest.importorskip("langchain_cerebras")
    _factory.reset()
    llm = get_llm(tier="reasoning")
    assert llm is not None
    assert isinstance(llm, BaseChatModel)
    assert hasattr(llm, 'invoke')

def test_get_llm_rotates_providers():
    """Successive calls should rotate across providers in the tier."""
    pytest.importorskip("langchain_cerebras")
    _factory.reset()
    llm1 = get_llm(tier="fast")
    llm2 = get_llm(tier="fast")
    llm3 = get_llm(tier="fast")
    # They should be different provider types
    providers = {type(llm1), type(llm2), type(llm3)}
    assert len(providers) > 1

def _make_rate_limit_error() -> RateLimitError:
    """Construct a groq RateLimitError without needing a real HTTP response."""
    mock_response = MagicMock()
    mock_response.request = MagicMock()
    mock_response.status_code = 429
    mock_response.headers = {}
    return RateLimitError(
        message="rate limit exceeded",
        response=mock_response,
        body={"error": {"message": "rate limit exceeded"}},
    )

@patch("time.sleep")
def test_invoke_with_backoff_retries_on_rate_limit(mock_sleep):
    """invoke_with_backoff should retry on failure and eventually succeed."""
    mock_runnable = MagicMock()
    expected_result = MagicMock()

    # Fail twice with a 429, then succeed.
    mock_runnable.invoke.side_effect = [
        _make_rate_limit_error(),
        _make_rate_limit_error(),
        expected_result,
    ]

    result = invoke_with_backoff(mock_runnable, ["some_input"])

    assert result is expected_result
    assert mock_runnable.invoke.call_count == 3

@patch("time.sleep")
def test_invoke_with_backoff_raises_after_max_attempts(mock_sleep):
    """invoke_with_backoff should re-raise after exhausting all retry attempts."""
    mock_runnable = MagicMock()
    mock_runnable.invoke.side_effect = _make_rate_limit_error()

    with pytest.raises(Exception):
        invoke_with_backoff(mock_runnable, ["some_input"])

