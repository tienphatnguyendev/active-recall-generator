import os
from typing import Optional
from sqlite_utils import Database
from note_taker.config import DB_PATH
from note_taker.models import FinalArtifactV1

class DatabaseManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
        return cls._instance

    def __init__(self, db_path: str = DB_PATH):
        # Prevent re-initialization if already initialized
        if hasattr(self, '_initialized') and self._initialized:
            # Re-initialize only if db_path changed (for testing)
            if self.db_path != db_path:
                self.db_path = db_path
                self.db = None
            return

        self.db_path = db_path
        self.db = None
        self._initialized = True

    def _get_db(self) -> Database:
        if self.db is None:
            self.db = Database(self.db_path)
        return self.db

    def ensure_database(self) -> None:
        """
        Verify the database file exists or can be created, and that the
        'processed_content' table is ready. Fails immediately on IO or permission errors.
        """
        try:
            # Attempt to connect/create the database file.
            # This will raise OSError/PermissionError if running in a read-only or invalid env.
            with open(self.db_path, 'a'):
                pass
            
            db = self._get_db()
            # Ensure the table exists with the correct schema
            if "processed_content" not in db.table_names():
                db["processed_content"].create({
                    "id": str,
                    "source_hash": str,
                    "artifact_json": str,
                }, pk="id")
        except Exception as e:
            raise e

    def get_artifact(self, id: str) -> Optional[FinalArtifactV1]:
        """Retrieve processed content by ID."""
        try:
            row = self._get_db()["processed_content"].get(id)
            return FinalArtifactV1.model_validate_json(row["artifact_json"])
        except Exception:
            # sqlite_utils raises NotFoundError if pk doesn't exist
            return None

    def save_artifact(self, id: str, artifact: FinalArtifactV1) -> None:
        """Upsert content when IDs or hashes change, or when Force Refresh is requested."""
        self._get_db()["processed_content"].upsert({
            "id": id,
            "source_hash": artifact.source_hash,
            "artifact_json": artifact.model_dump_json()
        }, pk="id")

    def check_hash(self, id: str, source_hash: str) -> bool:
        """Check if source content has changed by comparing to the stored hash."""
        try:
            row = self._get_db()["processed_content"].get(id)
            return row["source_hash"] == source_hash
        except Exception:
            return False