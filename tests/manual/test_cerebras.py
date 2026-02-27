import os
import time
from dotenv import load_dotenv
from langchain_cerebras import ChatCerebras

# Load environment variables
load_dotenv()

# Get API keys (comma-separated)
keys_str = os.getenv("CEREBRAS_API_KEYS")
if not keys_str:
    # Fallback to single key
    keys_str = os.getenv("CEREBRAS_API_KEY")

if not keys_str:
    print("Error: CEREBRAS_API_KEYS or CEREBRAS_API_KEY not found in .env")
    exit(1)

first_key = keys_str.split(",")[0]

# Models to test
models = [
    "llama3.1-8b",
    "gpt-oss-120b",
    "qwen-3-235b-a22b-instruct-2507",
    "zai-glm-4.7",
]

def run_profile(model_name):
    print(f"\n" + "="*50)
    print(f"PROFILING CEREBRAS: {model_name}")
    print("="*50)
    
    try:
        llm = ChatCerebras(
            api_key=first_key,
            model=model_name,
            # Cerebras specifically benefits from setting max_completion_tokens
            # to prevent the token bucket algorithm from over-estimating usage
            max_completion_tokens=150,
        )
        
        prompt = "Explain the importance of low-latency AI inference in 2 sentences."
        
        start_time = time.time()
        ttft = None
        full_response = ""
        
        # Using stream to capture TTFT
        print("Streaming response...", flush=True)
        for chunk in llm.stream(prompt):
            if ttft is None:
                ttft = time.time() - start_time
            full_response += chunk.content
            # Optional: print dots for progress
            print(".", end="", flush=True)
            
        total_time = time.time() - start_time
        print("\n")
        
        # Calculate tokens
        # LangChain usually provides usage_metadata in the last chunk
        # or we can do a rough estimate (words * 1.3)
        tokens = len(full_response.split()) * 1.3
        
        print(f"Response: {full_response.strip()[:150]}...")
        print("-" * 30)
        print(f"TTFT:       {ttft:.3f} s")
        print(f"Total Time: {total_time:.3f} s")
        print(f"Tokens (~): {tokens:.1f}")
        print(f"TPS (~):    {tokens/total_time:.1f} t/s")
        
    except Exception as e:
        print(f"\nFAILED for {model_name}: {e}")

if __name__ == "__main__":
    print("Starting Cerebras Performance Profiling")
    for model in models:
        run_profile(model)
    print("\nProfiling Complete.")
