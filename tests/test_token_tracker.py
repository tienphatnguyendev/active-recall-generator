import time
import pytest
from unittest.mock import MagicMock, patch
from note_taker.llm import TokenTracker, invoke_outlines_with_backoff

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
    
    def sleep_side_effect(seconds):
        mock_time.return_value += seconds

    mock_sleep.side_effect = sleep_side_effect
    
    tracker.wait_if_needed(300)
    
    assert mock_sleep.called
    assert tracker.get_current_usage() == 0

def test_invoke_outlines_with_backoff_tracks_usage():
    with patch('note_taker.llm.tracker') as mock_tracker:
        with patch('note_taker.llm._factory.get_outlines_model') as mock_factory:
            mock_model = MagicMock()
            mock_factory.return_value = (mock_model, {"provider": "groq", "model": "test"})
            mock_model.return_value = "response"
            
            from pydantic import BaseModel
            class Dummy(BaseModel): pass

            invoke_outlines_with_backoff("input", Dummy, token_estimate=500)
            
            mock_tracker.wait_if_needed.assert_called_with(500)
            mock_tracker.add_usage.assert_called_with(500)
