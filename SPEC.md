This updated SPEC.MD reflects our design session, pivoting from an Anki-centric tool to a streamlined, SQLite-backed content factory. It prioritizes efficiency, data integrity, and a "keep it simple" architecture.
📝 SPEC.MD - Active Recall Content Engine
Status: 🛠️ EVOLVED ARCHITECTURE (Post-Design Honing)
Goal: A CLI tool that transforms Markdown textbook chapters into high-quality active recall artifacts stored in a local SQLite database.
🏗️ Core Architecture
The Tech Stack
* Orchestrator: LangGraph (Python) for the Draft → Judge → Revise state machine.
* Database: SQLite (Single-table "Lean" approach).
* LLM: Groq (High-speed inference) using temperature=0 for determinism.
* Schema: Pydantic-validated JSON stored in a single artifacts column.
Database Schema (Table: processed_content)
| Column | Type | Description |
|---|---|---|
| id | TEXT (PK) | Unique ID based on Book:Chapter:Section. |
| source_hash | TEXT | SHA-256 of the input Markdown chunk to skip unnecessary re-runs. |
| artifact_json | TEXT (JSON) | The FinalArtifactV1 (Outline + Q&A pairs). |
| last_updated | DATETIME | Timestamp for overwrite/upsert tracking. |
🔄 The Logic Flow
1. Input & Checkpoint
* The tool splits the Markdown file into chunks using header boundaries.
* Resume Logic: It checks the source_hash. If the hash matches an entry in SQLite, it skips that chunk. If the content changed, it triggers an Overwrite/Upsert.
2. The LangGraph "Quality Loop"
* Draft: The agent generates a 2-level outline and 1 question per subpoint.
* Judge: Evaluates each question on Accuracy, Clarity, and Recall-worthiness.
* Targeted Revision: If a question fails, the Judge sends a specific "Reason for Failure" (e.g., "Too vague").
* Isolation: The agent revises only the failing questions (max 2 cycles).
3. Post-Processing (Deduplication)
* After all chunks are processed, the tool scans for near-identical questions.
* Conflict Resolution: It keeps the "best" version (highest Judge score) and discards the duplicate to prevent redundant study material.
📋 Key Decisions & Constraints
* No Global Summary: Chunks are processed using only local context to minimize token costs and latency.
* No Difficulty Scaling: The tool focuses on extraction rather than subjective labeling.
* No Review Mode: This is a backend engine; data is stored for external use or future UI integration.
* High Reliability: Uses SqliteSaver checkpointer to allow the CLI to resume if interrupted.
🚀 Execution Command
python main.py "BookName:ChapterX" chapter_file.md

✅ Success Criteria
* [ ] Successfully skips chunks where the source_hash is already present.
* [ ] Correctly overwrites existing database rows when a Markdown file is edited.
* [ ] LangGraph state machine successfully executes "Targeted Revisions" based on Judge notes.
* [ ] Final SQLite table contains clean, non-redundant JSON artifacts.

## Updated Backlog

   1. Pydantic Models: Define the data structures first.
   2. DB Schema + Resume Logic: Implement the database logic to store the data.
   3. CLI Entrypoint: Build the command-line interface to read and chunk the input files.
   4. LangGraph State Machine: Build the core processing pipeline.
   5. Groq LLM Integration: Integrate the LLM to power the pipeline nodes.
   6. Post-Processing Deduplication: Add the logic to remove duplicate questions after processing.
   7. Success Criteria Tests: Write tests to ensure everything works as expected.
   8. Observability: Add logging and tracing for debugging and monitoring.
