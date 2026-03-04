import json
from pathlib import Path

def generate_bar_chart():
    results_path = Path(__file__).parent / "benchmark_results.json"
    if not results_path.exists():
        print(f"Error: {results_path} not found. Run benchmark_pipeline.py first.")
        return

    with open(results_path, "r") as f:
        data = json.load(f)

    print()
    print("=== Benchmark Analysis ===")
    
    # Exclude TOTAL for the bar chart
    nodes = [n for n in data.keys() if n != "TOTAL"]
    
    if not nodes:
        print("No node data found.")
        return

    max_avg = max(data[n]["avg"] for n in nodes)
    
    if max_avg == 0:
        print("All stages took 0 seconds.")
        return

    print(f"{'Stage':<22} | {'Time (avg)':<10} | {'Chart (max = ' + f'{max_avg:.3f}s':<30}")
    print("-" * 70)
    
    for node in nodes:
        avg = data[node]["avg"]
        bar_len = int((avg / max_avg) * 30) if max_avg > 0 else 0
        bar = "█" * bar_len
        skipped = " (skipped)" if data[node].get("skipped") else ""
        print(f"{node:<22} | {avg:9.3f}s | {bar}{skipped}")

if __name__ == "__main__":
    generate_bar_chart()