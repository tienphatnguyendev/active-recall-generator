from note_taker.models import QAJudgement

def test_qajudgement_has_thinking_process_first():
    schema = QAJudgement.model_json_schema()
    first_prop = list(schema["properties"].keys())[0]
    assert first_prop == "thinking_process", f"Expected thinking_process first, got {first_prop}"
