import os
import time
from dotenv import load_dotenv
from langchain_sambanova import ChatSambaNova

# Load environment variables
load_dotenv()

# Get API keys (comma-separated)
keys_str = os.getenv("SAMBANOVA_API_KEYS")
if not keys_str:
    # Fallback to single key
    keys_str = os.getenv("SAMBANOVA_API_KEY")

if not keys_str:
    print("Error: SAMBANOVA_API_KEYS or SAMBANOVA_API_KEY not found in .env")
    exit(1)

first_key = keys_str.split(",")[0]

# Models to test
models = [
    "Meta-Llama-3.1-8B-Instruct",
    "Meta-Llama-3.3-70B-Instruct",
    "DeepSeek-R1-Distill-Llama-70B",
    "DeepSeek-V3.1",
    "Llama-4-Maverick-17B-128E-Instruct",
]

def run_profile(model_name):
    print(f"\n" + "="*50)
    print(f"PROFILING SAMBANOVA: {model_name}")
    print("="*50)
    
    try:
        llm = ChatSambaNova(
            sambanova_api_key=first_key,
            model=model_name,
            max_tokens=150,
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
            print(".", end="", flush=True)
            
        total_time = time.time() - start_time
        print("\n")
        
        # Calculate tokens
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
    print("Starting SambaNova Performance Profiling")
    for model in models:
        run_profile(model)
    print("\nProfiling Complete.")
