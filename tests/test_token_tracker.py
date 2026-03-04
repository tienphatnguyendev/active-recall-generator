import time
import pytest
from unittest.mock import MagicMock, patch
from note_taker.llm import TokenTracker, invoke_outlines_with_backoff

def test_token_tracker_adds_usage():
    tracker = TokenTracker()
    tracker.set_limit("test", 1000)
    tracker.add_usage("test", 500)
    assert tracker.get_current_usage("test") == 500
    tracker.add_usage("test", 300)
    assert tracker.get_current_usage("test") == 800

def test_token_tracker_cleans_old_usage():
    tracker = TokenTracker()
    tracker.set_limit("test", 1000)
    with patch('time.time') as mock_time:
        mock_time.return_value = 1000.0
        tracker.add_usage("test", 500)
        
        mock_time.return_value = 1030.0
        tracker.add_usage("test", 300)
        assert tracker.get_current_usage("test") == 800
        
        mock_time.return_value = 1061.0
        # The first 500 should be gone
        assert tracker.get_current_usage("test") == 300
        
        mock_time.return_value = 1091.0
        # Everything should be gone
        assert tracker.get_current_usage("test") == 0

@patch('time.sleep')
@patch('time.time')
def test_token_tracker_wait_if_needed(mock_time, mock_sleep):
    tracker = TokenTracker()
    tracker.set_limit("test", 1000)
    mock_time.return_value = 1000.0
    
    tracker.add_usage("test", 800)
    
    def sleep_side_effect(seconds):
        mock_time.return_value += seconds

    mock_sleep.side_effect = sleep_side_effect
    
    tracker.wait_if_needed("test", 300)
    
    assert mock_sleep.called
    assert tracker.get_current_usage("test") == 0

@patch('note_taker.llm.openai.OpenAI')
@patch('note_taker.llm.outlines.from_openai')
def test_invoke_outlines_with_backoff_tracks_usage(mock_from_openai, mock_openai, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "test_key")
    monkeypatch.setenv("CEREBRAS_API_KEYS", "test_key")
    
    with patch('note_taker.llm.tracker') as mock_tracker:
        mock_model = MagicMock()
        mock_from_openai.return_value = mock_model
        mock_model.return_value = "{}"
        
        from pydantic import BaseModel
        class Dummy(BaseModel): pass

        # Reset tier indices and circuit breaker
        from note_taker.llm import _factory, circuit_breaker
        _factory.reset()
        circuit_breaker.failures.clear()

        invoke_outlines_with_backoff("input", Dummy, token_estimate=500, tier="fast")
        
        mock_tracker.wait_if_needed.assert_called_with("cerebras:llama3.1-8b", 500)
        mock_tracker.add_usage.assert_called_with("cerebras:llama3.1-8b", 500)
