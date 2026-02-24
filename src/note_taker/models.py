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