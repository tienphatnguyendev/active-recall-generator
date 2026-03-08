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
