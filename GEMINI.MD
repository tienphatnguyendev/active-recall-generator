---
linear_project_id: 7dac0dba-a3b4-4d3a-8011-a87ce6ad45f5
---

## Environment Setup

This project uses `uv` for environment and dependency management.

1.  **Create the virtual environment (if it doesn't exist):**
    ```bash
    if [ ! -d ".venv" ]; then
        uv venv
    fi
    ```

2.  **Activate the virtual environment:**
    ```bash
    source .venv/bin/activate
    ```

3.  **Install dependencies:**
    The dependencies are listed in `pyproject.toml` and can be installed using `uv`:
    ```bash
    uv pip install -e .
    ```

## Project Architecture

The project is a CLI tool named "note-taker" that processes Markdown files and generates active recall artifacts (outlines and Q&A pairs).

*   **Core Logic:** The processing is orchestrated by a LangGraph state machine, which manages a "Draft -> Judge -> Revise" workflow.
*   **Data Storage:** The generated artifacts are stored in a SQLite database.
*   **Technology Stack:**
    *   **CLI:** Typer
    *   **LLM:** Groq
    *   **State Machine:** LangGraph
    *   **Database:** SQLite with `sqlite-utils`
    *   **Data Validation:** Pydantic

## Development Sandbox (Notebooks)

We use the `%load` bridge pattern for iterating on the LangGraph pipeline:
*   The `.py` files in `src/` are the **single source of truth**.
*   The `.ipynb` templates in `notebooks/` are used as a **scratchpad/debugger**.
*   **Do not** write implementation code directly into the notebooks. Use them to `%load` the core logic, run it step-by-step, and inspect the `GraphState`.

## Superpowers Workflow (Agentic Protocol)

The AI agent **MUST** follow this strict sequence of skills for all coding tasks. Deviations are forbidden.

### Core Loop

1.  **brainstorming**
    *   **Trigger**: Before writing any code. Corrects assumptions, refines requirements, and validates design.
    *   **Action**: Socratic dialogue (one question at a time).
    *   **Output**: A validated Design Document (`docs/plans/...-design.md`).
    *   **HARD GATE**: You **MUST** have a valid Linear Issue ID before proceeding.
        *   **Skill**: Use the **Linear MCP** tools via `.gemini/Skills/task-manager` to set the ticket to **In Progress** and assign it to self. **NEVER** set a Linear issue to **Done** manually — that is handled automatically by GitHub when the PR is merged.

2.  **using-git-worktrees**
    *   **Trigger**: After design approval & Linear Issue confirmation.
    *   **Action**: Create an isolated workspace on a new branch (`type/issueID-slug`).
    *   **Output**: A clean, isolated environment for the task.

3.  **writing-plans**
    *   **Trigger**: With an approved design and active worktree.
    *   **Action**: Break work into bite-sized tasks (2-5 mins execution time).
    *   **Output**: `implementation_plan.md` with exact file paths, code snippets, and verification steps.

4.  **executing-plans** OR **subagent-driven-development**
    *   **Trigger**: With a detailed plan.
    *   **Action**:
        *   **Subagent**: Dispatches fresh agents per task (Spec Compliance -> Code Quality).
        *   **Execution**: Batched execution with human checkpoints.
    *   **Methodology**: **test-driven-development** (Strict RED-GREEN-REFACTOR).
        *   Write failing test -> Watch it fail -> Write minimal code -> Watch it pass -> Refactor.

5.  **requesting-code-review**
    *   **Trigger**: Between major tasks or milestone completion.
    *   **Action**: Review implementation against the plan. Critical issues block progress.

6.  **finishing-a-development-branch**
    *   **Trigger**: When all tasks are complete, tests are green, and the branch is pushed.
    *   **Action**:
        1.  Verify all tests pass (terminal evidence required).
        2.  Push the branch to `origin`.
        3.  Present the **GitHub PR creation link** to the user and ask them to open a Pull Request.
        4.  **WAIT** — do NOT mark the Linear issue as Done. It will be automatically closed by GitHub when the PR is merged.
        5.  After the user confirms the PR is merged, clean up the local worktree with `git worktree remove`.

### Key Protocols
-   **Debugging**: Follow `systematic-debugging` (Investigate -> Analyze -> Hypothesize -> Fix).
-   **Verification Gate**: No claim of "fixed" without terminal evidence.
-   **Linear Status Rule**: Only set a Linear issue to **In Progress**. **NEVER manually set it to Done.** The GitHub ↔ Linear integration handles that automatically when a PR referencing the issue is merged.

---
