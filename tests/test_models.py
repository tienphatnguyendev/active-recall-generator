from note_taker.models import QuestionAnswerPair, OutlineItem, FinalArtifactV1
import pytest
from pydantic import ValidationError

def test_question_answer_pair_valid():
    data = {
        "question": "What is the capital of France?",
        "answer": "Paris",
        "source_context": "France is a country in Europe. Its capital is Paris.",
        "judge_score": 0.9,
        "judge_feedback": "Clear and accurate."
    }
    qa = QuestionAnswerPair(**data)
    assert qa.question == data["question"]
    assert qa.answer == data["answer"]
    assert qa.judge_score == 0.9

def test_question_answer_pair_optional_fields():
    qa = QuestionAnswerPair(
        question="Q",
        answer="A",
        source_context="C"
    )
    assert qa.judge_score is None
    assert qa.judge_feedback is None

def test_outline_item_recursion():
    child = OutlineItem(title="Subpoint", level=2, items=[])
    parent = OutlineItem(title="Main point", level=1, items=[child])
    assert len(parent.items) == 1
    assert parent.items[0].title == "Subpoint"

def test_final_artifact_v1_valid():
    qa = QuestionAnswerPair(question="Q", answer="A", source_context="C")
    outline = [OutlineItem(title="T", level=1, items=[])]
    artifact = FinalArtifactV1(
        source_hash="abc",
        outline=outline,
        qa_pairs=[qa]
    )
    assert artifact.version == 1
    assert artifact.source_hash == "abc"
    assert len(artifact.qa_pairs) == 1

def test_serialization_idempotency():
    qa = QuestionAnswerPair(question="Q", answer="A", source_context="C")
    outline = [OutlineItem(title="T", level=1, items=[])]
    artifact = FinalArtifactV1(
        source_hash="abc",
        outline=outline,
        qa_pairs=[qa]
    )
    json_data = artifact.model_dump_json()
    reconstructed = FinalArtifactV1.model_validate_json(json_data)
    assert reconstructed == artifact
