from typing import List, Optional
from pydantic import BaseModel, Field

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

class OutlineResponse(BaseModel):
    """LLM response from the outline draft node."""
    outline: List[OutlineItem]

class QADraftResponse(BaseModel):
    """LLM response from the QA draft node."""
    qa_pairs: List[QuestionAnswerPair]

class JudgeVerdict(BaseModel):
    """LLM response from the judge node."""
    judgements: List[QAJudgement]

class RevisionResponse(BaseModel):
    """LLM response from the revise node."""
    revised_pairs: List[QuestionAnswerPair]