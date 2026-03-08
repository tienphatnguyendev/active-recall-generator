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
    
    Respond STRICTLY in the following JSON format:
    {{
        "cause": "phrase identifying the cause",
        "effect": "phrase identifying the effect",
        "logic": "one sentence explaining the causal link"
    }}
    """
    
    completion = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {"role": "system", "content": "You are an expert Financial Analyst. Output ONLY valid JSON."},
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
    
    Respond STRICTLY in the following JSON format:
    {{
        "is_match": true or false,
        "reasoning": "brief explanation for the judgement"
    }}
    """
    
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
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

def run_benchmark(num_samples: int = 10):
    client = Groq()
    
    print("Loading FinCausal dataset...")
    try:
        # FinCausal subset available on HF
        dataset = load_dataset("yya518/FinCausal-2020", split="train") 
        df = pd.DataFrame(dataset)
    except Exception as e:
        print(f"Error loading dataset from Hub: {e}. Falling back to sample data.")
        df = pd.DataFrame()
        
    if 'cause' not in df.columns:
        print("Warning: Expected 'cause' column not found. Using fallback subset for demo.")
        df = pd.DataFrame({
            "text": ["The increase in crude oil prices led to a 15% rise in transportation costs."],
            "cause": ["increase in crude oil prices"],
            "effect": ["15% rise in transportation costs"]
        })
        
    df = df.head(num_samples)
    results = []
    
    print(f"Running benchmark on {len(df)} samples...")
    for idx, row in df.iterrows():
        text = row.get('text', '')
        true_cause = row.get('cause', '')
        true_effect = row.get('effect', '')
        
        try:
            extraction = extract_causality(text, client)
            eval_result = evaluate_similarity(
                extraction.cause, extraction.effect, 
                true_cause, true_effect, 
                client
            )
            
            results.append({
                "text": text,
                "true_cause": true_cause,
                "true_effect": true_effect,
                "predicted_cause": extraction.cause,
                "predicted_effect": extraction.effect,
                "logic": extraction.logic,
                "is_match": eval_result.is_match,
                "reasoning": eval_result.reasoning
            })
            print(f"Sample {idx+1}/{len(df)}: {'✅ Match' if eval_result.is_match else '❌ No Match'}")
            time.sleep(1) # Simple rate limiting
        except Exception as e:
            print(f"Error on sample {idx}: {e}")
            
    results_df = pd.DataFrame(results)
    
    os.makedirs("outputs/benchmarks", exist_ok=True)
    out_path = "outputs/benchmarks/fincare_results.csv"
    results_df.to_csv(out_path, index=False)
    
    accuracy = results_df['is_match'].mean() if len(results_df) > 0 else 0
    print(f"\nBenchmark Complete! Accuracy: {accuracy:.2%}")
    print(f"Results saved to {out_path}")

if __name__ == "__main__":
    run_benchmark(5)
