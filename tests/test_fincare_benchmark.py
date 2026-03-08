from pydantic import BaseModel
import pytest

def test_pydantic_schemas_exist():
    from scripts.fincare_benchmark import CausalityExtraction, EvaluationResult
    
    assert issubclass(CausalityExtraction, BaseModel)
    assert issubclass(EvaluationResult, BaseModel)
    assert "cause" in CausalityExtraction.model_fields
    assert "effect" in CausalityExtraction.model_fields
    assert "is_match" in EvaluationResult.model_fields
