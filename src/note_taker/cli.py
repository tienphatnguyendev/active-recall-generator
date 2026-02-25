"""Typer CLI entrypoint for the note-taker pipeline (SOLO-39)."""
import hashlib
from pathlib import Path
from typing import Optional

import typer
from rich import print as rprint

from note_taker.processing import parse_markdown_chunks
from note_taker.database import DatabaseManager

app = typer.Typer(
    name="note-taker",
    help="Transform Markdown chapters into active recall artifacts.",
)


def _hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@app.command()
def process(
    book_chapter: str = typer.Argument(
        ...,
        help='Book and chapter identifier, e.g. "BuildingAIAgents:Chapter1"',
    ),
    file_path: Path = typer.Argument(
        ...,
        help="Path to the Markdown file to process.",
        exists=False,  # we do manual validation for better error messages
    ),
    force_refresh: bool = typer.Option(
        False, "--force-refresh", help="Re-process all chunks even if unchanged."
    ),
) -> None:
    """Read a Markdown chapter, chunk it, and run the processing pipeline."""

    # --- Validate input file ---
    if not file_path.exists():
        rprint(f"[red]Error: File not found — {file_path}[/red]")
        raise typer.Exit(code=1)

    rprint(f"[bold]note-taker[/bold]  Processing [cyan]{file_path.name}[/cyan]")
    rprint(f"  Identifier : [yellow]{book_chapter}[/yellow]")

    # --- Chunk the file ---
    chunks = parse_markdown_chunks(str(file_path))
    rprint(f"  Chunks found: [green]{len(chunks)}[/green]")

    if not chunks:
        rprint("[yellow]No chunks found. Nothing to do.[/yellow]")
        raise typer.Exit(code=0)

    # --- Process each chunk ---
    db = DatabaseManager()
    db.ensure_database()

    skipped = 0
    processed = 0

    for idx, chunk in enumerate(chunks):
        chunk_id = f"{book_chapter}:{idx:03d}"
        source_hash = _hash(chunk["content"])

        if not force_refresh and db.check_hash(chunk_id, source_hash):
            skipped += 1
            rprint(f"  [dim]⏭  {chunk_id} — unchanged, skipping[/dim]")
            continue

        # TODO(SOLO-40): pass to LangGraph pipeline here.
        # For now, just log that this chunk needs processing.
        processed += 1
        rprint(f"  [blue]🔄 {chunk_id}[/blue] — [bold]{chunk['title']}[/bold]")

    # --- Summary ---
    rprint()
    rprint(
        f"[green]Done.[/green]  "
        f"Processed: [bold]{processed}[/bold]  |  "
        f"Skipped: [bold]{skipped}[/bold]  |  "
        f"Total: [bold]{len(chunks)}[/bold]"
    )