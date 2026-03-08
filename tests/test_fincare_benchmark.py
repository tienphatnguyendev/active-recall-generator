from pydantic import BaseModel
import pytest
from unittest.mock import MagicMock, patch

def test_pydantic_schemas_exist():
    from scripts.fincare_benchmark import CausalityExtraction, EvaluationResult
    
    assert issubclass(CausalityExtraction, BaseModel)
    assert issubclass(EvaluationResult, BaseModel)
    assert "cause" in CausalityExtraction.model_fields
    assert "effect" in CausalityExtraction.model_fields
    assert "is_match" in EvaluationResult.model_fields

@patch('scripts.fincare_benchmark.Groq')
def test_extract_causality(mock_groq):
    from scripts.fincare_benchmark import extract_causality
    
    # Setup mock
    mock_client = MagicMock()
    mock_groq.return_value = mock_client
    
    # Mock completion response
    mock_message = MagicMock()
    mock_message.content = '{"cause": "A", "effect": "B", "logic": "C"}'
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_completion
    
    result = extract_causality("dummy text", mock_client)
    assert result.cause == "A"
    assert result.effect == "B"
