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

@patch("note_taker.llm._invoke_single_outlines")
@patch("note_taker.llm.openai.OpenAI")
@patch("note_taker.llm.outlines.from_openai")
def test_invoke_outlines_with_backoff_rotates_providers_on_failure(mock_from_openai, mock_openai, mock_invoke):
    """invoke_outlines_with_backoff should rotate providers on failure."""
    from pydantic import BaseModel
    class Dummy(BaseModel): pass

    expected_result = MagicMock()
    # Fail first time, succeed second time
    mock_invoke.side_effect = [
        _make_rate_limit_error(),
        expected_result,
    ]
    
    # Reset tier indices and circuit breaker
    from note_taker.llm import _factory, circuit_breaker
    _factory.reset()
    circuit_breaker.failures.clear()
    
    result = invoke_outlines_with_backoff("prompt", Dummy, token_estimate=100, tier="fast")
    
    assert result is expected_result
    assert mock_invoke.call_count == 2
    
@patch("note_taker.llm._invoke_single_outlines")
@patch("note_taker.llm.openai.OpenAI")
@patch("note_taker.llm.outlines.from_openai")
def test_invoke_outlines_with_backoff_raises_after_all_fail(mock_from_openai, mock_openai, mock_invoke):
    """invoke_outlines_with_backoff should raise after all providers fail."""
    from pydantic import BaseModel
    class Dummy(BaseModel): pass

    mock_invoke.side_effect = _make_rate_limit_error()
    
    from note_taker.llm import _factory, circuit_breaker
    _factory.reset()
    circuit_breaker.failures.clear()

    with pytest.raises(RuntimeError, match="All providers exhausted"):
        invoke_outlines_with_backoff("prompt", Dummy, token_estimate=100, tier="fast")

@patch("note_taker.llm._invoke_single_outlines")
@patch("note_taker.llm.openai.OpenAI")
@patch("note_taker.llm.outlines.from_openai")
def test_invoke_outlines_with_backoff_handles_timeout(mock_from_openai, mock_openai, mock_invoke):
    """invoke_outlines_with_backoff should rotate providers when APITimeoutError occurs."""
    from pydantic import BaseModel
    from openai import APITimeoutError
    
    class Dummy(BaseModel): pass

    mock_request = MagicMock()
    timeout_error = APITimeoutError(request=mock_request)
    expected_result = MagicMock()
    
    # Fail first time with timeout, succeed second time
    mock_invoke.side_effect = [
        timeout_error,
        expected_result,
    ]
    
    from note_taker.llm import _factory, circuit_breaker
    _factory.reset()
    circuit_breaker.failures.clear()
    
    result = invoke_outlines_with_backoff("prompt", Dummy, token_estimate=100, tier="fast")
    
    assert result is expected_result
    assert mock_invoke.call_count == 2
