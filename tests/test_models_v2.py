import pytest
from note_taker.models import CoreIdea, MasteryBrief, BriefJudgement, BriefRevisionResponse, FinalArtifactV2


def test_core_idea_creation():
    idea = CoreIdea(
        idea="Gradient descent minimizes a loss function by iteratively moving in the direction of steepest descent.",
        why_it_matters="It's the foundation of all neural network training.",
        mechanism="Compute the gradient of the loss w.r.t. parameters, then update: θ = θ - α∇L(θ).",
    )
    assert idea.idea.startswith("Gradient descent")
    assert "foundation" in idea.why_it_matters


def test_mastery_brief_creation():
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["Definition of X"],
        connections=["A causes B when C holds"],
        common_traps=["Confusing X with Y"],
        five_min_review=["X works by mechanism Z"],
    )
    assert len(brief.core_ideas) == 1
    assert len(brief.non_negotiable_details) == 1


def test_brief_judgement_scores_bounded():
    j = BriefJudgement(
        specificity_score=0.9,
        density_score=0.8,
        leverage_score=0.85,
        anti_summary_score=0.7,
        connections_score=0.75,
        overall_score=0.8,
        feedback="Good but could improve connections.",
    )
    assert 0.0 <= j.overall_score <= 1.0


def test_brief_revision_response_parsing():
    """BriefRevisionResponse should handle string-encoded JSON via _parse_embedded_json."""
    import json
    raw = {
        "revised_brief": json.dumps({
            "core_ideas": [{"idea": "A", "why_it_matters": "B", "mechanism": "C"}],
            "non_negotiable_details": ["D"],
            "connections": ["E"],
            "common_traps": ["F"],
            "five_min_review": ["G"],
        })
    }
    resp = BriefRevisionResponse.model_validate(raw)
    assert len(resp.revised_brief.core_ideas) == 1


def test_final_artifact_v2_creation():
    from note_taker.models import QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=["D"],
        connections=["C"],
        common_traps=["T"],
        five_min_review=["R"],
    )
    artifact = FinalArtifactV2(
        source_hash="abc123",
        mastery_brief=brief,
        qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S")],
    )
    assert artifact.version == 2
    assert artifact.mastery_brief.core_ideas[0].idea == "X"
