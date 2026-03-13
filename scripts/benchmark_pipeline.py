import os
import sys
import uuid
import time
import json
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from note_taker.pipeline.graph import build_graph
from note_taker.api.persistence import save_artifact_to_supabase
from note_taker.pipeline.state import GraphState
from supabase import create_client, Client
import openai

original_create = openai.resources.chat.completions.Completions.create
global_token_stats = {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0,
    "cached_tokens": 0
}

def monkeypatched_create(self, *args, **kwargs):
    print(f"\n--- API CALL to model: {kwargs.get('model')} ---")
    if 'messages' in kwargs:
        for msg in kwargs['messages']:
            role = msg.get('role')
            content = msg.get('content', '')
            print(f"[{role.upper()}] (Length: {len(content)} chars)")
            if len(content) > 200:
                print(f"{content[:100]}...\n...{content[-100:]}")
            else:
                print(content)
    print("------------------------------------------\n")
    
    response = original_create(self, *args, **kwargs)
    if hasattr(response, "usage") and response.usage:
        usage = response.usage
        global_token_stats["prompt_tokens"] += getattr(usage, "prompt_tokens", 0)
        global_token_stats["completion_tokens"] += getattr(usage, "completion_tokens", 0)
        global_token_stats["total_tokens"] += getattr(usage, "total_tokens", 0)
        
        details = getattr(usage, "prompt_tokens_details", None)
        if details:
            cached = getattr(details, "cached_tokens", 0)
            global_token_stats["cached_tokens"] += cached
    return response

openai.resources.chat.completions.Completions.create = monkeypatched_create

from rich.console import Console
from rich.table import Table

console = Console()

def run_benchmark(num_runs: int = 5):
    env_path = Path(__file__).parent.parent / ".env"
    env_local_path = Path(__file__).parent.parent / ".env.local"

    if env_path.exists():
        load_dotenv(env_path)
    if env_local_path.exists():
        load_dotenv(env_local_path)

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        console.print("[red]Missing Supabase credentials![/red]")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, supabase_key)

    file_path = Path(__file__).parent.parent / "data" / "databricks-data-engineer" / "databricks-certified-data_chapter_003.md"

    if not file_path.exists():
        console.print(f"[red]File not found: {file_path}[/red]")
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        test_text = f.read()

    graph = build_graph()
    
    # Setup user for saving
    test_email = "test_e2e_v2@example.com"
    try:
        users_resp = supabase.auth.admin.list_users()
        existing_user = next((u for u in users_resp if u.email == test_email), None)
        if existing_user:
            test_user_id = existing_user.id
        else:
            new_user = supabase.auth.admin.create_user({
                "email": test_email,
                "password": "testpassword123",
                "email_confirm": True,
            })
            test_user_id = new_user.user.id
    except Exception as e:
        console.print(f"[red]Failed to setup user: {e}[/red]")
        sys.exit(1)

    metrics = []
    output_dir = Path(__file__).parent.parent / "outputs" / "benchmarks" / "cache-configured-gpt-oss-20b"
    output_dir.mkdir(parents=True, exist_ok=True)

    for i in range(1, num_runs + 1):
        global_token_stats["prompt_tokens"] = 0
        global_token_stats["completion_tokens"] = 0
        global_token_stats["total_tokens"] = 0
        global_token_stats["cached_tokens"] = 0
        
        console.print(f"\n[bold magenta]=== Starting Run {i}/{num_runs} ===[/bold magenta]")
        
        initial_state = GraphState(
            chunk_id=f"test_bench_{i}_{uuid.uuid4()}",
            source_chunks=[{"title": "Chapter 2. Managing Data with Delta Lake", "content": test_text}],
            source_hash=f"databricks-ch3-v1-run-{i}",
            force_refresh=True,
            chunk_outlines=None,
            mastery_brief=None,
            qa_pairs=[],
            artifact=None,
            brief_judgement=None,
            qa_judgement=None,
            brief_revision_count=0,
            qa_revision_count=0,
            skip_processing=False,
            persist_locally=False,
        )

        start_time = time.time()
        
        try:
            result_state = graph.invoke(initial_state)
            end_time = time.time()
            duration = end_time - start_time
            
            artifact = result_state.get("artifact")
            judgement = result_state.get("brief_judgement")
            
            brief_score = judgement.overall_score if judgement else 0
            brief_revisions = result_state.get("brief_revision_count", 0)
            qa_revisions = result_state.get("qa_revision_count", 0)
            num_qa = len(artifact.qa_pairs) if artifact and artifact.qa_pairs else 0
            
            # Save to Supabase
            artifact_id = save_artifact_to_supabase(
                client=supabase,
                user_id=test_user_id,
                title=f"Benchmark Run {i}: Databricks Chapter 3",
                artifact=artifact,
            )
            
            # Save local file
            output_path = output_dir / f"databricks_chapter_003_output_{i}.md"

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(f"# Mastery Brief: databricks_chapter_003 (Run {i})\n\n")
                f.write("## Core Ideas\n\n")
                for idea in artifact.mastery_brief.core_ideas:
                    f.write(f"### {idea.idea}\n\n")
                    f.write(f"**Mechanism:** {idea.mechanism}\n\n")
                    f.write(f"**Trade-off:** {idea.why_it_matters}\n\n")
                f.write("## Non-Negotiable Definitions\n")
                for df in artifact.mastery_brief.non_negotiable_details:
                    f.write(f"- {df}\n")
                f.write("\n## Evaluation Framework\n")
                for ef in artifact.mastery_brief.connections:
                    f.write(f"- {ef}\n")
                f.write("## Common Traps\n")
                for trap in artifact.mastery_brief.common_traps:
                    f.write(f"- {trap}\n")
                f.write("\n## 5-Minute Review\n")
                for rv in artifact.mastery_brief.five_min_review:
                    f.write(f"- {rv}\n")
                f.write("\n---\n\n## Question & Answer Pairs\n\n")
                for qa in artifact.qa_pairs:
                    f.write(f"**Q: {qa.question}**\n")
                    f.write(f"A: {qa.answer}\n\n")
            
            run_metrics = {
                "run": i,
                "duration_seconds": round(duration, 2),
                "brief_score": round(brief_score, 3),
                "brief_revisions": brief_revisions,
                "qa_revisions": qa_revisions,
                "num_qa_pairs": num_qa,
                "prompt_tokens": global_token_stats["prompt_tokens"],
                "completion_tokens": global_token_stats["completion_tokens"],
                "total_tokens": global_token_stats["total_tokens"],
                "cached_tokens": global_token_stats["cached_tokens"],
                "status": "Success",
                "artifact_id": artifact_id
            }
            metrics.append(run_metrics)
            
            console.print(f"[green]Run {i} Success: {duration:.2f}s, Score: {brief_score:.3f}, Tokens (Total: {global_token_stats['total_tokens']}, Cached: {global_token_stats['cached_tokens']})[/green]")
            
        except Exception as e:
            import traceback
            console.print(f"[red]Run {i} Failed:\n{traceback.format_exc()}[/red]")
            metrics.append({
                "run": i,
                "duration_seconds": 0,
                "brief_score": 0,
                "brief_revisions": 0,
                "qa_revisions": 0,
                "num_qa_pairs": 0,
                "status": f"Failed: {str(e)}",
                "artifact_id": None
            })

    # Output metrics table
    console.print("\n[bold cyan]=== Benchmark Results ===[/bold cyan]")
    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Run")
    table.add_column("Status")
    table.add_column("Duration (s)")
    table.add_column("Brief Score")
    table.add_column("Brief Revs")
    table.add_column("QA Revs")
    table.add_column("QA Pairs")
    table.add_column("Total Tokens")
    table.add_column("Cached Tokens")

    total_duration = 0
    success_count = 0

    for m in metrics:
        table.add_row(
            str(m["run"]),
            m["status"],
            str(m["duration_seconds"]),
            str(m["brief_score"]),
            str(m["brief_revisions"]),
            str(m["qa_revisions"]),
            str(m["num_qa_pairs"]),
            str(m.get("total_tokens", 0)),
            str(m.get("cached_tokens", 0))
        )
        if m["status"] == "Success":
            success_count += 1
            total_duration += m["duration_seconds"]

    console.print(table)
    
    if success_count > 0:
        avg_duration = total_duration / success_count
        avg_score = sum(m["brief_score"] for m in metrics if m["status"] == "Success") / success_count
        avg_qa_revs = sum(m["qa_revisions"] for m in metrics if m["status"] == "Success") / success_count
        
        console.print(f"\n[bold]Production Grade Assessment:[/bold]")
        console.print(f"Reliability: {success_count}/{num_runs} successful runs")
        console.print(f"Average Duration: {avg_duration:.2f} seconds")
        console.print(f"Average Brief Score: {avg_score:.3f} (Threshold: 0.90)")
        console.print(f"Average QA Revisions: {avg_qa_revs:.1f} per run")
        
        # Save metrics to json
        with open(output_dir / "benchmark_metrics.json", "w") as f:
            json.dump({
                "summary": {
                    "total_runs": num_runs,
                    "successful_runs": success_count,
                    "avg_duration_seconds": round(avg_duration, 2),
                    "avg_brief_score": round(avg_score, 3),
                    "avg_qa_revisions": round(avg_qa_revs, 2)
                },
                "runs": metrics
            }, f, indent=2)

if __name__ == "__main__":
    run_benchmark(5)
