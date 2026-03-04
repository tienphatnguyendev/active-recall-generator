# Pipeline Optimization Report

## Context
Following user reports of slow pipeline performance, we built a benchmarking script to trace the execution time of the backend LangGraph pipeline without SSE/HTTP overhead. We simulated the pipeline processing a very small chunk of text (~250 words) describing the Water Cycle to measure base execution times per node.

## Findings
Based on the benchmark analysis (visualized using `analyze_benchmarks.py`), we identified the following bottlenecks:

### Node Execution Times (Averages)
- **`outline_draft_node`**: ~2.3 seconds
- **`qa_draft_node`**: ~4.0 seconds
- **`judge_node`**: ~1.5 seconds
- **Database/Save Nodes**: < 0.1 seconds

The overall pipeline for a single 250-word chunk takes roughly **7-8 seconds**. The Draft phase (`outline_draft` and `qa_draft`) accounts for **> 80% of the total execution time**.

## Root Cause Analysis
The bottleneck is inherently tied to Large Language Model (LLM) generation times:
1. **Sequential Prompts:** The pipeline drafts the outline, then sequentially drafts Q&A pairs. Each stage incurs a separate round-trip to the LLM API (Groq).
2. **Output Token Volume:** The `qa_draft_node` generates structured JSON which is verbose and incurs high time-to-first-token (TTFT) and generation latency, even on fast models like Groq's LLaMA/Mixtral endpoints.

## Proposed Optimizations

### 1. Parallelize Generation (Medium Effort)
Currently, `outline_draft_node` and `qa_draft_node` run sequentially or rely on sequential outputs. If the Q&A generation does not strictly depend on the outline generation (or if they can be unified into a single structured extraction call), we can halve the TTFT latency.
- **Action:** Refactor LangGraph to execute `outline_draft_node` and `qa_draft_node` in parallel, or combine them into a single `generate_draft_node` that returns both outline and Q&A pairs in one JSON schema.

### 2. Prompt & Schema Optimization (Low Effort)
Reduce the verbosity of the requested JSON schema.
- **Action:** Minify JSON keys, remove redundant "reasoning" fields unless absolutely necessary for the judge node, and strictly limit the number of Q&A pairs requested per small chunk.

### 3. Move to Faster Models / Smaller Models (Low Effort)
If we are using `llama3-70b` for the drafting phase, we might consider switching to `llama3-8b` for simple drafting or outlines where complex reasoning isn't as critical, preserving the larger model only for the `judge_node`.

### 4. Background Processing / Optimistic UI (High Effort)
Since LLM generation will always have a floor latency, we can improve the *perceived* performance.
- **Action:** Allow users to submit the whole chapter and navigate away. The SSE hook can be converted into a polling or WebSocket hook that runs in the background. Notify the user when the document is ready instead of requiring them to stare at the pipeline status UI.