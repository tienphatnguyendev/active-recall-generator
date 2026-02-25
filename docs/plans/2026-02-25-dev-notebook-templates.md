# Development Notebook Templates — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create two Jupyter Notebook template files (skeleton only, no implementation code) for iterating on the LangGraph pipeline using the `%load` bridge pattern.

**Architecture:** Two `.ipynb` files in `notebooks/` — one for single-chunk debugging, one for full pipeline runs. Each cell has a markdown description and an empty code cell placeholder. No implementation code.

**Tech Stack:** Jupyter Notebook (`.ipynb` JSON format)

---

### Task 1: Create `notebooks/` directory and `.gitignore` entry for dev DB

**Files:**
- Create: `notebooks/.gitkeep`
- Modify: `.gitignore` (add dev database pattern)

**Step 1: Create the notebooks directory**

```bash
mkdir -p notebooks
```

**Step 2: Add dev database to .gitignore**

Append `*.dev.db` to `.gitignore` so the dev SQLite database is never committed.

**Step 3: Commit**

```bash
git add notebooks/.gitkeep .gitignore
git commit -m "chore: add notebooks directory and ignore dev databases (SOLO-58)"
```

---

### Task 2: Create `notebooks/01_single_chunk_debug.ipynb`

**Files:**
- Create: `notebooks/01_single_chunk_debug.ipynb`

**Step 1: Create the notebook template**

Create a valid `.ipynb` JSON file with the following cell structure (all code cells are empty):

| # | Type | Content |
|---|---|---|
| 1 | Markdown | `# Single Chunk Debug Notebook` + purpose description |
| 2 | Markdown | `## Setup` — imports, dev DB path, autoreload |
| 3 | Code | _(empty — placeholder for setup)_ |
| 4 | Markdown | `## Load Chapter File` — read markdown from disk (SOLO-39) |
| 5 | Code | _(empty)_ |
| 6 | Markdown | `## Chunk the Chapter` — split by header boundaries (SOLO-39) |
| 7 | Code | _(empty)_ |
| 8 | Markdown | `## Pick a Single Chunk` — select one chunk by index |
| 9 | Code | _(empty)_ |
| 10 | Markdown | `## Node: check_database` — `%load` node, run, inspect GraphState (SOLO-38) |
| 11 | Code | _(empty)_ |
| 12 | Markdown | `## Node: draft` — `%load` draft node, inspect outline + Q&A (SOLO-41) |
| 13 | Code | _(empty)_ |
| 14 | Markdown | `## Node: judge` — `%load` judge node, inspect scores (SOLO-41) |
| 15 | Code | _(empty)_ |
| 16 | Markdown | `## Node: revise` — `%load` revise node, inspect revised Q&A (SOLO-41) |
| 17 | Code | _(empty)_ |
| 18 | Markdown | `## Save to Dev DB` — write final artifact to dev SQLite (SOLO-38) |
| 19 | Code | _(empty)_ |

**Step 2: Verify the notebook is valid JSON**

```bash
python -c "import json; json.load(open('notebooks/01_single_chunk_debug.ipynb')); print('VALID')"
```

Expected: `VALID`

**Step 3: Commit**

```bash
git add notebooks/01_single_chunk_debug.ipynb
git commit -m "feat: add single-chunk debug notebook template (SOLO-58)"
```

---

### Task 3: Create `notebooks/02_full_pipeline_run.ipynb`

**Files:**
- Create: `notebooks/02_full_pipeline_run.ipynb`

**Step 1: Create the notebook template**

Create a valid `.ipynb` JSON file with the following cell structure (all code cells are empty):

| # | Type | Content |
|---|---|---|
| 1 | Markdown | `# Full Pipeline Run Notebook` + purpose description |
| 2 | Markdown | `## Setup` — imports, dev DB path, autoreload |
| 3 | Code | _(empty)_ |
| 4 | Markdown | `## Load + Chunk Chapter` — read file and split into chunks (SOLO-39) |
| 5 | Code | _(empty)_ |
| 6 | Markdown | `## Run Full LangGraph Pipeline` — `%load` graph, invoke on all chunks (SOLO-40) |
| 7 | Code | _(empty)_ |
| 8 | Markdown | `## Post-Processing Deduplication` — scan for near-identical questions (SOLO-42) |
| 9 | Code | _(empty)_ |
| 10 | Markdown | `## Inspect Results` — query dev DB, display summary stats |
| 11 | Code | _(empty)_ |

**Step 2: Verify the notebook is valid JSON**

```bash
python -c "import json; json.load(open('notebooks/02_full_pipeline_run.ipynb')); print('VALID')"
```

Expected: `VALID`

**Step 3: Commit**

```bash
git add notebooks/02_full_pipeline_run.ipynb
git commit -m "feat: add full pipeline run notebook template (SOLO-58)"
```

---

## Verification Plan

### Automated Checks

1. Both `.ipynb` files parse as valid JSON:
   ```bash
   python -c "import json; json.load(open('notebooks/01_single_chunk_debug.ipynb')); json.load(open('notebooks/02_full_pipeline_run.ipynb')); print('BOTH VALID')"
   ```

2. Existing tests still pass (no regressions):
   ```bash
   python -m pytest --tb=short -q
   ```

3. All code cells are empty (template only — no implementation leaked in):
   ```bash
   python -c "
   import json
   for nb in ['notebooks/01_single_chunk_debug.ipynb', 'notebooks/02_full_pipeline_run.ipynb']:
       data = json.load(open(nb))
       for cell in data['cells']:
           if cell['cell_type'] == 'code':
               assert cell['source'] == [] or cell['source'] == [''], f'Non-empty code cell found in {nb}'
   print('ALL CODE CELLS EMPTY')
   "
   ```

### Manual Verification
- Open both notebooks in Jupyter/VS Code and confirm they render with proper markdown headings and empty code cells.
