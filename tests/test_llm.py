import os
import pytest
from unittest.mock import MagicMock, patch
from groq import RateLimitError

from note_taker.llm import invoke_outlines_with_backoff, _factory

@pytest.fixture(autouse=True)
def mock_api_keys(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "test_groq_key")
    monkeypatch.setenv("CEREBRAS_API_KEYS", "test_cerebras_key")
    monkeypatch.setenv("SAMBANOVA_API_KEYS", "test_sambanova_key")

def test_get_outlines_model_fast_returns_model():
    """get_outlines_model(tier='fast') should return an outlines model."""
    _factory.reset()
    model, config = _factory.get_outlines_model(tier="fast")
    assert model is not None
    assert config is not None

def test_get_outlines_model_reasoning_returns_model():
    """get_outlines_model(tier='reasoning') should return an outlines model."""
    _factory.reset()
    model, config = _factory.get_outlines_model(tier="reasoning")
    assert model is not None
    assert config is not None

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
@patch("note_taker.llm._factory.get_outlines_model")
def test_invoke_outlines_with_backoff_retries_on_rate_limit(mock_get_model, mock_sleep):
    """invoke_outlines_with_backoff should retry on failure and eventually succeed."""
    expected_result = MagicMock()
    mock_model = MagicMock()

    # Fail twice with a 429, then succeed.
    mock_model.side_effect = [
        _make_rate_limit_error(),
        _make_rate_limit_error(),
        expected_result,
    ]
    
    mock_get_model.return_value = (mock_model, {"provider": "groq", "model": "test"})

    from pydantic import BaseModel
    class Dummy(BaseModel): pass

    result = invoke_outlines_with_backoff("prompt", Dummy, token_estimate=100)

    assert result is expected_result
    assert mock_model.call_count == 3

@patch("time.sleep")
@patch("note_taker.llm._factory.get_outlines_model")
def test_invoke_outlines_with_backoff_raises_after_max_attempts(mock_get_model, mock_sleep):
    """invoke_outlines_with_backoff should re-raise after exhausting all retry attempts."""
    mock_model = MagicMock()
    mock_model.side_effect = _make_rate_limit_error()
    mock_get_model.return_value = (mock_model, {"provider": "groq", "model": "test"})

    from pydantic import BaseModel
    class Dummy(BaseModel): pass

    with pytest.raises(Exception):
        invoke_outlines_with_backoff("prompt", Dummy, token_estimate=100)
