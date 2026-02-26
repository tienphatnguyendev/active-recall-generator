import time
import pytest
from unittest.mock import MagicMock, patch
from note_taker.llm import TokenTracker, invoke_with_backoff

def test_token_tracker_adds_usage():
    tracker = TokenTracker(default_limit=1000)
    tracker.add_usage(500)
    assert tracker.get_current_usage() == 500
    tracker.add_usage(300)
    assert tracker.get_current_usage() == 800

def test_token_tracker_cleans_old_usage():
    tracker = TokenTracker(default_limit=1000)
    with patch('time.time') as mock_time:
        mock_time.return_value = 1000.0
        tracker.add_usage(500)
        
        mock_time.return_value = 1030.0
        tracker.add_usage(300)
        assert tracker.get_current_usage() == 800
        
        mock_time.return_value = 1061.0
        # The first 500 should be gone
        assert tracker.get_current_usage() == 300
        
        mock_time.return_value = 1091.0
        # Everything should be gone
        assert tracker.get_current_usage() == 0

@patch('time.sleep')
@patch('time.time')
def test_token_tracker_wait_if_needed(mock_time, mock_sleep):
    tracker = TokenTracker(default_limit=1000)
    mock_time.return_value = 1000.0
    
    tracker.add_usage(800)
    
    # Needs 300, only has 200 space. Should wait.
    # Oldest (800) is at 1000.0. Falls out at 1060.0.
    # wait_if_needed calculates wait as (1000.0 + 60.1) - 1000.0 = 60.1
    
    # We need to simulate time passing after sleep to avoid infinite loop in wait_if_needed
    def sleep_side_effect(seconds):
        mock_time.return_value += seconds

    mock_sleep.side_effect = sleep_side_effect
    
    tracker.wait_if_needed(300)
    
    assert mock_sleep.called
    assert tracker.get_current_usage() == 0 # because time passed

def test_invoke_with_backoff_tracks_usage():
    mock_runnable = MagicMock()
    mock_response = MagicMock()
    # Mocking LangChain response structure
    mock_response.response_metadata = {'token_usage': {'total_tokens': 123}}
    mock_runnable.invoke.return_value = mock_response
    
    with patch('note_taker.llm.tracker') as mock_tracker:
        invoke_with_backoff(mock_runnable, "input", token_estimate=500)
        
        mock_tracker.wait_if_needed.assert_called_with(500)
        mock_tracker.add_usage.assert_called_with(123)

def test_invoke_with_backoff_handles_missing_metadata():
    mock_runnable = MagicMock()
    mock_runnable.invoke.return_value = "raw string response"
    
    with patch('note_taker.llm.tracker') as mock_tracker:
        # Should not raise exception
        result = invoke_with_backoff(mock_runnable, "input")
        assert result == "raw string response"
        mock_tracker.add_usage.assert_not_called()
