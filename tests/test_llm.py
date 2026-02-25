import os
import pytest
from note_taker.llm import get_llm

@pytest.fixture(autouse=True)
def mock_groq_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test_key")

def test_get_llm_returns_chat_groq():
    """get_llm() should return a ChatGroq instance (does NOT call the API)."""
    llm = get_llm()
    assert llm is not None
    assert hasattr(llm, 'invoke')

def test_get_llm_uses_correct_model():
    llm = get_llm()
    assert llm.model_name == "llama-3.3-70b-versatile"
