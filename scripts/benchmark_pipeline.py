import hashlib
import time
import json
import logging
import argparse
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env.local")

# Add project root to sys.path to ensure absolute imports work
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from note_taker.pipeline.graph import build_graph

# Enable logging to see provider selection & throttle waits
logging.basicConfig(
    level=logging.INFO,
    format="  %(name)s | %(message)s",
    stream=sys.stderr,
)
# Only show our logs, not noisy libraries
logging.getLogger("note_taker").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

SAMPLE_MARKDOWN = """# The Water Cycle

## Evaporation

Water from oceans, lakes, and rivers transforms into water vapor when heated by the sun.
This process moves approximately 502,800 km³ of water into the atmosphere each year.

## Condensation

As water vapor rises and cools, it condenses around tiny particles to form clouds and fog.
The dew point is the temperature at which condensation begins.

## Precipitation

Water returns to Earth's surface as rain, snow, sleet, or hail, depending on atmospheric
temperature and pressure conditions."""

def run_benchmark(runs, force_refresh, title):
    graph = build_graph()
    results = []

    expected_nodes = [
        "check_database_node",
        "outline_draft_node",
        "qa_draft_node",
        "judge_node",
        "revise_node",
        "save_to_db_node"
    ]

    for run_idx in range(runs):
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"Run {run_idx + 1}/{runs}", file=sys.stderr)
        print(f"{'='*60}", file=sys.stderr)

        chunk_id = hashlib.sha256(
            f"{title}:{SAMPLE_MARKDOWN[:200]}".encode()
        ).hexdigest()[:16]

        initial_state = {
            "chunk_id": chunk_id,
            "source_content": SAMPLE_MARKDOWN,
            "source_hash": "",
            "force_refresh": force_refresh,
            "artifact": None,
            "outline": None,
            "skip_processing": False,
            "revision_count": 0,
            "persist_locally": False,
        }

        run_times = {}
        total_time = 0.0
        
        start_overall = time.perf_counter()
        
        # Track node execution
        last_time = start_overall
        last_state = initial_state
        for node_output in graph.stream(initial_state):
            current_time = time.perf_counter()
            duration = current_time - last_time
            
            # Extract node name (LangGraph yields {node_name: state_updates})
            node_name = list(node_output.keys())[0] if node_output else "unknown"
            
            # Accumulate time for nodes that repeat (judge_node in revision loop)
            if node_name in run_times:
                run_times[node_name] += duration
            else:
                run_times[node_name] = duration
            total_time += duration
            
            # Log per-node detail
            print(f"  {node_name}: {duration:.2f}s", file=sys.stderr)

            # Log judge scores if available
            if node_name == "judge_node":
                state_update = node_output[node_name]
                artifact = state_update.get("artifact")
                if artifact:
                    for i, qa in enumerate(artifact.qa_pairs):
                        score_str = f"{qa.judge_score:.2f}" if qa.judge_score is not None else "N/A"
                        fb = f" | {qa.judge_feedback}" if qa.judge_feedback else ""
                        print(f"    [{i}] score={score_str}{fb}", file=sys.stderr)

            last_time = current_time
            
        # Also add missing expected nodes with 0.0 time if skipped
        for node in expected_nodes:
            if node not in run_times:
                run_times[node] = 0.0

        run_times["TOTAL"] = total_time
        results.append(run_times)

    # Aggregate results
    aggregated = {}
    all_node_names = set()
    for r in results:
        all_node_names.update(r.keys())
    
    # Keep standard ordering + any extra nodes
    ordered_nodes = expected_nodes + [n for n in sorted(all_node_names) if n not in expected_nodes and n != "TOTAL"] + ["TOTAL"]
    
    for node in ordered_nodes:
        if node not in all_node_names:
            continue
        times = [r.get(node, 0.0) for r in results]
        aggregated[node] = {
            "min": min(times),
            "max": max(times),
            "avg": sum(times) / len(times),
            "skipped": all(t == 0.0 for t in times) and node != "TOTAL"
        }

    # Write to file
    out_path = Path(__file__).parent / "benchmark_results.json"
    with open(out_path, "w") as f:
        json.dump(aggregated, f, indent=2)

    # Print per-run table
    print(f"\n{'='*60}")
    print("Per-Run Breakdown:")
    print(f"{'='*60}")
    for i, r in enumerate(results):
        parts = [f"{n}={r.get(n, 0):.1f}s" for n in expected_nodes if r.get(n, 0) > 0]
        print(f"  Run {i+1}: {' → '.join(parts)}  (TOTAL={r['TOTAL']:.1f}s)")

    # Print aggregate table
    print()
    print("┌" + "─"*24 + "┬" + "─"*14 + "┬" + "─"*14 + "┬" + "─"*14 + "┐")
    print("│ {:<22} │ {:>12} │ {:>12} │ {:>12} │".format("Stage", "Min (s)", "Avg (s)", "Max (s)"))
    print("├" + "─"*24 + "┼" + "─"*14 + "┼" + "─"*14 + "┼" + "─"*14 + "┤")
    
    for node in ordered_nodes:
        if node == "TOTAL":
            print("│ " + "─"*22 + " │ " + "─"*12 + " │ " + "─"*12 + " │ " + "─"*12 + " │")
            
        data = aggregated.get(node)
        if not data: continue
        
        skipped_str = "  ← skipped" if data["skipped"] else ""
        
        row_str = "│ {:<22} │ {:12.3f} │ {:12.3f} │ {:12.3f} │{}".format(
            node, data["min"], data["avg"], data["max"], skipped_str
        )
        print(row_str)
        
    print("└" + "─"*24 + "┴" + "─"*14 + "┴" + "─"*14 + "┴" + "─"*14 + "┘")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark LangGraph pipeline")
    parser.add_argument("--runs", type=int, default=1, help="Number of times to run the benchmark")
    parser.add_argument("--force-refresh", action="store_true", help="Force refresh to bypass cache")
    parser.add_argument("--title", type=str, default="Benchmark - Water Cycle", help="Title for the chunk")
    args = parser.parse_args()

    run_benchmark(args.runs, args.force_refresh, args.title)