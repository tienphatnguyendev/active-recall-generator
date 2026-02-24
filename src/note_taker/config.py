import os

# Default database path (relative to the project root where the CLI is run)
DB_PATH = os.environ.get("NOTE_TAKER_DB_PATH", ".note-taker.db")