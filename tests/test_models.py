from note_taker.models import QuestionAnswerPair, OutlineItem, FinalArtifactV1
from note_taker.models import DraftResponse, JudgeVerdict, QAJudgement, RevisionResponse, OutlineResponse, QADraftResponse
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


# --- LLM Response Model Tests ---

def test_draft_response_valid():
    dr = DraftResponse(
        outline=[OutlineItem(title="T", level=1)],
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="C")]
    )
    assert len(dr.outline) == 1
    assert len(dr.qa_pairs) == 1

def test_judge_verdict_valid():
    j = QAJudgement(
        question_index=0,
        accuracy_score=0.9,
        clarity_score=0.8,
        recall_worthiness_score=0.85,
        overall_score=0.85,
        feedback="Good question."
    )
    jv = JudgeVerdict(judgements=[j])
    assert jv.judgements[0].overall_score == 0.85

def test_qa_judgement_score_bounds():
    with pytest.raises(ValidationError):
        QAJudgement(
            question_index=0,
            accuracy_score=1.5,  # Out of bounds
            clarity_score=0.8,
            recall_worthiness_score=0.85,
            overall_score=0.85,
            feedback="Bad."
        )

def test_revision_response_valid():
    rr = RevisionResponse(
        revised_pairs=[QuestionAnswerPair(question="Q2", answer="A2", source_context="C")]
    )
    assert len(rr.revised_pairs) == 1

def test_outline_response_valid():
    r = OutlineResponse(outline=[OutlineItem(title="T", level=1)])
    assert len(r.outline) == 1

def test_qa_draft_response_valid():
    r = QADraftResponse(qa_pairs=[
        QuestionAnswerPair(question="Q", answer="A", source_context="C")
    ])
    assert len(r.qa_pairs) == 1


