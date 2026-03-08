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
    answer: str = Field(description="The extracted literal answer to the question")

class EvaluationResult(BaseModel):
    is_match: bool = Field(description="Whether the predicted answer semantically matches the true answer")
    reasoning: str = Field(description="Explanation for the judgement")

def extract_answer(context: str, question: str, client: Groq) -> CausalityExtraction:
    prompt = f"""
    You are an expert Financial Analyst.
    Read the following financial text and answer the question.
    Extract the literal answer from the context that responds to the question.
    
    Context: {context}
    Question: {question}
    
    Respond STRICTLY in the following JSON format:
    {{
        "answer": "exact phrase from the context that answers the question"
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

def evaluate_similarity(predicted_answer: str, true_answer: str, client: Groq) -> EvaluationResult:
    prompt = f"""
    Evaluate if the predicted answer semantically matches the ground truth.
    
    Ground Truth Answer: {true_answer}
    Predicted Answer: {predicted_answer}
    
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
    
    csv_path = "data/fincausal_2026/training_2026/train_en_2000.csv"
    print(f"Loading FinCausal 2026 dataset from {csv_path}...")
    try:
        df = pd.read_csv(csv_path, sep=';', quoting=1) # Handle potential quoting issues
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return
        
    if 'context' not in df.columns or 'question' not in df.columns or 'answer' not in df.columns:
        print("Error: Expected columns 'context', 'question', 'answer' not found in dataset.")
        return
        
    df = df.head(num_samples)
    results = []
    
    print(f"Running benchmark on {len(df)} samples...")
    for idx, row in df.iterrows():
        context = str(row.get('context', ''))
        question = str(row.get('question', ''))
        true_answer = str(row.get('answer', ''))
        
        try:
            extraction = extract_answer(context, question, client)
            eval_result = evaluate_similarity(
                extraction.answer,
                true_answer, 
                client
            )
            
            results.append({
                "context": context,
                "question": question,
                "true_answer": true_answer,
                "predicted_answer": extraction.answer,
                "is_match": eval_result.is_match,
                "reasoning": eval_result.reasoning
            })
            print(f"Sample {idx+1}/{len(df)}: {'✅ Match' if eval_result.is_match else '❌ No Match'}")
            time.sleep(1) # Simple rate limiting
        except Exception as e:
            print(f"Error on sample {idx}: {e}")
            
    results_df = pd.DataFrame(results)
    
    os.makedirs("outputs/benchmarks", exist_ok=True)
    out_path = "outputs/benchmarks/fincare_results_2026.csv"
    results_df.to_csv(out_path, index=False)
    
    accuracy = results_df['is_match'].mean() if len(results_df) > 0 else 0
    print(f"\nBenchmark Complete! Accuracy: {accuracy:.2%}")
    print(f"Results saved to {out_path}")

if __name__ == "__main__":
    run_benchmark(5)
