# Design Document: DB Schema + Resume Logic (SOLO-38)

## Overview
Implement a persistent storage layer using SQLite and `sqlite-utils` to store processed active recall artifacts. This layer will support "resume logic" by hashing source content to prevent redundant LLM processing.

## 🏗️ Database Schema
The database will reside at `.note-taker.db` in the project root (configured via env or default). This file will be ignored by git.

### Table: `processed_content`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique identifier: `Book:Chapter:Section` |
| `source_hash` | TEXT | NOT NULL | SHA-256 hash of the Markdown source chunk |
| `artifact_json` | TEXT | NOT NULL | JSON string of `FinalArtifactV1` |
| `last_updated` | DATETIME | DEFAULT CURRENT_TIMESTAMP | For tracking updates |

### 0. Runtime Validation (Fail Fast)
Before any processing begins, the `DatabaseManager` must:
- Check if the database file exists at the configured path (e.g., `.note-taker.db`).
- If it doesn't exist, verify write permissions to create it.
- If it exists, attempt a lightweight query to ensure it isn't corrupted.
- **Strict Failure**: If any check fails (Permission Denied, Corrupted DB, Read-Only FS), the tool must exit immediately with a descriptive error message.

### 1. Retention & Retrieval
The `DatabaseManager` will be implemented as a **Singleton** to maintain a single, consistent connection to the database. It will provide:
- `get_artifact(id: str) -> Optional[FinalArtifactV1]`
- `save_artifact(id: str, artifact: FinalArtifactV1)`
- `check_hash(id: str, source_hash: str) -> bool` (Returns True if processing can be skipped)

### 2. Hash Calculation
- Use `hashlib.sha256` on the raw Markdown text of the chunk.
- The hash should be calculated *after* chunking but *before* LLM processing.

### 3. Resume Logic Implementation
In the main processing loop:
1.  Chunk the Markdown file.
2.  For each chunk:
    - Generate `id` (e.g., `DeepLearning:Chapter3:Section2`).
    - Calculate `source_hash`.
    - Query DB: `SELECT source_hash FROM processed_content WHERE id = ?`.
    - If `result == current_hash` AND NOT `force_refresh`: **Skip**.
    - Else: **Process** -> **Automatically Overwrite** (Upsert) into DB with the new hash and artifact.

## 🛠️ Implementation Details
- **Library**: `sqlite-utils` for its clean API and automatic schema management/migrations.
- **Pydantic Integration**: Models from `src/note_taker/models.py` will be serialized to/from JSON strings for storage.

## ✅ Verification Plan
- **Unit Tests**:
    - Creation of the database and table.
    - CRUD operations for `FinalArtifactV1`.
    - Correct hash comparison (skip vs. update).
- **Integration Tests**:
    - End-to-end flow with a mock processor.
