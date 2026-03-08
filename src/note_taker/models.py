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

class LLMOutlineItem(BaseModel):
    title: str
    level: int

class OutlineResponse(BaseModel):
    """LLM response from the outline draft node."""
    outline: List[LLMOutlineItem]
    
    @model_validator(mode="before")
    @classmethod
    def parse_str_to_list(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "outline")

# --- LLM Response Models (structured output from Groq) ---

class QAJudgement(BaseModel):
    """Judge's evaluation of a single Q&A pair."""
    question_index: int
    accuracy_score: float = Field(ge=0.0, le=1.0)
    clarity_score: float = Field(ge=0.0, le=1.0)
    recall_worthiness_score: float = Field(ge=0.0, le=1.0)
    overall_score: float = Field(ge=0.0, le=1.0)
    feedback: str

class LLMQuestionAnswerPair(BaseModel):
    question: str
    answer: str
    source_context: str

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

# --- V2 Models: Mastery Brief Pipeline ---

class CoreIdea(BaseModel):
    """A single high-leverage concept from the chapter."""
    idea: str                   # The concept, stated precisely
    why_it_matters: str         # Why this idea is foundational/reusable/testable
    mechanism: str              # How it works — the core logic, not just the label

class MasteryBrief(BaseModel):
    """The ultra-condensed 80/20 mastery brief for a chapter."""
    core_ideas: List[CoreIdea]
    non_negotiable_details: List[str]
    connections: List[str]
    common_traps: List[str]
    five_min_review: List[str]

class BriefJudgement(BaseModel):
    """Judge's evaluation of the mastery brief."""
    specificity_score: float = Field(ge=0.0, le=1.0)
    density_score: float = Field(ge=0.0, le=1.0)
    leverage_score: float = Field(ge=0.0, le=1.0)
    anti_summary_score: float = Field(ge=0.0, le=1.0)
    connections_score: float = Field(ge=0.0, le=1.0)
    overall_score: float = Field(ge=0.0, le=1.0)
    feedback: str

class BriefRevisionResponse(BaseModel):
    """LLM response from the brief revision node."""
    revised_brief: MasteryBrief

    @model_validator(mode="before")
    @classmethod
    def parse_str_to_obj(cls, data: Any) -> Any:
        return _parse_embedded_json(data, "revised_brief")

class FinalArtifactV2(BaseModel):
    """The root container \u2014 brief-first, no outline exposed."""
    version: int = 2
    source_hash: str
    mastery_brief: MasteryBrief
    qa_pairs: List[QuestionAnswerPair]