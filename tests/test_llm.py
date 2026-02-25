import os
import pytest
from unittest.mock import MagicMock, patch
from groq import RateLimitError
from note_taker.llm import get_llm, invoke_with_backoff

@pytest.fixture(autouse=True)
def mock_groq_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test_key")

def test_get_llm_returns_chat_groq():
    """get_llm() should return a ChatGroq instance (does NOT call the API)."""
    llm = get_llm()
    assert llm is not None
    assert hasattr(llm, 'invoke')

def test_get_llm_uses_correct_model():
    llm = get_llm()
    assert llm.model_name == "llama-3.3-70b-versatile"

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
    """invoke_with_backoff should retry on RateLimitError and eventually succeed."""
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

    with pytest.raises(RateLimitError):
        invoke_with_backoff(mock_runnable, ["some_input"])
