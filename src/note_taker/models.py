from typing import List, Optional, Any
from pydantic import BaseModel, Field, model_validator
import json
import ast

def _parse_embedded_json(data: Any, field_name: str) -> Any:
    if isinstance(data, dict):
        val = data.get(field_name)
        if isinstance(val, str):
            try:
                data[field_name] = json.loads(val)
            except json.JSONDecodeError:
                try:
                    data[field_name] = ast.literal_eval(val)
                except Exception:
                    pass
    return data

class QuestionAnswerPair(BaseModel):
    """Represents a single active recall unit."""
    question: str
    answer: str
    source_context: str
    judge_score: Optional[float] = None
    judge_feedback: Optional[str] = None

class OutlineItem(BaseModel):
    """Represents a node in the hierarchical outline."""
    title: str
    level: int
    items: List["OutlineItem"] = Field(default_factory=list)

class FinalArtifactV1(BaseModel):
    """The root container for a processed chunk."""
    version: int = 1
    source_hash: str
    outline: List[OutlineItem]
    qa_pairs: List[QuestionAnswerPair]


# --- LLM Response Models (structured output from Groq) ---

class QAJudgement(BaseModel):
    """Judge's evaluation of a single Q&A pair."""
    question_index: int
    accuracy_score: float = Field(ge=0.0, le=1.0)
    clarity_score: float = Field(ge=0.0, le=1.0)
    recall_worthiness_score: float = Field(ge=0.0, le=1.0)
    overall_score: float = Field(ge=0.0, le=1.0)
    feedback: str

class DraftResponse(BaseModel):
    """LLM response from the draft node. Keeps qa_pairs for backward compatibility."""
    outline: List[OutlineItem]
    qa_pairs: List[QuestionAnswerPair]

class LLMOutlineItem(BaseModel):
    title: str
    level: int

class LLMQuestionAnswerPair(BaseModel):
    question: str
    answer: str
    source_context: str

class OutlineResponse(BaseModel):
    """LLM response from the outline draft node."""
    outline: List[LLMOutlineItem]
    
    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "outline")

class QADraftResponse(BaseModel):
    """LLM response from the QA draft node."""
    qa_pairs: List[LLMQuestionAnswerPair]
    
    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "qa_pairs")

class JudgeVerdict(BaseModel):
    """LLM response from the judge node."""
    judgements: List[QAJudgement]
    
    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "judgements")

class RevisionResponse(BaseModel):
    """LLM response from the revise node."""
    revised_pairs: List[LLMQuestionAnswerPair]

    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "revised_pairs")