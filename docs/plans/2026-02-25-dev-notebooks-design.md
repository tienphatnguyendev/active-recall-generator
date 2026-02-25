# Development Notebooks Design

## Goal

Create two Jupyter Notebook **templates** (skeleton only, no implementation code) that serve as a development sandbox for iterating on the LangGraph pipeline. The notebooks use the `%load` bridge pattern — source `.py` files remain the single source of truth, and the notebook loads and runs them step-by-step with state inspection between nodes.

## Key Decisions

- **Templates only** — empty code cells with markdown descriptions, no implementation.
- **Real Groq API calls** — notebooks will hit the live LLM for real output.
- **Separate dev database** — isolated from production SQLite.
- **Two notebooks (Approach B)** — separate files for single-chunk debug and full pipeline run.
- **Input** — one full Markdown chapter file.

## Notebook 1: `notebooks/01_single_chunk_debug.ipynb`

Step-by-step execution of one chunk through each pipeline node.

| Cell | Purpose | Linear Issue |
|---|---|---|
| Setup | Imports, dev DB path, `%load_ext autoreload` | — |
| Load Chapter File | Read Markdown file from disk | SOLO-39 |
| Chunk the Chapter | Split by header boundaries | SOLO-39 |
| Pick a Single Chunk | Select one chunk by index | — |
| Node: `check_database` | `%load` node, run, inspect `GraphState` | SOLO-38 |
| Node: `draft` | `%load` draft node, inspect outline + Q&A | SOLO-41 |
| Node: `judge` | `%load` judge node, inspect scores | SOLO-41 |
| Node: `revise` | `%load` revise node, inspect revised Q&A | SOLO-41 |
| Save to Dev DB | Write final artifact to dev SQLite | SOLO-38 |

## Notebook 2: `notebooks/02_full_pipeline_run.ipynb`

End-to-end execution across all chunks in a chapter.

| Cell | Purpose | Linear Issue |
|---|---|---|
| Setup | Imports, dev DB path, `%load_ext autoreload` | — |
| Load + Chunk Chapter | Read file and split into chunks | SOLO-39 |
| Run Full LangGraph | `%load` graph, invoke on all chunks | SOLO-40 |
| Post-Processing Dedup | Scan for near-identical questions | SOLO-42 |
| Inspect Results | Query dev DB, display summary stats | — |

## Out of Scope

- SOLO-43 (Success Criteria Tests) — lives in `tests/`, not notebooks.
- SOLO-44 (Observability) — lives in source code, not notebooks.
