import os
import time
import json
import pandas as pd
from typing import Optional
from pydantic import BaseModel, Field
from datasets import load_dataset
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class CausalityExtraction(BaseModel):
    cause: str = Field(description="Phrase identifying the cause")
    effect: str = Field(description="Phrase identifying the effect")
    logic: str = Field(description="One sentence explaining the causal link")

class EvaluationResult(BaseModel):
    is_match: bool = Field(description="Whether the predicted cause and effect semantically match the true cause and effect")
    reasoning: str = Field(description="Explanation for the judgement")

def extract_causality(text: str, client: Groq) -> CausalityExtraction:
    prompt = f"""
    Analyze the following financial text for causality. 
    Identify the PRIMARY CAUSE and the PRIMARY EFFECT.
    
    Text: {text}
    """
    
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "system", "content": "You are an expert Financial Analyst."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        top_p=1.0,
        response_format={"type": "json_object"},
        seed=42,
        extra_body={"reasoning_effort": "high"}
    )
    
    content = completion.choices[0].message.content
    return CausalityExtraction.model_validate_json(content)

def evaluate_similarity(predicted_cause: str, predicted_effect: str, true_cause: str, true_effect: str, client: Groq) -> EvaluationResult:
    prompt = f"""
    Evaluate if the predicted cause and effect semantically match the ground truth.
    
    Ground Truth Cause: {true_cause}
    Ground Truth Effect: {true_effect}
    
    Predicted Cause: {predicted_cause}
    Predicted Effect: {predicted_effect}
    
    Do they mean the same thing in a financial context?
    """
    
    completion = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "You are a strict evaluation judge. Output ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.0,
        response_format={"type": "json_object"},
        seed=42
    )
    
    content = completion.choices[0].message.content
    return EvaluationResult.model_validate_json(content)
