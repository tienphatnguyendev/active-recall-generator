from pydantic import BaseModel
import pytest
from unittest.mock import MagicMock, patch

def test_pydantic_schemas_exist():
    from scripts.fincare_benchmark import CausalityExtraction, EvaluationResult
    
    assert issubclass(CausalityExtraction, BaseModel)
    assert issubclass(EvaluationResult, BaseModel)
    assert "answer" in CausalityExtraction.model_fields
    assert "cause" not in CausalityExtraction.model_fields
    assert "effect" not in CausalityExtraction.model_fields
    assert "logic" not in CausalityExtraction.model_fields
    assert "is_match" in EvaluationResult.model_fields
