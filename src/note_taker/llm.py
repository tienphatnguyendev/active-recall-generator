"""Groq LLM client for the note-taker pipeline."""
import os
from langchain_groq import ChatGroq

def get_llm() -> ChatGroq:
    """Return a configured ChatGroq instance.
    
    Uses the GROQ_API_KEY environment variable for authentication.
    """
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
    )