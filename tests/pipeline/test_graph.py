import pytest
from unittest.mock import patch
from note_taker.pipeline.graph import build_graph, should_continue_brief, should_continue_qa

def test_should_continue_brief_passes():
    """If brief_judgement.overall_score >= 0.8, route to qa_draft."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.9, density_score=0.9, leverage_score=0.9,
            anti_summary_score=0.9, connections_score=0.9,
            overall_score=0.9, feedback="Excellent.",
        ),
        "brief_revision_count": 0,
    }
    assert should_continue_brief(state) == "qa_draft"

def test_should_continue_brief_fails_under_limit():
    """If brief score < 0.8 and under revision limit, route to revise_brief."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.5, density_score=0.5, leverage_score=0.5,
            anti_summary_score=0.5, connections_score=0.5,
            overall_score=0.5, feedback="Too vague.",
        ),
        "brief_revision_count": 1,
    }
    assert should_continue_brief(state) == "revise_brief"

def test_should_continue_brief_hits_limit():
    """If brief revision limit reached, force qa_draft anyway."""
    from note_taker.models import BriefJudgement
    state = {
        "brief_judgement": BriefJudgement(
            specificity_score=0.5, density_score=0.5, leverage_score=0.5,
            anti_summary_score=0.5, connections_score=0.5,
            overall_score=0.5, feedback="Still vague.",
        ),
        "brief_revision_count": 3,
    }
    assert should_continue_brief(state) == "qa_draft"

def test_should_continue_qa_all_passing():
    """If all QA scores >= 0.8, route to save_to_db_node."""
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="h", mastery_brief=brief,
            qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S", judge_score=0.9)],
        ),
        "qa_revision_count": 0,
    }
    assert should_continue_qa(state) == "save_to_db_node"

def test_should_continue_qa_needs_revision():
    from note_taker.models import FinalArtifactV2, MasteryBrief, CoreIdea, QuestionAnswerPair
    brief = MasteryBrief(
        core_ideas=[CoreIdea(idea="X", why_it_matters="Y", mechanism="Z")],
        non_negotiable_details=[], connections=[], common_traps=[], five_min_review=[],
    )
    state = {
        "artifact": FinalArtifactV2(
            source_hash="h", mastery_brief=brief,
            qa_pairs=[QuestionAnswerPair(question="Q", answer="A", source_context="S", judge_score=0.5)],
        ),
        "qa_revision_count": 1,
    }
    assert should_continue_qa(state) == "revise_qa"

def test_build_graph_v2_compiles():
    """V2 build_graph should return a compiled graph with invoke."""
    graph = build_graph()
    assert hasattr(graph, "invoke")